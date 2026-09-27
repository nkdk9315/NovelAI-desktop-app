use tauri::State;

use crate::models::dto::{
    AugmentImageRequest, ImageDataDto, ImageMetadataDto, ImageToolResponse, SaveTypesetRequest, UpscaleImageRequest,
};
use crate::state::AppState;

#[tauri::command]
pub async fn augment_image(
    state: State<'_, AppState>,
    req: AugmentImageRequest,
) -> Result<ImageToolResponse, String> {
    crate::services::image_tools::augment_image(&state.db, &state.api_client, req)
        .await
        .map_err(|e| e.into())
}

#[tauri::command]
pub async fn upscale_image(
    state: State<'_, AppState>,
    req: UpscaleImageRequest,
) -> Result<ImageToolResponse, String> {
    crate::services::image_tools::upscale_image(&state.db, &state.api_client, req)
        .await
        .map_err(|e| e.into())
}

/// Add an image typeset in the app (text drawn over a history image) to the history.
#[tauri::command]
pub fn save_typeset_image(state: State<'_, AppState>, req: SaveTypesetRequest) -> Result<ImageToolResponse, String> {
    crate::services::image_tools::save_typeset(&state.db, req).map_err(|e| e.into())
}

/// Bytes of a history image (for the canvas editor / character reference).
#[tauri::command]
pub fn get_image_data(state: State<'_, AppState>, image_id: String) -> Result<ImageDataDto, String> {
    crate::services::image_output::read_history_image(&state.db, &image_id)
        .and_then(|bytes| crate::services::image_output::to_image_data(&bytes))
        .map_err(|e| e.into())
}

/// Bytes of a user-picked image file (drag & drop / file dialog).
#[tauri::command]
pub fn read_image_file(path: String) -> Result<ImageDataDto, String> {
    crate::services::image_output::read_image_file(&path)
        .and_then(|bytes| crate::services::image_output::to_image_data(&bytes))
        .map_err(|e| e.into())
}

/// NovelAI generation metadata of a dropped image file (None when it has none).
#[tauri::command]
pub fn read_image_metadata(path: String) -> Result<Option<ImageMetadataDto>, String> {
    crate::services::image_metadata::read_file_metadata(&path).map_err(|e| e.into())
}
