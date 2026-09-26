// Pure parsing for the nax.moe catalog: the public API's JSON, the daily
// `tags.zip` export, and the URL-encoding quirks of both. No I/O here, so
// everything is unit-testable; `services::nax` does the fetching.
//
// Encoding quirks: file names are stored percent-encoded ("hime%20cut.webp")
// and the CDN wants them encoded *again* ("hime%2520cut.webp"). The API's
// per-gallery listing also percent-encodes tag names; the export does not.

use std::collections::HashMap;
use std::io::{Cursor, Read};

use serde::Deserialize;

use crate::error::AppError;
use crate::models::dto::{NaxGalleryRow, NaxImageRow};

const EXPORT_FILE: &str = "tags.json";

/// Category of a gallery, from its slug ("danbooru-hair-tags-v5" → "hair").
pub fn category_for(slug: &str) -> &'static str {
    ["artist", "character", "copyright", "face", "hair"]
        .into_iter()
        .find(|c| slug.contains(c))
        .unwrap_or("other")
}

/// JavaScript `encodeURIComponent`.
pub fn encode_component(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for b in s.bytes() {
        if b.is_ascii_alphanumeric() || b"-_.!~*'()".contains(&b) {
            out.push(b as char);
        } else {
            out.push_str(&format!("%{b:02X}"));
        }
    }
    out
}

/// Decode `%XX` escapes; malformed escapes are kept as-is.
pub fn percent_decode(s: &str) -> String {
    let bytes = s.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            let hex = std::str::from_utf8(&bytes[i + 1..i + 3]).ok();
            if let Some(v) = hex.and_then(|h| u8::from_str_radix(h, 16).ok()) {
                out.push(v);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

pub fn image_url(base_url: &str, filename: &str) -> String {
    format!("{base_url}{}", encode_component(filename))
}

// ---- API: GET /api/gallery/list ----

#[derive(Deserialize)]
struct ApiGallery {
    slug: String,
    title: String,
    model_version: String,
    description: Option<String>,
    image_base_url: String,
    #[serde(default)]
    images: i64,
}

/// Gallery list in API order (newest model first); `sort_order` keeps it.
pub fn parse_gallery_list(json: &[u8]) -> Result<Vec<NaxGalleryRow>, AppError> {
    let list: Vec<ApiGallery> = serde_json::from_slice(json)
        .map_err(|e| AppError::ApiClient(format!("nax.moe gallery list: {e}")))?;
    Ok(list
        .into_iter()
        .enumerate()
        .map(|(i, g)| NaxGalleryRow {
            slug: g.slug,
            title: g.title,
            model_version: g.model_version,
            description: g.description,
            image_base_url: g.image_base_url,
            image_count: g.images,
            sort_order: i as i64,
        })
        .collect())
}

// ---- API: GET /api/gallery/{slug} ----

#[derive(Deserialize)]
struct ApiGalleryDetail {
    images: Vec<HashMap<String, String>>,
}

/// Images of one gallery from the API (no vote data there, so votes are 0).
pub fn parse_gallery_detail(json: &[u8], slug: &str) -> Result<Vec<NaxImageRow>, AppError> {
    let detail: ApiGalleryDetail = serde_json::from_slice(json)
        .map_err(|e| AppError::ApiClient(format!("nax.moe gallery {slug}: {e}")))?;
    Ok(detail
        .images
        .into_iter()
        .flat_map(|m| m.into_iter())
        .map(|(tag, filename)| NaxImageRow {
            gallery_slug: slug.to_string(),
            tag: percent_decode(&tag),
            filename,
            up_votes: 0,
            down_votes: 0,
            score: 0,
            first_seen_at: String::new(),
        })
        .collect())
}

// ---- downloads/tags.zip ----

#[derive(Deserialize)]
struct Export {
    galleries: HashMap<String, ExportGallery>,
}

#[derive(Deserialize)]
struct ExportGallery {
    tags: Vec<ExportTag>,
}

#[derive(Deserialize)]
struct ExportTag {
    tag: String,
    filename: String,
    #[serde(default)]
    votes: ExportVotes,
}

#[derive(Deserialize, Default)]
struct ExportVotes {
    #[serde(default)]
    up: i64,
    #[serde(default)]
    down: i64,
    #[serde(default)]
    score: i64,
}

/// Every gallery's images (with community votes), keyed by gallery slug.
pub fn parse_tags_zip(bytes: &[u8]) -> Result<HashMap<String, Vec<NaxImageRow>>, AppError> {
    let bad = |e: String| AppError::ApiClient(format!("nax.moe tags.zip: {e}"));
    let mut archive = zip::ZipArchive::new(Cursor::new(bytes)).map_err(|e| bad(e.to_string()))?;
    let mut file = archive.by_name(EXPORT_FILE).map_err(|e| bad(e.to_string()))?;
    let mut json = Vec::with_capacity(file.size() as usize);
    file.read_to_end(&mut json).map_err(|e| bad(e.to_string()))?;
    let export: Export = serde_json::from_slice(&json).map_err(|e| bad(e.to_string()))?;
    Ok(export
        .galleries
        .into_iter()
        .map(|(slug, g)| {
            let rows = g
                .tags
                .into_iter()
                .map(|t| NaxImageRow {
                    gallery_slug: slug.clone(),
                    tag: t.tag,
                    filename: t.filename,
                    up_votes: t.votes.up,
                    down_votes: t.votes.down,
                    score: t.votes.score,
                    first_seen_at: String::new(),
                })
                .collect();
            (slug, rows)
        })
        .collect())
}

#[cfg(test)]
#[path = "nax_catalog_tests.rs"]
mod tests;
