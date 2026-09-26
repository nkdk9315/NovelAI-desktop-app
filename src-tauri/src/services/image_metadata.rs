//! Read the generation metadata NovelAI embeds in its PNGs.
//!
//! NovelAI writes `tEXt` chunks (`Title`, `Description`, `Software`, `Source`,
//! `Comment` = JSON of the request). Images whose chunks were stripped may
//! still carry the same data "stealth"-encoded in the alpha channel's LSBs.

use std::collections::HashMap;
use std::io::Read;

use crate::error::AppError;
use crate::models::dto::ImageMetadataDto;

const PNG_SIGNATURE: &[u8] = &[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A];
const STEALTH_MAGIC: &[u8] = b"stealth_pngcomp";
/// Cap on decompressed text so a crafted file cannot exhaust memory.
const MAX_TEXT_BYTES: u64 = 32 * 1024 * 1024;

/// Text chunks (`tEXt` / `zTXt` / `iTXt`) of a PNG, keyed by keyword.
pub fn png_text_chunks(bytes: &[u8]) -> HashMap<String, String> {
    let mut out = HashMap::new();
    if !bytes.starts_with(PNG_SIGNATURE) {
        return out;
    }
    let mut i = PNG_SIGNATURE.len();
    while i + 8 <= bytes.len() {
        let len = u32::from_be_bytes([bytes[i], bytes[i + 1], bytes[i + 2], bytes[i + 3]]) as usize;
        let kind = &bytes[i + 4..i + 8];
        let start = i + 8;
        let Some(end) = start.checked_add(len).filter(|&e| e <= bytes.len()) else { break };
        let data = &bytes[start..end];
        if let Some((key, value)) = parse_text_chunk(kind, data) {
            out.insert(key, value);
        }
        if kind == b"IEND" {
            break;
        }
        i = end + 4; // skip CRC
    }
    out
}

fn parse_text_chunk(kind: &[u8], data: &[u8]) -> Option<(String, String)> {
    let nul = data.iter().position(|&b| b == 0)?;
    let key = String::from_utf8_lossy(&data[..nul]).into_owned();
    let rest = &data[nul + 1..];
    let value = match kind {
        // The spec says Latin-1, but NovelAI writes UTF-8 (e.g. Japanese prompts)
        b"tEXt" => String::from_utf8(rest.to_vec())
            .unwrap_or_else(|_| rest.iter().map(|&b| b as char).collect()),
        b"zTXt" => inflate(rest.get(1..)?, false)?,
        b"iTXt" => {
            // compression flag, method, language\0, translated keyword\0, text
            let (&flag, rest) = rest.split_first()?;
            let rest = rest.get(1..)?;
            let lang_end = rest.iter().position(|&b| b == 0)?;
            let rest = &rest[lang_end + 1..];
            let tr_end = rest.iter().position(|&b| b == 0)?;
            let text = &rest[tr_end + 1..];
            if flag == 1 { inflate(text, false)? } else { String::from_utf8_lossy(text).into_owned() }
        }
        _ => return None,
    };
    Some((key, value))
}

fn inflate(data: &[u8], gzip: bool) -> Option<String> {
    let mut out = String::new();
    let result = if gzip {
        flate2::read::GzDecoder::new(data).take(MAX_TEXT_BYTES).read_to_string(&mut out)
    } else {
        flate2::read::ZlibDecoder::new(data).take(MAX_TEXT_BYTES).read_to_string(&mut out)
    };
    result.ok().map(|_| out)
}

/// Bits of the alpha channel's LSBs, read column by column (NovelAI's layout).
struct LsbReader<'a> {
    img: &'a image::RgbaImage,
    x: u32,
    y: u32,
}

impl LsbReader<'_> {
    fn next_byte(&mut self) -> Option<u8> {
        let (w, h) = self.img.dimensions();
        let mut byte = 0u8;
        for _ in 0..8 {
            if self.x >= w {
                return None;
            }
            byte = (byte << 1) | (self.img.get_pixel(self.x, self.y)[3] & 1);
            self.y += 1;
            if self.y == h {
                self.y = 0;
                self.x += 1;
            }
        }
        Some(byte)
    }

    fn bytes(&mut self, n: usize) -> Option<Vec<u8>> {
        (0..n).map(|_| self.next_byte()).collect()
    }
}

/// Metadata hidden in the alpha channel (`stealth_pngcomp`: gzip JSON).
pub fn stealth_metadata(bytes: &[u8]) -> Option<HashMap<String, String>> {
    let img = image::load_from_memory_with_format(bytes, image::ImageFormat::Png).ok()?;
    if !img.color().has_alpha() {
        return None;
    }
    let rgba = img.to_rgba8();
    let mut reader = LsbReader { img: &rgba, x: 0, y: 0 };
    if reader.bytes(STEALTH_MAGIC.len())? != STEALTH_MAGIC {
        return None;
    }
    let bits = u32::from_be_bytes(reader.bytes(4)?.try_into().ok()?) as usize;
    let payload = reader.bytes(bits / 8)?;
    let json: serde_json::Value = serde_json::from_str(&inflate(&payload, true)?).ok()?;
    let map = json.as_object()?;
    Some(
        map.iter()
            .map(|(k, v)| (k.clone(), v.as_str().map_or_else(|| v.to_string(), str::to_string)))
            .collect(),
    )
}

/// NovelAI generation metadata of an image, or None when it has none.
pub fn extract(bytes: &[u8]) -> Option<ImageMetadataDto> {
    let parse = |fields: &HashMap<String, String>| -> Option<serde_json::Value> {
        let comment: serde_json::Value = serde_json::from_str(fields.get("Comment")?).ok()?;
        comment.is_object().then_some(comment)
    };
    let from_chunks = png_text_chunks(bytes);
    let chunk_comment = parse(&from_chunks);
    // The text chunks may lack the (large) vibe data that the stealth copy still has
    let has_vibes = |c: &serde_json::Value| c.get("reference_image_multiple").is_some();
    let (fields, comment) = match chunk_comment {
        Some(c) if has_vibes(&c) => (from_chunks, c),
        chunk => match stealth_metadata(bytes).and_then(|f| parse(&f).map(|c| (f, c))) {
            Some((f, c)) if chunk.is_none() || has_vibes(&c) => (f, c),
            _ => (from_chunks, chunk?),
        },
    };
    Some(ImageMetadataDto {
        source: fields.get("Source").cloned(),
        software: fields.get("Software").cloned(),
        description: fields.get("Description").cloned(),
        comment,
    })
}

pub fn read_file_metadata(path: &str) -> Result<Option<ImageMetadataDto>, AppError> {
    let bytes = crate::services::image_output::read_image_file(path)?;
    Ok(extract(&bytes))
}

#[cfg(test)]
#[path = "image_metadata_tests.rs"]
mod tests;
