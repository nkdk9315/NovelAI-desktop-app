use std::path::{Path, PathBuf};

use novelai_api::client::NovelAIClient;
use novelai_api::schemas::{EncodeVibeParams, ImageInput, SaveTarget};
use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::{AddVibeRequest, EncodeVibeRequest, VibeDto, VibeRow};

const ALLOWED_IMAGE_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "webp"];

pub(crate) fn validate_image_extension(ext: &str) -> Result<(), AppError> {
    if !ALLOWED_IMAGE_EXTENSIONS.contains(&ext.to_lowercase().as_str()) {
        return Err(AppError::Validation(format!(
            "Unsupported image extension: {ext}. Allowed: {}",
            ALLOWED_IMAGE_EXTENSIONS.join(", ")
        )));
    }
    Ok(())
}

fn copy_thumbnail(source: &Path, dest_dir: &Path, id: &str, dir_name: &str) -> Result<String, AppError> {
    std::fs::create_dir_all(dest_dir).map_err(|e| {
        AppError::Io(format!("Failed to create {dir_name} directory: {e}"))
    })?;
    let ext = source
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png");
    validate_image_extension(ext)?;
    let dest = dest_dir.join(format!("{id}.{ext}"));
    std::fs::copy(source, &dest)
        .map_err(|e| AppError::Io(format!("Failed to copy thumbnail: {e}")))?;
    Ok(dest.to_string_lossy().to_string())
}

pub fn list_vibes(conn: &Connection) -> Result<Vec<VibeDto>, AppError> {
    let rows = crate::repositories::vibe::list_all(conn)?;
    Ok(rows.into_iter().map(VibeDto::from).collect())
}

pub fn add_vibe(
    conn: &Connection,
    app_data_dir: &Path,
    req: AddVibeRequest,
) -> Result<VibeDto, AppError> {
    let source = Path::new(&req.file_path);
    if !source.exists() {
        return Err(AppError::Validation(format!(
            "Vibe file not found: {}",
            req.file_path
        )));
    }

    // Load and parse the vibe file to extract model info
    let vibe_data = novelai_api::utils::vibe::load_vibe_file(&req.file_path)
        .map_err(|e| AppError::Validation(format!("Invalid vibe file: {e}")))?;

    // Extract model from the encodings keys
    let model = vibe_data
        .get("encodings")
        .and_then(|v| v.as_object())
        .and_then(|obj| obj.keys().next().cloned())
        .unwrap_or_else(|| "unknown".to_string());

    // Copy file to vibes directory
    let vibes_dir = app_data_dir.join("vibes");
    std::fs::create_dir_all(&vibes_dir).map_err(|e| {
        AppError::Io(format!("Failed to create vibes directory: {e}"))
    })?;

    let id = uuid::Uuid::new_v4().to_string();
    let extension = source
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("naiv4vibe");
    let dest = vibes_dir.join(format!("{id}.{extension}"));

    std::fs::copy(source, &dest).map_err(|e| {
        AppError::Io(format!("Failed to copy vibe file: {e}"))
    })?;

    // Copy thumbnail if provided
    let thumbnail_path = if let Some(ref thumb_src) = req.thumbnail_path {
        let thumb_src_path = Path::new(thumb_src);
        if thumb_src_path.exists() {
            let thumbs_dir = app_data_dir.join("vibe-thumbnails");
            Some(copy_thumbnail(thumb_src_path, &thumbs_dir, &id, "vibe-thumbnails")?)
        } else {
            None
        }
    } else {
        None
    };

    let row = VibeRow {
        id,
        name: req.name,
        file_path: dest.to_string_lossy().to_string(),
        model,
        created_at: chrono::Utc::now().to_rfc3339(),
        thumbnail_path,
        is_favorite: false,
    };
    crate::repositories::vibe::insert(conn, &row)?;
    Ok(VibeDto::from(row))
}

pub fn delete_vibe(conn: &Connection, id: &str) -> Result<(), AppError> {
    let vibe = crate::repositories::vibe::find_by_id(conn, id)?;
    crate::repositories::vibe::delete(conn, id)?;

    // Remove the file (warn if deletion fails)
    let path = Path::new(&vibe.file_path);
    if path.exists() {
        if let Err(e) = std::fs::remove_file(path) {
            tracing::warn!("Failed to remove vibe file {}: {e}", vibe.file_path);
        }
    }
    Ok(())
}

