use tauri::State;

use crate::error::AppError;
use crate::models::dto::{AssetFolderDto, CountByIdDto};
use crate::services::style_preset_folder as svc;
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
pub fn list_style_preset_folder_roots(
    state: State<'_, AppState>,
) -> Result<Vec<AssetFolderDto>, String> {
    let conn = lock_db(&state)?;
    svc::list_roots(&conn).map_err(Into::into)
}

#[tauri::command]
pub fn list_style_preset_folder_children(
    state: State<'_, AppState>,
    parent_id: i64,
) -> Result<Vec<AssetFolderDto>, String> {
    let conn = lock_db(&state)?;
    svc::list_children(&conn, parent_id).map_err(Into::into)
}

#[tauri::command]
pub fn create_style_preset_folder(
    state: State<'_, AppState>,
    parent_id: Option<i64>,
    title: String,
) -> Result<AssetFolderDto, String> {
    let conn = lock_db(&state)?;
    svc::create(&conn, parent_id, &title).map_err(Into::into)
}

#[tauri::command]
pub fn rename_style_preset_folder(
    state: State<'_, AppState>,
    folder_id: i64,
    title: String,
) -> Result<(), String> {
    let conn = lock_db(&state)?;
    svc::rename(&conn, folder_id, &title).map_err(Into::into)
}

#[tauri::command]
pub fn move_style_preset_folder(
    state: State<'_, AppState>,
    folder_id: i64,
    new_parent_id: Option<i64>,
) -> Result<(), String> {
    let conn = lock_db(&state)?;
    svc::move_folder(&conn, folder_id, new_parent_id).map_err(Into::into)
}

#[tauri::command]
pub fn delete_style_preset_folder(
    state: State<'_, AppState>,
    folder_id: i64,
) -> Result<(), String> {
    let conn = lock_db(&state)?;
    svc::delete(&conn, folder_id).map_err(Into::into)
}

#[tauri::command]
pub fn set_style_preset_folder(
    state: State<'_, AppState>,
    preset_id: String,
    folder_id: Option<i64>,
) -> Result<(), String> {
    let conn = lock_db(&state)?;
    svc::set_preset_folder(&conn, &preset_id, folder_id).map_err(Into::into)
}

#[tauri::command]
pub fn count_style_presets_per_folder(
    state: State<'_, AppState>,
) -> Result<Vec<CountByIdDto>, String> {
    let conn = lock_db(&state)?;
    svc::count_presets_per_folder(&conn).map_err(Into::into)
}
