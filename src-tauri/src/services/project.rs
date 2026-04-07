use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::{CreateProjectRequest, ProjectDto, ProjectRow};

pub fn list_projects(conn: &Connection) -> Result<Vec<ProjectDto>, AppError> {
    let rows = crate::repositories::project::list_all(conn)?;
    Ok(rows.into_iter().map(ProjectDto::from).collect())
}

pub fn create_project(
    conn: &Connection,
    req: CreateProjectRequest,
) -> Result<ProjectDto, AppError> {
    let name = req.name.trim().to_string();
    if name.is_empty() {
        return Err(AppError::Validation("project name is required".to_string()));
    }
    let valid_types = ["simple", "manga", "cg"];
    if !valid_types.contains(&req.project_type.as_str()) {
        return Err(AppError::Validation(format!(
            "invalid project_type: {}",
            req.project_type
        )));
    }

    let dir = std::path::Path::new(&req.directory_path);
    if !dir.exists() {
        std::fs::create_dir_all(dir)?;
    }

    let now = chrono::Utc::now().to_rfc3339();
    let row = ProjectRow {
        id: uuid::Uuid::new_v4().to_string(),
        name,
        project_type: req.project_type,
        directory_path: req.directory_path,
        created_at: now.clone(),
        updated_at: now,
    };
    crate::repositories::project::insert(conn, &row)?;
    Ok(ProjectDto::from(row))
}

pub fn open_project(conn: &Connection, id: &str) -> Result<ProjectDto, AppError> {
    let row = crate::repositories::project::find_by_id(conn, id)?;
    // Clean up unsaved images
    let paths = crate::repositories::image::delete_unsaved(conn, id)?;
    for path in paths {
        let _ = std::fs::remove_file(&path);
    }
    Ok(ProjectDto::from(row))
}

pub fn delete_project(conn: &Connection, id: &str) -> Result<(), AppError> {
    crate::repositories::project::delete(conn, id)?;
    Ok(())
}
