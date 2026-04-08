use tauri::{Manager, State};

use crate::models::dto::{AddVibeRequest, EncodeVibeRequest, VibeDto};
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
pub async fn encode_vibe(
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
    req: EncodeVibeRequest,
) -> Result<VibeDto, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    crate::services::vibe::encode_vibe(&state.db, &state.api_client, &app_data_dir, req)
        .await
        .map_err(|e| e.into())
}
