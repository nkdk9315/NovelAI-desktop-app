use tauri::State;

use crate::models::dto::{CreatePromptPresetRequest, PromptPresetDto, UpdatePromptPresetRequest};
use crate::state::AppState;

#[tauri::command]
pub fn list_prompt_presets(
    state: State<'_, AppState>,
    search: Option<String>,
) -> Result<Vec<PromptPresetDto>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::prompt_preset::list_prompt_presets(&conn, search.as_deref())
        .map_err(|e| e.into())
}

#[tauri::command]
pub fn get_prompt_preset(
    state: State<'_, AppState>,
    id: String,
) -> Result<PromptPresetDto, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::prompt_preset::get_prompt_preset(&conn, &id).map_err(|e| e.into())
}

#[tauri::command]
pub fn create_prompt_preset(
    state: State<'_, AppState>,
    req: CreatePromptPresetRequest,
) -> Result<PromptPresetDto, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::prompt_preset::create_prompt_preset(&conn, req).map_err(|e| e.into())
}

#[tauri::command]
pub fn update_prompt_preset(
    state: State<'_, AppState>,
    req: UpdatePromptPresetRequest,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::prompt_preset::update_prompt_preset(&conn, req).map_err(|e| e.into())
}

#[tauri::command]
pub fn delete_prompt_preset(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::prompt_preset::delete_prompt_preset(&conn, &id).map_err(|e| e.into())
}
