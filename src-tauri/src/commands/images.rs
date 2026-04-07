use tauri::State;

use crate::models::dto::{
    CostEstimateRequest, CostResultDto, GenerateImageRequest, GenerateImageResponse,
    GeneratedImageDto,
};
use crate::state::AppState;

#[tauri::command]
pub async fn generate_image(
    state: State<'_, AppState>,
    req: GenerateImageRequest,
) -> Result<GenerateImageResponse, String> {
    crate::services::generation::generate_image(&state.db, &state.api_client, req)
        .await
        .map_err(|e| e.into())
}

#[tauri::command]
pub fn estimate_cost(req: CostEstimateRequest) -> Result<CostResultDto, String> {
    crate::services::generation::estimate_cost(req).map_err(|e| e.into())
}

#[tauri::command]
pub fn save_image(state: State<'_, AppState>, image_id: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::image::save_image(&conn, &image_id).map_err(|e| e.into())
}

#[tauri::command]
pub fn save_all_images(state: State<'_, AppState>, project_id: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::image::save_all_images(&conn, &project_id).map_err(|e| e.into())
}

#[tauri::command]
pub fn delete_image(state: State<'_, AppState>, image_id: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::image::delete_image(&conn, &image_id).map_err(|e| e.into())
}

#[tauri::command]
pub fn get_project_images(
    state: State<'_, AppState>,
    project_id: String,
    saved_only: Option<bool>,
) -> Result<Vec<GeneratedImageDto>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::image::get_project_images(&conn, &project_id, saved_only)
        .map_err(|e| e.into())
}

#[tauri::command]
pub fn cleanup_unsaved_images(
    state: State<'_, AppState>,
    project_id: String,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::image::cleanup_unsaved_images(&conn, &project_id).map_err(|e| e.into())
}
