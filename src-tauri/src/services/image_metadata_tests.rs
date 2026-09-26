use std::io::Write;

use super::*;

fn encode_png(img: image::RgbaImage) -> Vec<u8> {
    let mut buf = std::io::Cursor::new(Vec::new());
    image::DynamicImage::ImageRgba8(img).write_to(&mut buf, image::ImageFormat::Png).unwrap();
    buf.into_inner()
}

/// Insert a chunk right before IEND.
fn with_chunk(png: Vec<u8>, kind: &[u8; 4], data: &[u8]) -> Vec<u8> {
    let iend = png.len() - 12;
    let mut crc = flate2::Crc::new();
    crc.update(kind);
    crc.update(data);
    let mut out = png[..iend].to_vec();
    out.extend_from_slice(&(data.len() as u32).to_be_bytes());
    out.extend_from_slice(kind);
    out.extend_from_slice(data);
    out.extend_from_slice(&crc.sum().to_be_bytes());
    out.extend_from_slice(&png[iend..]);
    out
}

fn text(key: &str, value: &str) -> Vec<u8> {
    [key.as_bytes(), &[0], value.as_bytes()].concat()
}

const COMMENT: &str = r#"{"prompt":"1girl","steps":28,"reference_image_multiple":["ENC"]}"#;

#[test]
fn reads_text_chunks() {
    let png = encode_png(image::RgbaImage::new(4, 4));
    let png = with_chunk(png, b"tEXt", &text("Source", "NovelAI Diffusion V4.5 4BDE2A90"));
    let png = with_chunk(png, b"tEXt", &text("Comment", COMMENT));
    let meta = extract(&png).unwrap();
    assert_eq!(meta.source.as_deref(), Some("NovelAI Diffusion V4.5 4BDE2A90"));
    assert_eq!(meta.comment["prompt"], "1girl");
    assert_eq!(meta.comment["reference_image_multiple"][0], "ENC");
}

#[test]
fn reads_compressed_chunks() {
    let mut z = flate2::write::ZlibEncoder::new(Vec::new(), flate2::Compression::default());
    z.write_all(COMMENT.as_bytes()).unwrap();
    let data = [b"Comment\0\0".as_slice(), &z.finish().unwrap()].concat();
    let png = with_chunk(encode_png(image::RgbaImage::new(2, 2)), b"zTXt", &data);
    assert_eq!(png_text_chunks(&png)["Comment"], COMMENT);

    let itxt = [b"Comment\0\0\0\0\0".as_slice(), COMMENT.as_bytes()].concat();
    let png = with_chunk(encode_png(image::RgbaImage::new(2, 2)), b"iTXt", &itxt);
    assert_eq!(png_text_chunks(&png)["Comment"], COMMENT);
}

fn stealth_png(comment: &str) -> image::RgbaImage {
    let json = serde_json::json!({ "Source": "NovelAI Diffusion V4.5", "Comment": comment }).to_string();
    let mut gz = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::default());
    gz.write_all(json.as_bytes()).unwrap();
    let payload = gz.finish().unwrap();
    let mut bytes = STEALTH_MAGIC.to_vec();
    bytes.extend_from_slice(&((payload.len() * 8) as u32).to_be_bytes());
    bytes.extend_from_slice(&payload);
    let (w, h) = (64u32, 64u32);
    let mut img = image::RgbaImage::from_pixel(w, h, image::Rgba([10, 20, 30, 254]));
    let bits = bytes.iter().flat_map(|b| (0..8).rev().map(move |i| (b >> i) & 1));
    for (n, bit) in bits.enumerate() {
        img.get_pixel_mut(n as u32 / h, n as u32 % h)[3] = 254 | bit; // column-major
    }
    img
}

#[test]
fn prefers_stealth_copy_when_chunks_lack_vibes() {
    let img = stealth_png(COMMENT);
    let png = with_chunk(encode_png(img), b"tEXt", &text("Comment", r#"{"prompt":"1girl"}"#));
    assert_eq!(extract(&png).unwrap().comment["reference_image_multiple"][0], "ENC");
    // Without vibes in the stealth copy either, the text chunks win
    let img = stealth_png(r#"{"prompt":"stealth"}"#);
    let png = with_chunk(encode_png(img), b"tEXt", &text("Comment", r#"{"prompt":"chunk"}"#));
    assert_eq!(extract(&png).unwrap().comment["prompt"], "chunk");
}

#[test]
fn reads_stealth_alpha_metadata() {
    let json = serde_json::json!({ "Source": "NovelAI Diffusion V4.5", "Comment": COMMENT }).to_string();
    let mut gz = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::default());
    gz.write_all(json.as_bytes()).unwrap();
    let payload = gz.finish().unwrap();
    let mut bytes = STEALTH_MAGIC.to_vec();
    bytes.extend_from_slice(&((payload.len() * 8) as u32).to_be_bytes());
    bytes.extend_from_slice(&payload);

    let (w, h) = (64u32, 64u32);
    let mut img = image::RgbaImage::from_pixel(w, h, image::Rgba([10, 20, 30, 254]));
    let bits = bytes.iter().flat_map(|b| (0..8).rev().map(move |i| (b >> i) & 1));
    for (n, bit) in bits.enumerate() {
        let (x, y) = (n as u32 / h, n as u32 % h); // column-major
        img.get_pixel_mut(x, y)[3] = 254 | bit;
    }
    let meta = extract(&encode_png(img)).unwrap();
    assert_eq!(meta.source.as_deref(), Some("NovelAI Diffusion V4.5"));
    assert_eq!(meta.comment["steps"], 28);
}

#[test]
fn images_without_metadata_return_none() {
    assert!(extract(&encode_png(image::RgbaImage::new(8, 8))).is_none());
    assert!(extract(b"not a png").is_none());
    // A Comment that is not a JSON object is ignored
    let png = with_chunk(encode_png(image::RgbaImage::new(2, 2)), b"tEXt", &text("Comment", "hello"));
    assert!(extract(&png).is_none());
}

#[test]
fn truncated_chunks_do_not_panic() {
    let png = encode_png(image::RgbaImage::new(2, 2));
    let mut broken = png[..20].to_vec();
    broken.extend_from_slice(&[0xFF, 0xFF, 0xFF, 0xFF, b't', b'E', b'X', b't']);
    assert!(png_text_chunks(&broken).is_empty());
}

#[test]
fn text_chunks_are_utf8() {
    let png = with_chunk(encode_png(image::RgbaImage::new(2, 2)), b"tEXt", &text("Comment", r#"{"prompt":"猫耳"}"#));
    assert_eq!(extract(&png).unwrap().comment["prompt"], "猫耳");
}

/// Manual check against a real NovelAI image: NAI_IMAGE=/path/to.png cargo test real_image -- --ignored
#[test]
#[ignore]
fn real_image() {
    let path = std::env::var("NAI_IMAGE").expect("NAI_IMAGE not set");
    let meta = read_file_metadata(&path).unwrap().expect("no metadata");
    println!("source={:?} keys={}", meta.source, meta.comment.as_object().unwrap().len());
    assert!(meta.comment.get("v4_prompt").is_some());
}