pub fn update_vibe_name(conn: &Connection, id: &str, name: &str) -> Result<VibeDto, AppError> {
    if name.trim().is_empty() {
        return Err(AppError::Validation("Vibe name cannot be empty".into()));
    }
    crate::repositories::vibe::update_name(conn, id, name.trim())?;
    let row = crate::repositories::vibe::find_by_id(conn, id)?;
    Ok(VibeDto::from(row))
}

pub fn update_vibe_thumbnail(
    conn: &Connection,
    app_data_dir: &Path,
    id: &str,
    source_path: &str,
) -> Result<VibeDto, AppError> {
    // Verify vibe exists
    crate::repositories::vibe::find_by_id(conn, id)?;

    let source = Path::new(source_path);
    if !source.exists() {
        return Err(AppError::Validation(format!(
            "Thumbnail file not found: {source_path}"
        )));
    }

    let thumbs_dir = app_data_dir.join("vibe-thumbnails");
    let dest_str = copy_thumbnail(source, &thumbs_dir, id, "vibe-thumbnails")?;
    crate::repositories::vibe::update_thumbnail(conn, id, Some(&dest_str))?;

    let row = crate::repositories::vibe::find_by_id(conn, id)?;
    Ok(VibeDto::from(row))
}

pub fn clear_vibe_thumbnail(conn: &Connection, id: &str) -> Result<VibeDto, AppError> {
    let vibe = crate::repositories::vibe::find_by_id(conn, id)?;
    // Remove file if it exists
    if let Some(ref thumb_path) = vibe.thumbnail_path {
        let path = Path::new(thumb_path);
        if path.exists() {
            let _ = std::fs::remove_file(path);
        }
    }
    crate::repositories::vibe::update_thumbnail(conn, id, None)?;
    let row = crate::repositories::vibe::find_by_id(conn, id)?;
    Ok(VibeDto::from(row))
}

pub fn toggle_vibe_favorite(conn: &Connection, id: &str) -> Result<VibeDto, AppError> {
    crate::repositories::vibe::toggle_favorite(conn, id)?;
    let row = crate::repositories::vibe::find_by_id(conn, id)?;
    Ok(VibeDto::from(row))
}

pub fn export_vibe(conn: &Connection, id: &str, dest_path: &str) -> Result<(), AppError> {
    let vibe = crate::repositories::vibe::find_by_id(conn, id)?;
    std::fs::copy(&vibe.file_path, dest_path)
        .map_err(|e| AppError::Io(format!("Failed to export vibe file: {e}")))?;
    Ok(())
}

