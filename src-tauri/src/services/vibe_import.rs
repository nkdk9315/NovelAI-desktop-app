//! Import a vibe from a raw encoding (e.g. `reference_image_multiple` in the
//! metadata of a NovelAI image) as a `.naiv4vibe` file in the library.

use std::path::Path;

use rusqlite::Connection;
use sha2::{Digest, Sha256};

use crate::error::AppError;
use crate::models::dto::{ImportVibeEncodingRequest, ImportedVibeDto, VibeDto, VibeRow};

/// Vibe Transfer model keys (V5 has no Vibe Transfer).
const VIBE_MODEL_KEYS: &[(&str, &str)] = &[
    ("v4curated", "nai-diffusion-4-curated-preview"),
    ("v4full", "nai-diffusion-4-full"),
    ("v4-5curated", "nai-diffusion-4-5-curated"),
    ("v4-5full", "nai-diffusion-4-5-full"),
];

pub fn validate_request(req: &ImportVibeEncodingRequest) -> Result<&'static str, AppError> {
    let model = VIBE_MODEL_KEYS
        .iter()
        .find(|(key, _)| *key == req.model_key)
        .map(|(_, model)| *model)
        .ok_or_else(|| AppError::Validation(format!("unsupported vibe model: {}", req.model_key)))?;
    let enc = req.encoding.trim();
    if enc.is_empty() || enc.len() > novelai_api::constants::MAX_VIBE_ENCODING_LENGTH {
        return Err(AppError::Validation("invalid vibe encoding".to_string()));
    }
    if !enc.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'+' || b == b'/' || b == b'=') {
        return Err(AppError::Validation("vibe encoding is not base64".to_string()));
    }
    for (name, v) in [("information_extracted", req.information_extracted), ("strength", req.strength)] {
        if !(0.0..=1.0).contains(&v) {
            return Err(AppError::Validation(format!("{name} must be between 0 and 1")));
        }
    }
    Ok(model)
}

/// A vibe already in the library with the same model and encoding.
fn find_existing(conn: &Connection, model_key: &str, encoding: &str) -> Result<Option<VibeRow>, AppError> {
    for row in crate::repositories::vibe::list_all(conn)? {
        if row.model != model_key {
            continue;
        }
        let Ok(data) = novelai_api::utils::vibe::load_vibe_file(&row.file_path) else { continue };
        let same = data["encodings"][model_key]
            .as_object()
            .is_some_and(|m| m.values().any(|e| e["encoding"].as_str() == Some(encoding)));
        if same {
            return Ok(Some(row));
        }
    }
    Ok(None)
}

pub fn import_vibe_encoding(
    conn: &Connection,
    app_data_dir: &Path,
    req: ImportVibeEncodingRequest,
) -> Result<ImportedVibeDto, AppError> {
    let model = validate_request(&req)?;
    let encoding = req.encoding.trim();
    if let Some(row) = find_existing(conn, &req.model_key, encoding)? {
        return Ok(ImportedVibeDto { vibe: VibeDto::from(row), existed: true });
    }

    let hash = format!("{:x}", Sha256::digest(encoding.as_bytes()));
    let now = chrono::Utc::now().to_rfc3339();
    let data = serde_json::json!({
        "identifier": "novelai-vibe-transfer",
        "version": 1,
        "type": "encoding",
        "id": hash,
        "encodings": {
            (req.model_key.as_str()): {
                "unknown": {
                    "encoding": encoding,
                    "params": { "information_extracted": req.information_extracted },
                }
            }
        },
        "name": req.name,
        "createdAt": now,
        "importInfo": {
            "model": model,
            "information_extracted": req.information_extracted,
            "strength": req.strength,
        },
    });

    let vibes_dir = app_data_dir.join("vibes");
    std::fs::create_dir_all(&vibes_dir)?;
    let id = uuid::Uuid::new_v4().to_string();
    let dest = vibes_dir.join(format!("{id}.naiv4vibe"));
    let json = serde_json::to_vec_pretty(&data).map_err(|e| AppError::Io(e.to_string()))?;
    std::fs::write(&dest, json)?;

    let row = VibeRow {
        id,
        name: req.name,
        file_path: dest.to_string_lossy().to_string(),
        model: req.model_key,
        created_at: now,
        thumbnail_path: None,
        is_favorite: false,
        folder_id: None,
    };
    crate::repositories::vibe::insert(conn, &row)?;
    Ok(ImportedVibeDto { vibe: VibeDto::from(row), existed: false })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::setup_test_db;

    fn req(model_key: &str, encoding: &str) -> ImportVibeEncodingRequest {
        ImportVibeEncodingRequest {
            name: "Imported".into(),
            model_key: model_key.into(),
            encoding: encoding.into(),
            information_extracted: 0.7,
            strength: 0.5,
        }
    }

    #[test]
    fn validates_model_and_encoding() {
        assert!(validate_request(&req("v4-5full", "QUJD")).is_ok());
        assert!(validate_request(&req("v5full", "QUJD")).is_err());
        assert!(validate_request(&req("v4-5full", "")).is_err());
        assert!(validate_request(&req("v4-5full", "not base64!")).is_err());
        let mut r = req("v4full", "QUJD");
        r.strength = 1.5;
        assert!(validate_request(&r).is_err());
    }

    #[test]
    fn imports_readable_vibe_and_deduplicates() {
        let conn = setup_test_db();
        let dir = tempfile::tempdir().unwrap();
        let first = import_vibe_encoding(&conn, dir.path(), req("v4-5full", "QUJDRA==")).unwrap();
        assert!(!first.existed);
        assert_eq!(first.vibe.model, "v4-5full");

        // The written file is usable for generation
        let data = novelai_api::utils::vibe::load_vibe_file(&first.vibe.file_path).unwrap();
        let (enc, info) = novelai_api::utils::vibe::extract_encoding(&data, "nai-diffusion-4-5-full").unwrap();
        assert_eq!(enc, "QUJDRA==");
        assert_eq!(info, 0.7);

        let again = import_vibe_encoding(&conn, dir.path(), req("v4-5full", "QUJDRA==")).unwrap();
        assert!(again.existed);
        assert_eq!(again.vibe.id, first.vibe.id);

        // Same encoding for another model is a different vibe
        let other = import_vibe_encoding(&conn, dir.path(), req("v4full", "QUJDRA==")).unwrap();
        assert!(!other.existed);
    }
}
