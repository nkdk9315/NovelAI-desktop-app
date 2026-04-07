use tauri::State;

use crate::models::dto::{CreateProjectRequest, ProjectDto};
use crate::state::AppState;

#[tauri::command]
pub fn list_projects(state: State<'_, AppState>) -> Result<Vec<ProjectDto>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::project::list_projects(&conn).map_err(|e| e.into())
}

#[tauri::command]
pub fn create_project(
    state: State<'_, AppState>,
    req: CreateProjectRequest,
) -> Result<ProjectDto, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::project::create_project(&conn, req).map_err(|e| e.into())
}

#[tauri::command]
pub fn open_project(state: State<'_, AppState>, id: String) -> Result<ProjectDto, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::project::open_project(&conn, &id).map_err(|e| e.into())
}

#[tauri::command]
pub fn delete_project(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::project::delete_project(&conn, &id).map_err(|e| e.into())
}
