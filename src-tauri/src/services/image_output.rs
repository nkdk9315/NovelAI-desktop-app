//! Shared helpers for reading input images and persisting output images
//! (generation, augment, upscale) into a project's history.

use std::path::{Path, PathBuf};

use base64::Engine;
use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::{GeneratedImageRow, ImageDataDto, ImageSourceRequest};

/// Largest image file accepted as a tool / editor input (matches the API client).
pub const MAX_INPUT_IMAGE_BYTES: u64 = 10 * 1024 * 1024;
const ALLOWED_INPUT_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "webp"];

pub struct StoredImage {
    pub id: String,
    pub relative_path: String,
}

/// Metadata of an output image to insert into the history.
pub struct OutputMeta {
    pub seed: i64,
    pub width: u32,
    pub height: u32,
    pub model: String,
    pub prompt_snapshot: serde_json::Value,
}

fn lock(db: &std::sync::Mutex<Connection>) -> Result<std::sync::MutexGuard<'_, Connection>, AppError> {
    db.lock().map_err(|e| AppError::Database(e.to_string()))
}

pub fn project_dir(db: &std::sync::Mutex<Connection>, project_id: &str) -> Result<String, AppError> {
    let conn = lock(db)?;
    Ok(crate::repositories::project::find_by_id(&conn, project_id)?.directory_path)
}

/// Write `bytes` to `<project>/images/<uuid>.<ext>` and insert the history row.
pub fn persist_output_image(
    db: &std::sync::Mutex<Connection>,
    project_id: &str,
    project_dir: &str,
    bytes: &[u8],
    ext: &str,
    meta: OutputMeta,
) -> Result<StoredImage, AppError> {
    let id = uuid::Uuid::new_v4().to_string();
    let relative_path = format!("images/{id}.{ext}");
    let project_path = Path::new(project_dir);
    let full_path = project_path.join(&relative_path);
    if !full_path.starts_with(project_path) {
        return Err(AppError::Validation("invalid file path".to_string()));
    }
    if let Some(parent) = full_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(&full_path, bytes)?;

    let row = GeneratedImageRow {
        id: id.clone(),
        project_id: project_id.to_string(),
        file_path: relative_path.clone(),
        seed: meta.seed,
        prompt_snapshot: meta.prompt_snapshot.to_string(),
        width: meta.width as i32,
        height: meta.height as i32,
        model: meta.model,
        is_saved: 0,
        created_at: chrono::Utc::now().to_rfc3339(),
    };
    crate::repositories::image::insert(&*lock(db)?, &row)?;
    Ok(StoredImage { id, relative_path })
}

/// Absolute path of a history image, guaranteed to stay inside its project directory.
fn history_image_path(conn: &Connection, image_id: &str) -> Result<PathBuf, AppError> {
    let image = crate::repositories::image::find_by_id(conn, image_id)?;
    let project = crate::repositories::project::find_by_id(conn, &image.project_id)?;
    let base = Path::new(&project.directory_path);
    let full = base.join(&image.file_path);
    if !full.starts_with(base) || image.file_path.contains("..") {
        return Err(AppError::Validation("invalid image path".to_string()));
    }
    Ok(full)
}

pub fn read_history_image(db: &std::sync::Mutex<Connection>, image_id: &str) -> Result<Vec<u8>, AppError> {
    let path = history_image_path(&*lock(db)?, image_id)?;
    Ok(std::fs::read(path)?)
}

/// Read a user-picked image file (drag & drop / file dialog).
/// Only image extensions are accepted and the size is capped.
pub fn read_image_file(path: &str) -> Result<Vec<u8>, AppError> {
    let p = Path::new(path);
    let ext = p
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_ascii_lowercase())
        .unwrap_or_default();
    if !ALLOWED_INPUT_EXTENSIONS.contains(&ext.as_str()) {
        return Err(AppError::Validation(format!("unsupported image type: .{ext}")));
    }
    let meta = std::fs::metadata(p)
        .map_err(|_| AppError::Validation(format!("image file not found: {path}")))?;
    if !meta.is_file() {
        return Err(AppError::Validation(format!("not a file: {path}")));
    }
    if meta.len() > MAX_INPUT_IMAGE_BYTES {
        return Err(AppError::Validation("image file is larger than 10 MB".to_string()));
    }
    Ok(std::fs::read(p)?)
}

pub fn decode_base64(data: &str) -> Result<Vec<u8>, AppError> {
    let stripped = data.split_once(";base64,").map_or(data, |(_, b)| b);
    base64::engine::general_purpose::STANDARD
        .decode(stripped.trim())
        .map_err(|e| AppError::Validation(format!("invalid base64 image: {e}")))
}

pub fn resolve_source(db: &std::sync::Mutex<Connection>, source: &ImageSourceRequest) -> Result<Vec<u8>, AppError> {
    match source {
        ImageSourceRequest::History { image_id } => read_history_image(db, image_id),
        ImageSourceRequest::Base64 { data } => decode_base64(data),
    }
}

/// Detect the image MIME type / file extension from magic bytes.
pub fn detect_format(bytes: &[u8]) -> (&'static str, &'static str) {
    if bytes.starts_with(&[0x89, b'P', b'N', b'G']) {
        ("image/png", "png")
    } else if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        ("image/jpeg", "jpg")
    } else if bytes.len() >= 12 && &bytes[..4] == b"RIFF" && &bytes[8..12] == b"WEBP" {
        ("image/webp", "webp")
    } else {
        ("application/octet-stream", "bin")
    }
}

pub fn to_image_data(bytes: &[u8]) -> Result<ImageDataDto, AppError> {
    let (mime, _) = detect_format(bytes);
    if mime == "application/octet-stream" {
        return Err(AppError::Validation("unsupported image format".to_string()));
    }
    Ok(ImageDataDto {
        base64: base64::engine::general_purpose::STANDARD.encode(bytes),
        mime: mime.to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_formats() {
        assert_eq!(detect_format(&[0x89, b'P', b'N', b'G', 0, 0]).1, "png");
        assert_eq!(detect_format(&[0xFF, 0xD8, 0xFF, 0xE0]).1, "jpg");
        assert_eq!(detect_format(b"RIFF\0\0\0\0WEBPVP8L").1, "webp");
        assert_eq!(detect_format(b"GIF89a").1, "bin");
    }

    #[test]
    fn decode_base64_strips_data_url_prefix() {
        assert_eq!(decode_base64("data:image/png;base64,AAEC").unwrap(), vec![0, 1, 2]);
        assert_eq!(decode_base64("AAEC").unwrap(), vec![0, 1, 2]);
        assert!(decode_base64("!!").is_err());
    }

    #[test]
    fn read_image_file_rejects_non_images() {
        let dir = tempfile::tempdir().unwrap();
        let txt = dir.path().join("a.txt");
        std::fs::write(&txt, "x").unwrap();
        assert!(matches!(read_image_file(txt.to_str().unwrap()), Err(AppError::Validation(_))));
        let missing = dir.path().join("missing.png");
        assert!(matches!(read_image_file(missing.to_str().unwrap()), Err(AppError::Validation(_))));
        let png = dir.path().join("a.PNG");
        std::fs::write(&png, [0x89, b'P', b'N', b'G']).unwrap();
        assert_eq!(read_image_file(png.to_str().unwrap()).unwrap().len(), 4);
    }
}
