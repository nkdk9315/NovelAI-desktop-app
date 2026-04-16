use tauri::State;

use crate::models::dto::{SetSystemGroupGenreDefaultsRequest, SystemGroupGenreDefaultDto};
use crate::state::AppState;

#[tauri::command]
pub fn get_system_group_genre_defaults(
    state: State<'_, AppState>,
    system_group_id: String,
) -> Result<Vec<SystemGroupGenreDefaultDto>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::system_group_settings::get_defaults(&conn, &system_group_id)
        .map_err(|e| e.into())
}

#[tauri::command]
pub fn set_system_group_genre_defaults(
    state: State<'_, AppState>,
    req: SetSystemGroupGenreDefaultsRequest,
) -> Result<(), String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::system_group_settings::set_defaults(
        &mut conn,
        &req.system_group_id,
        req.entries,
    )
    .map_err(|e| e.into())
}

#[tauri::command]
pub fn list_default_system_groups_for_genre(
    state: State<'_, AppState>,
    genre_id: String,
) -> Result<Vec<String>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::system_group_settings::list_default_groups_for_genre(&conn, &genre_id)
        .map_err(|e| e.into())
}
