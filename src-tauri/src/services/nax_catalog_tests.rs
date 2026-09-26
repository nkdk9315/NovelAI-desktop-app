use super::*;
use std::io::Write;

#[test]
fn category_from_slug() {
    assert_eq!(category_for("danbooru-artist-tags-2-v5"), "artist");
    assert_eq!(category_for("artists-v4.5"), "artist");
    assert_eq!(category_for("danbooru-character-tags-v4"), "character");
    assert_eq!(category_for("danbooru-copyright-tags-v4.5"), "copyright");
    assert_eq!(category_for("danbooru-face-tags-v4"), "face");
    assert_eq!(category_for("danbooru-hair-tags-v5"), "hair");
    assert_eq!(category_for("vibes"), "other");
}

#[test]
fn encode_matches_encode_uri_component() {
    assert_eq!(encode_component("akchu.webp"), "akchu.webp");
    assert_eq!(encode_component("a b(c)"), "a%20b(c)");
    assert_eq!(encode_component("é:/"), "%C3%A9%3A%2F");
}

#[test]
fn image_url_double_encodes_stored_filename() {
    // Matches the URL nax.moe itself renders.
    assert_eq!(
        image_url("https://cdn.zele.st/data/NAX/Images/g/", "akazawa%20red.webp"),
        "https://cdn.zele.st/data/NAX/Images/g/akazawa%2520red.webp"
    );
}

#[test]
fn percent_decode_handles_utf8_and_malformed() {
    assert_eq!(percent_decode("2b%20%28nier%3Aautomata%29"), "2b (nier:automata)");
    assert_eq!(percent_decode("%C3%A9"), "é");
    assert_eq!(percent_decode("100%"), "100%");
    assert_eq!(percent_decode("%zz%4"), "%zz%4");
}

#[test]
fn parses_gallery_list_in_order() {
    let json = br#"[
        {"slug":"a-v5","title":"A","model_version":"v5","description":null,
         "image_base_url":"https://cdn/a/","images":3},
        {"slug":"b-v4.5","title":"B","model_version":"v4.5","description":"d",
         "image_base_url":"https://cdn/b/","images":1,"upvotes":9}
    ]"#;
    let rows = parse_gallery_list(json).unwrap();
    assert_eq!(rows.len(), 2);
    assert_eq!(rows[0].slug, "a-v5");
    assert_eq!(rows[0].sort_order, 0);
    assert_eq!(rows[1].sort_order, 1);
    assert_eq!(rows[1].description.as_deref(), Some("d"));
    assert!(parse_gallery_list(b"{}").is_err());
}

#[test]
fn parses_gallery_detail_decoding_tags() {
    let json = br#"{"gallery":{},"images":[{"hime%20cut":"hime%20cut.webp"},{"afro":"afro.webp"}]}"#;
    let rows = parse_gallery_detail(json, "hair-v5").unwrap();
    assert_eq!(rows.len(), 2);
    assert_eq!(rows[0].tag, "hime cut");
    assert_eq!(rows[0].filename, "hime%20cut.webp");
    assert_eq!(rows[0].gallery_slug, "hair-v5");
    assert_eq!(rows[0].score, 0);
}

fn zip_of(name: &str, body: &str) -> Vec<u8> {
    let mut buf = Cursor::new(Vec::new());
    {
        let mut w = zip::ZipWriter::new(&mut buf);
        w.start_file(name, zip::write::SimpleFileOptions::default()).unwrap();
        w.write_all(body.as_bytes()).unwrap();
        w.finish().unwrap();
    }
    buf.into_inner()
}

#[test]
fn parses_tags_zip_with_votes() {
    let body = r#"{"metadata":{},"galleries":{
        "g-v5":{"title":"G","version":"v5","tags":[
            {"tag":"au (d elete)","filename":"au%20%28d%20elete%29.webp","votes":{"up":5,"down":1,"score":4}},
            {"tag":"novotes","filename":"novotes.webp"}
        ]}}}"#;
    let map = parse_tags_zip(&zip_of("tags.json", body)).unwrap();
    let rows = &map["g-v5"];
    assert_eq!(rows.len(), 2);
    assert_eq!(rows[0].tag, "au (d elete)");
    assert_eq!((rows[0].up_votes, rows[0].down_votes, rows[0].score), (5, 1, 4));
    assert_eq!(rows[1].score, 0);
}

#[test]
fn tags_zip_errors_are_reported() {
    assert!(parse_tags_zip(b"not a zip").is_err());
    assert!(parse_tags_zip(&zip_of("other.json", "{}")).is_err());
    assert!(parse_tags_zip(&zip_of("tags.json", "{broken")).is_err());
}

#[test]
fn thumb_protocol_path_round_trips_image_urls() {
    // The UI builds naxthumb URLs with encodeURIComponent(imageUrl); the
    // protocol handler must decode the path back to exactly that URL,
    // including the already-%-encoded filename.
    let url = "https://cdn.zele.st/data/NAX/Images/danbooru-character-tags-v4.5/2b%2520%2528nier%253Aautomata%2529.webp";
    assert_eq!(percent_decode(&encode_component(url)), url);
}
