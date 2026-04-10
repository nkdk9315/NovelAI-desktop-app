use tauri::{Manager, State};

use crate::models::dto::{
    AddVibeRequest, EncodeVibeRequest, ProjectVibeDto, UpdateVibeNameRequest,
    UpdateVibeThumbnailRequest, VibeDto,
};
use crate::state::AppState;

#[tauri::command]
pub fn list_vibes(state: State<'_, AppState>) -> Result<Vec<VibeDto>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::vibe::list_vibes(&conn).map_err(|e| e.into())
}

#[tauri::command]
pub fn add_vibe(
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
    req: AddVibeRequest,
) -> Result<VibeDto, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    crate::services::vibe::add_vibe(&conn, &app_data_dir, req).map_err(|e| e.into())
}

#[tauri::command]
pub fn delete_vibe(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::vibe::delete_vibe(&conn, &id).map_err(|e| e.into())
}

#[tauri::command]
pub fn update_vibe_name(
    state: State<'_, AppState>,
    req: UpdateVibeNameRequest,
) -> Result<VibeDto, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::vibe::update_vibe_name(&conn, &req.id, &req.name).map_err(|e| e.into())
}

#[tauri::command]
pub fn update_vibe_thumbnail(
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
    req: UpdateVibeThumbnailRequest,
) -> Result<VibeDto, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    crate::services::vibe::update_vibe_thumbnail(&conn, &app_data_dir, &req.id, &req.thumbnail_path)
        .map_err(|e| e.into())
}

#[tauri::command]
pub fn toggle_vibe_favorite(
    state: State<'_, AppState>,
    id: String,
) -> Result<VibeDto, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::vibe::toggle_vibe_favorite(&conn, &id).map_err(|e| e.into())
}

#[tauri::command]
pub fn export_vibe(
    state: State<'_, AppState>,
    id: String,
    dest_path: String,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::vibe::export_vibe(&conn, &id, &dest_path).map_err(|e| e.into())
}

#[tauri::command]
pub fn clear_vibe_thumbnail(
    state: State<'_, AppState>,
    id: String,
) -> Result<VibeDto, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::vibe::clear_vibe_thumbnail(&conn, &id).map_err(|e| e.into())
}

#[tauri::command]
pub async fn encode_vibe(
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
    req: EncodeVibeRequest,
) -> Result<VibeDto, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    crate::services::vibe_encode::encode_vibe(&state.db, &state.api_client, &app_data_dir, req)
        .await
        .map_err(|e| e.into())
}

#[tauri::command]
pub fn add_vibe_to_project(
    state: State<'_, AppState>,
    project_id: String,
    vibe_id: String,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::project_vibe::add_vibe_to_project(&conn, &project_id, &vibe_id)
        .map_err(|e| e.into())
}

#[tauri::command]
pub fn remove_vibe_from_project(
    state: State<'_, AppState>,
    project_id: String,
    vibe_id: String,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::project_vibe::remove_vibe_from_project(&conn, &project_id, &vibe_id)
        .map_err(|e| e.into())
}

#[tauri::command]
pub fn set_vibe_visibility(
    state: State<'_, AppState>,
    project_id: String,
    vibe_id: String,
    is_visible: bool,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::project_vibe::set_vibe_visibility(&conn, &project_id, &vibe_id, is_visible)
        .map_err(|e| e.into())
}

#[tauri::command]
pub fn list_project_vibes(
    state: State<'_, AppState>,
    project_id: String,
) -> Result<Vec<VibeDto>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::project_vibe::list_project_vibes(&conn, &project_id).map_err(|e| e.into())
}

#[tauri::command]
pub fn list_project_vibes_all(
    state: State<'_, AppState>,
    project_id: String,
) -> Result<Vec<ProjectVibeDto>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::project_vibe::list_project_vibes_all(&conn, &project_id)
        .map_err(|e| e.into())
}
