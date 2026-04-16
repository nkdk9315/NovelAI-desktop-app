use tauri::State;

use crate::models::dto::{CreatePromptGroupRequest, PromptGroupDto, UpdatePromptGroupRequest};
use crate::state::AppState;

#[tauri::command]
pub fn list_prompt_groups(
    state: State<'_, AppState>,
    search: Option<String>,
) -> Result<Vec<PromptGroupDto>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::prompt_group::list_prompt_groups(&conn, search.as_deref())
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
pub fn update_prompt_group_thumbnail(
    state: State<'_, AppState>,
    id: String,
    thumbnail_path: Option<String>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::prompt_group::update_prompt_group_thumbnail(
        &conn,
        &id,
        thumbnail_path.as_deref(),
    )
    .map_err(|e| e.into())
}

#[tauri::command]
pub fn delete_prompt_group(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::prompt_group::delete_prompt_group(&conn, &id).map_err(|e| e.into())
}

#[tauri::command]
pub fn list_prompt_group_default_genres(
    state: State<'_, AppState>,
    group_id: String,
) -> Result<Vec<String>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::prompt_group::list_default_genres(&conn, &group_id).map_err(|e| e.into())
}

#[tauri::command]
pub fn set_prompt_group_default_genres(
    state: State<'_, AppState>,
    group_id: String,
    genre_ids: Vec<String>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::prompt_group::set_default_genres(&conn, &group_id, &genre_ids)
        .map_err(|e| e.into())
}
