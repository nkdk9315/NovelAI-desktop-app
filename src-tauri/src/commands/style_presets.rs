use tauri::State;

use crate::models::dto::{CreateStylePresetRequest, StylePresetDto, UpdateStylePresetRequest};
use crate::state::AppState;

#[tauri::command]
pub fn list_style_presets(state: State<'_, AppState>) -> Result<Vec<StylePresetDto>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::style_preset::list_style_presets(&conn).map_err(|e| e.into())
}

#[tauri::command]
pub fn create_style_preset(
    state: State<'_, AppState>,
    req: CreateStylePresetRequest,
) -> Result<StylePresetDto, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::style_preset::create_style_preset(&conn, req).map_err(|e| e.into())
}

#[tauri::command]
pub fn update_style_preset(
    state: State<'_, AppState>,
    req: UpdateStylePresetRequest,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::style_preset::update_style_preset(&conn, req).map_err(|e| e.into())
}

#[tauri::command]
pub fn delete_style_preset(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::style_preset::delete_style_preset(&conn, &id).map_err(|e| e.into())
}
