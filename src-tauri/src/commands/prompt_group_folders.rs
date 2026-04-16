use tauri::State;

use crate::error::AppError;
use crate::models::dto::PromptGroupFolderDto;
use crate::services::prompt_group_folder as svc;
use crate::state::AppState;

fn lock_db<'a>(
    state: &'a State<'_, AppState>,
) -> Result<std::sync::MutexGuard<'a, rusqlite::Connection>, AppError> {
    state
        .db
        .lock()
        .map_err(|e| AppError::Database(format!("db mutex poisoned: {e}")))
}

#[tauri::command]
pub fn list_prompt_group_folders(
    state: State<'_, AppState>,
) -> Result<Vec<PromptGroupFolderDto>, String> {
    let conn = lock_db(&state)?;
    svc::list_all(&conn).map_err(Into::into)
}

#[tauri::command]
pub fn create_prompt_group_folder(
    state: State<'_, AppState>,
    title: String,
    parent_id: Option<i64>,
) -> Result<PromptGroupFolderDto, String> {
    let conn = lock_db(&state)?;
    svc::create(&conn, parent_id, &title).map_err(Into::into)
}

#[tauri::command]
pub fn rename_prompt_group_folder(
    state: State<'_, AppState>,
    folder_id: i64,
    title: String,
) -> Result<(), String> {
    let conn = lock_db(&state)?;
    svc::rename(&conn, folder_id, &title).map_err(Into::into)
}

#[tauri::command]
pub fn move_prompt_group_folder(
    state: State<'_, AppState>,
    folder_id: i64,
    new_parent_id: Option<i64>,
) -> Result<(), String> {
    let conn = lock_db(&state)?;
    svc::move_folder(&conn, folder_id, new_parent_id).map_err(Into::into)
}

#[tauri::command]
pub fn delete_prompt_group_folder(
    state: State<'_, AppState>,
    folder_id: i64,
) -> Result<(), String> {
    let conn = lock_db(&state)?;
    svc::delete(&conn, folder_id).map_err(Into::into)
}

#[tauri::command]
pub fn delete_prompt_groups_in_folder(
    state: State<'_, AppState>,
    folder_id: i64,
) -> Result<usize, String> {
    let conn = lock_db(&state)?;
    svc::delete_groups_in_folder(&conn, folder_id).map_err(Into::into)
}

#[tauri::command]
pub fn count_prompt_groups_in_folder(
    state: State<'_, AppState>,
    folder_id: i64,
) -> Result<i64, String> {
    let conn = lock_db(&state)?;
    svc::count_groups_in_subtree(&conn, folder_id).map_err(Into::into)
}

#[tauri::command]
pub fn set_prompt_group_folder(
    state: State<'_, AppState>,
    group_id: String,
    folder_id: Option<i64>,
) -> Result<(), String> {
    let conn = lock_db(&state)?;
    svc::set_group_folder(&conn, &group_id, folder_id).map_err(Into::into)
}