pub async fn encode_vibe(
    db: &std::sync::Mutex<Connection>,
    api_client: &tokio::sync::Mutex<Option<NovelAIClient>>,
    app_data_dir: &Path,
    req: EncodeVibeRequest,
) -> Result<VibeDto, AppError> {
    // Verify image exists
    let source = Path::new(&req.image_path);
    if !source.exists() {
        return Err(AppError::Validation(format!(
            "Image file not found: {}",
            req.image_path
        )));
    }

    // Parse model string
    let model: novelai_api::constants::Model = req
        .model
        .parse()
        .map_err(|_| AppError::Validation(format!("Unknown model: {}", req.model)))?;

    // Prepare vibes output directory
    let vibes_dir = app_data_dir.join("vibes");
    std::fs::create_dir_all(&vibes_dir)
        .map_err(|e| AppError::Io(format!("Failed to create vibes directory: {e}")))?;

    let id = uuid::Uuid::new_v4().to_string();

    // Build encode params
    let params = EncodeVibeParams {
        image: ImageInput::FilePath(PathBuf::from(&req.image_path)),
        model,
        information_extracted: req.information_extracted,
        strength: 0.7, // Default strength, user adjusts later
        save: SaveTarget::Directory {
            dir: vibes_dir.to_string_lossy().to_string(),
            filename: Some(format!("{id}.naiv4vibe")),
        },
    };

    // Call API
    let result = {
        let mut client_guard = api_client.lock().await;
        let client = client_guard
            .as_mut()
            .ok_or_else(|| AppError::NotInitialized("API client not initialized".into()))?;
        client
            .encode_vibe(&params)
            .await
            .map_err(|e| AppError::ApiClient(e.to_string()))?
    };

    let saved_path = result.saved_path.ok_or_else(|| {
        AppError::Io("Vibe file was not saved (no saved_path returned)".into())
    })?;

    let model_key = model.model_key().to_string();

    // Copy source image as thumbnail
    let thumbnail_path = {
        let thumbs_dir = app_data_dir.join("vibe-thumbnails");
        Some(copy_thumbnail(source, &thumbs_dir, &id, "vibe-thumbnails")?)
    };

    let row = VibeRow {
        id,
        name: req.name,
        file_path: saved_path,
        model: model_key,
        created_at: chrono::Utc::now().to_rfc3339(),
        thumbnail_path,
        is_favorite: false,
    };

    {
        let conn = db.lock().map_err(|e| AppError::Database(e.to_string()))?;
        crate::repositories::vibe::insert(&conn, &row)?;
    }

    Ok(VibeDto::from(row))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::setup_test_db;
    use std::io::Write;
    use tempfile::TempDir;

    fn create_test_vibe_file(dir: &Path) -> String {
        let vibe_path = dir.join("test.naiv4vibe");
        let vibe_json = serde_json::json!({
            "encodings": {
                "v4-5full": {
                    "enc1": {
                        "encoding": "base64data...",
                        "params": {
                            "information_extracted": 0.7
                        }
                    }
                }
            }
        });
        let mut f = std::fs::File::create(&vibe_path).unwrap();
        f.write_all(vibe_json.to_string().as_bytes()).unwrap();
        vibe_path.to_string_lossy().to_string()
    }

    #[test]
    fn test_add_vibe() {
        let conn = setup_test_db();
        let tmp = TempDir::new().unwrap();
        let app_data_dir = TempDir::new().unwrap();

        let vibe_path = create_test_vibe_file(tmp.path());

        let req = AddVibeRequest {
            file_path: vibe_path,
            name: "My Vibe".to_string(),
            thumbnail_path: None,
        };
        let dto = add_vibe(&conn, app_data_dir.path(), req).unwrap();

        assert_eq!(dto.name, "My Vibe");
        assert_eq!(dto.model, "v4-5full");
        assert!(Path::new(&dto.file_path).exists());

        // Verify DB insertion
        let all = list_vibes(&conn).unwrap();
        assert_eq!(all.len(), 1);
        assert_eq!(all[0].id, dto.id);
    }

    #[test]
    fn test_add_vibe_file_not_found() {
        let conn = setup_test_db();
        let app_data_dir = TempDir::new().unwrap();

        let req = AddVibeRequest {
            file_path: "/nonexistent/file.naiv4vibe".to_string(),
            name: "Missing".to_string(),
            thumbnail_path: None,
        };
        let err = add_vibe(&conn, app_data_dir.path(), req).unwrap_err();
        assert!(matches!(err, AppError::Validation(_)));
    }

    #[test]
    fn test_delete_vibe() {
        let conn = setup_test_db();
        let tmp = TempDir::new().unwrap();
        let app_data_dir = TempDir::new().unwrap();

        let vibe_path = create_test_vibe_file(tmp.path());
        let req = AddVibeRequest {
            file_path: vibe_path,
            name: "To Delete".to_string(),
            thumbnail_path: None,
        };
        let dto = add_vibe(&conn, app_data_dir.path(), req).unwrap();
        assert!(Path::new(&dto.file_path).exists());

        delete_vibe(&conn, &dto.id).unwrap();

        // DB should be empty
        let all = list_vibes(&conn).unwrap();
        assert!(all.is_empty());

        // File should be removed
        assert!(!Path::new(&dto.file_path).exists());
    }

    #[test]
    fn test_delete_vibe_not_found() {
        let conn = setup_test_db();
        let err = delete_vibe(&conn, "nonexistent").unwrap_err();
        assert!(matches!(err, AppError::NotFound(_)));
    }
}
