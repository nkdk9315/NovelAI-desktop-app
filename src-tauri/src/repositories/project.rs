use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::ProjectRow;

pub fn list_all(conn: &Connection) -> Result<Vec<ProjectRow>, AppError> {
    let mut stmt = conn.prepare("SELECT id, name, project_type, directory_path, created_at, updated_at FROM projects ORDER BY created_at DESC")?;
    let rows = stmt.query_map([], |row| {
        Ok(ProjectRow {
            id: row.get(0)?,
            name: row.get(1)?,
            project_type: row.get(2)?,
            directory_path: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.into())
}

pub fn find_by_id(conn: &Connection, id: &str) -> Result<ProjectRow, AppError> {
    conn.query_row(
        "SELECT id, name, project_type, directory_path, created_at, updated_at FROM projects WHERE id = ?1",
        [id],
        |row| {
            Ok(ProjectRow {
                id: row.get(0)?,
                name: row.get(1)?,
                project_type: row.get(2)?,
                directory_path: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        },
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("project {id}")),
        _ => e.into(),
    })
}

pub fn insert(conn: &Connection, row: &ProjectRow) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO projects (id, name, project_type, directory_path, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![row.id, row.name, row.project_type, row.directory_path, row.created_at, row.updated_at],
    )?;
    Ok(())
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM projects WHERE id = ?1", [id])?;
    Ok(())
}
