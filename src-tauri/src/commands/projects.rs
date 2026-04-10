use tauri::State;

use crate::models::dto::{CreateProjectRequest, ProjectDto, UpdateProjectRequest};
use crate::state::AppState;

#[tauri::command]
pub fn list_projects(
    state: State<'_, AppState>,
    search: Option<String>,
    project_type: Option<String>,
) -> Result<Vec<ProjectDto>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::project::list_projects(
        &conn,
        search.as_deref(),
        project_type.as_deref(),
    )
    .map_err(|e| e.into())
}

#[tauri::command]
pub fn create_project(
    state: State<'_, AppState>,
    req: CreateProjectRequest,
) -> Result<ProjectDto, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::project::create_project(&conn, req, &state.app_data_dir)
        .map_err(|e| e.into())
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

#[tauri::command]
pub fn update_project(
    state: State<'_, AppState>,
    req: UpdateProjectRequest,
) -> Result<ProjectDto, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::project::update_project(&conn, req).map_err(|e| e.into())
}

#[tauri::command]
pub fn update_project_thumbnail(
    state: State<'_, AppState>,
    id: String,
    thumbnail_path: Option<String>,
) -> Result<ProjectDto, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::project::update_project_thumbnail(&conn, &id, thumbnail_path.as_deref())
        .map_err(|e| e.into())
}

#[tauri::command]
pub fn get_default_project_dir(
    state: State<'_, AppState>,
    project_type: String,
    name: String,
) -> Result<String, String> {
    let path = crate::services::project::default_project_dir(
        &state.app_data_dir,
        &project_type,
        &name,
    );
    Ok(path.to_string_lossy().to_string())
}
