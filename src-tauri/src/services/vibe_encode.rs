use std::path::{Path, PathBuf};

use novelai_api::client::NovelAIClient;
use novelai_api::schemas::{EncodeVibeParams, ImageInput, SaveTarget};
use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::{EncodeVibeRequest, VibeDto, VibeRow};

use super::vibe::copy_thumbnail;

pub async fn encode_vibe(
    db: &std::sync::Mutex<Connection>,
    api_client: &tokio::sync::Mutex<Option<NovelAIClient>>,
    app_data_dir: &Path,
    req: EncodeVibeRequest,
) -> Result<VibeDto, AppError> {
    let source = Path::new(&req.image_path);
    if !source.exists() {
        return Err(AppError::Validation(format!(
            "Image file not found: {}",
            req.image_path
        )));
    }

    let model: novelai_api::constants::Model = req
        .model
        .parse()
        .map_err(|_| AppError::Validation(format!("Unknown model: {}", req.model)))?;

    let vibes_dir = app_data_dir.join("vibes");
    std::fs::create_dir_all(&vibes_dir)
        .map_err(|e| AppError::Io(format!("Failed to create vibes directory: {e}")))?;

    let id = uuid::Uuid::new_v4().to_string();

    let params = EncodeVibeParams {
        image: ImageInput::FilePath(PathBuf::from(&req.image_path)),
        model,
        information_extracted: req.information_extracted,
        strength: 0.7,
        save: SaveTarget::Directory {
            dir: vibes_dir.to_string_lossy().to_string(),
            filename: Some(format!("{id}.naiv4vibe")),
        },
    };

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
