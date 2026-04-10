use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::ProjectRow;

pub fn find_by_id(conn: &Connection, id: &str) -> Result<ProjectRow, AppError> {
    conn.query_row(
        "SELECT id, name, project_type, directory_path, created_at, updated_at, thumbnail_path FROM projects WHERE id = ?1",
        [id],
        |row| {
            Ok(ProjectRow {
                id: row.get(0)?,
                name: row.get(1)?,
                project_type: row.get(2)?,
                directory_path: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                thumbnail_path: row.get(6)?,
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
        "INSERT INTO projects (id, name, project_type, directory_path, created_at, updated_at, thumbnail_path) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![row.id, row.name, row.project_type, row.directory_path, row.created_at, row.updated_at, row.thumbnail_path],
    )?;
    Ok(())
}

pub fn list_filtered(
    conn: &Connection,
    search: Option<&str>,
    project_type: Option<&str>,
) -> Result<Vec<ProjectRow>, AppError> {
    let mut sql = String::from(
        "SELECT id, name, project_type, directory_path, created_at, updated_at, thumbnail_path FROM projects WHERE 1=1",
    );
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(s) = search {
        if !s.is_empty() {
            sql.push_str(" AND name LIKE ?");
            params.push(Box::new(format!("%{s}%")));
        }
    }
    if let Some(pt) = project_type {
        if !pt.is_empty() {
            sql.push_str(" AND project_type = ?");
            params.push(Box::new(pt.to_string()));
        }
    }
    sql.push_str(" ORDER BY created_at DESC");

    let mut stmt = conn.prepare(&sql)?;
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let rows = stmt.query_map(param_refs.as_slice(), |row| {
        Ok(ProjectRow {
            id: row.get(0)?,
            name: row.get(1)?,
            project_type: row.get(2)?,
            directory_path: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
            thumbnail_path: row.get(6)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.into())
}

pub fn update_thumbnail(
    conn: &Connection,
    id: &str,
    thumbnail_path: Option<&str>,
) -> Result<(), AppError> {
    let updated = conn.execute(
        "UPDATE projects SET thumbnail_path = ?1, updated_at = ?2 WHERE id = ?3",
        rusqlite::params![thumbnail_path, chrono::Utc::now().to_rfc3339(), id],
    )?;
    if updated == 0 {
        return Err(AppError::NotFound(format!("project {id}")));
    }
    Ok(())
}

pub fn update_name(conn: &Connection, id: &str, name: &str) -> Result<(), AppError> {
    let updated = conn.execute(
        "UPDATE projects SET name = ?1, updated_at = ?2 WHERE id = ?3",
        rusqlite::params![name, chrono::Utc::now().to_rfc3339(), id],
    )?;
    if updated == 0 {
        return Err(AppError::NotFound(format!("project {id}")));
    }
    Ok(())
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM projects WHERE id = ?1", [id])?;
    Ok(())
}

#[cfg(test)]
#[path = "project_tests.rs"]
mod tests;
