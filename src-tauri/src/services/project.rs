use std::path::PathBuf;

use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::{CreateProjectRequest, ProjectDto, ProjectRow, UpdateProjectRequest};

pub fn list_projects(
    conn: &Connection,
    search: Option<&str>,
    project_type: Option<&str>,
) -> Result<Vec<ProjectDto>, AppError> {
    let rows = crate::repositories::project::list_filtered(conn, search, project_type)?;
    Ok(rows.into_iter().map(ProjectDto::from).collect())
}

/// Sanitize a project name for use as a directory name.
fn sanitize_dir_name(name: &str) -> String {
    name.chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '-' || c == '_' || c == ' ' {
                c
            } else {
                '_'
            }
        })
        .collect::<String>()
        .trim()
        .to_string()
}

/// Compute the default project directory path.
pub fn default_project_dir(
    base_dir: &std::path::Path,
    project_type: &str,
    name: &str,
) -> PathBuf {
    base_dir
        .join("projects")
        .join(project_type)
        .join(sanitize_dir_name(name))
}

pub fn create_project(
    conn: &Connection,
    req: CreateProjectRequest,
    app_data_dir: &std::path::Path,
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

    let directory_path = match req.directory_path {
        Some(ref p) if !p.is_empty() => p.clone(),
        _ => default_project_dir(app_data_dir, &req.project_type, &name)
            .to_string_lossy()
            .to_string(),
    };

    let dir = std::path::Path::new(&directory_path);
    if !dir.exists() {
        std::fs::create_dir_all(dir)?;
    }
    let images_dir = dir.join("images");
    if !images_dir.exists() {
        std::fs::create_dir_all(&images_dir)?;
    }

    let now = chrono::Utc::now().to_rfc3339();
    let row = ProjectRow {
        id: uuid::Uuid::new_v4().to_string(),
        name,
        project_type: req.project_type,
        directory_path,
        created_at: now.clone(),
        updated_at: now,
        thumbnail_path: req.thumbnail_path,
    };
    crate::repositories::project::insert(conn, &row)?;
    Ok(ProjectDto::from(row))
}

pub fn update_project_thumbnail(
    conn: &Connection,
    id: &str,
    thumbnail_path: Option<&str>,
) -> Result<ProjectDto, AppError> {
    crate::repositories::project::update_thumbnail(conn, id, thumbnail_path)?;
    let row = crate::repositories::project::find_by_id(conn, id)?;
    Ok(ProjectDto::from(row))
}

pub fn update_project(
    conn: &Connection,
    req: UpdateProjectRequest,
) -> Result<ProjectDto, AppError> {
    crate::repositories::project::find_by_id(conn, &req.id)?;

    if let Some(ref name) = req.name {
        let trimmed = name.trim();
        if trimmed.is_empty() {
            return Err(AppError::Validation("project name is required".to_string()));
        }
        crate::repositories::project::update_name(conn, &req.id, trimmed)?;
    }

    if let Some(ref thumb) = req.thumbnail_path {
        crate::repositories::project::update_thumbnail(conn, &req.id, thumb.as_deref())?;
    }

    let row = crate::repositories::project::find_by_id(conn, &req.id)?;
    Ok(ProjectDto::from(row))
}

pub fn open_project(conn: &Connection, id: &str) -> Result<ProjectDto, AppError> {
    crate::services::image::cleanup_unsaved_images(conn, id)?;
    let row = crate::repositories::project::find_by_id(conn, id)?;
    Ok(ProjectDto::from(row))
}

pub fn delete_project(conn: &Connection, id: &str) -> Result<(), AppError> {
    crate::repositories::project::delete(conn, id)?;
    Ok(())
}

#[cfg(test)]
#[path = "project_tests.rs"]
mod tests;
