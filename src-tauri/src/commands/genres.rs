use tauri::State;

use crate::models::dto::{CreateGenreRequest, GenreDto};
use crate::state::AppState;

#[tauri::command]
pub fn list_genres(state: State<'_, AppState>) -> Result<Vec<GenreDto>, String> {
    let conn = state.db.lock().unwrap();
    crate::services::genre::list_genres(&conn).map_err(|e| e.into())
}

#[tauri::command]
pub fn create_genre(
    state: State<'_, AppState>,
    req: CreateGenreRequest,
) -> Result<GenreDto, String> {
    let conn = state.db.lock().unwrap();
    crate::services::genre::create_genre(&conn, req).map_err(|e| e.into())
}

#[tauri::command]
pub fn delete_genre(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    crate::services::genre::delete_genre(&conn, &id).map_err(|e| e.into())
}
