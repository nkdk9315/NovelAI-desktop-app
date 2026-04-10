use tauri::{Manager, State};

use crate::models::dto::{CreateStylePresetRequest, StylePresetDto, UpdatePresetThumbnailRequest, UpdateStylePresetRequest};
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

#[tauri::command]
pub fn toggle_preset_favorite(
    state: State<'_, AppState>,
    id: String,
) -> Result<StylePresetDto, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::style_preset::toggle_preset_favorite(&conn, &id).map_err(|e| e.into())
}

#[tauri::command]
pub fn update_preset_thumbnail(
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
    req: UpdatePresetThumbnailRequest,
) -> Result<StylePresetDto, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let app_data_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    crate::services::style_preset::update_preset_thumbnail(&conn, &app_data_dir, &req.id, &req.thumbnail_path)
        .map_err(|e| e.into())
}

#[tauri::command]
pub fn clear_preset_thumbnail(
    state: State<'_, AppState>,
    id: String,
) -> Result<StylePresetDto, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::style_preset::clear_preset_thumbnail(&conn, &id).map_err(|e| e.into())
}
