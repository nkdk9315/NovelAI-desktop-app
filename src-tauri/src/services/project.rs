use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::{CreateProjectRequest, ProjectDto};

pub fn list_projects(conn: &Connection) -> Result<Vec<ProjectDto>, AppError> {
    let rows = crate::repositories::project::list_all(conn)?;
    Ok(rows.into_iter().map(ProjectDto::from).collect())
}

pub fn create_project(
    _conn: &Connection,
    _req: CreateProjectRequest,
) -> Result<ProjectDto, AppError> {
    todo!()
}

pub fn open_project(_conn: &Connection, _id: &str) -> Result<ProjectDto, AppError> {
    todo!()
}

pub fn delete_project(_conn: &Connection, _id: &str) -> Result<(), AppError> {
    todo!()
}
