use tauri::State;

use crate::models::dto::{CreatePromptGroupRequest, PromptGroupDto, UpdatePromptGroupRequest};
use crate::state::AppState;

#[tauri::command]
pub fn list_prompt_groups(
    state: State<'_, AppState>,
    genre_id: Option<String>,
    usage_type: Option<String>,
    search: Option<String>,
) -> Result<Vec<PromptGroupDto>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::prompt_group::list_prompt_groups(
        &conn,
        genre_id.as_deref(),
        usage_type.as_deref(),
        search.as_deref(),
    )
    .map_err(|e| e.into())
}

#[tauri::command]
pub fn get_prompt_group(
    state: State<'_, AppState>,
    id: String,
) -> Result<PromptGroupDto, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::prompt_group::get_prompt_group(&conn, &id).map_err(|e| e.into())
}

#[tauri::command]
pub fn create_prompt_group(
    state: State<'_, AppState>,
    req: CreatePromptGroupRequest,
) -> Result<PromptGroupDto, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::prompt_group::create_prompt_group(&conn, req).map_err(|e| e.into())
}

#[tauri::command]
pub fn update_prompt_group(
    state: State<'_, AppState>,
    req: UpdatePromptGroupRequest,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::prompt_group::update_prompt_group(&conn, req).map_err(|e| e.into())
}

#[tauri::command]
pub fn delete_prompt_group(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::prompt_group::delete_prompt_group(&conn, &id).map_err(|e| e.into())
}
