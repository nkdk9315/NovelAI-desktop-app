use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::GeneratedImageRow;

pub fn list_by_project(
    conn: &Connection,
    project_id: &str,
    saved_only: Option<bool>,
) -> Result<Vec<GeneratedImageRow>, AppError> {
    let sql = match saved_only {
        Some(true) => "SELECT id, project_id, file_path, seed, prompt_snapshot, width, height, model, is_saved, created_at FROM generated_images WHERE project_id = ?1 AND is_saved = 1 ORDER BY created_at DESC",
        _ => "SELECT id, project_id, file_path, seed, prompt_snapshot, width, height, model, is_saved, created_at FROM generated_images WHERE project_id = ?1 ORDER BY created_at DESC",
    };
    let mut stmt = conn.prepare(sql)?;
    let rows = stmt.query_map([project_id], |row| {
        Ok(GeneratedImageRow {
            id: row.get(0)?,
            project_id: row.get(1)?,
            file_path: row.get(2)?,
            seed: row.get(3)?,
            prompt_snapshot: row.get(4)?,
            width: row.get(5)?,
            height: row.get(6)?,
            model: row.get(7)?,
            is_saved: row.get(8)?,
            created_at: row.get(9)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.into())
}

pub fn find_by_id(conn: &Connection, id: &str) -> Result<GeneratedImageRow, AppError> {
    conn.query_row(
        "SELECT id, project_id, file_path, seed, prompt_snapshot, width, height, model, is_saved, created_at FROM generated_images WHERE id = ?1",
        [id],
        |row| {
            Ok(GeneratedImageRow {
                id: row.get(0)?,
                project_id: row.get(1)?,
                file_path: row.get(2)?,
                seed: row.get(3)?,
                prompt_snapshot: row.get(4)?,
                width: row.get(5)?,
                height: row.get(6)?,
                model: row.get(7)?,
                is_saved: row.get(8)?,
                created_at: row.get(9)?,
            })
        },
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("image {id}")),
        _ => e.into(),
    })
}

pub fn insert(conn: &Connection, row: &GeneratedImageRow) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO generated_images (id, project_id, file_path, seed, prompt_snapshot, width, height, model, is_saved, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![row.id, row.project_id, row.file_path, row.seed, row.prompt_snapshot, row.width, row.height, row.model, row.is_saved, row.created_at],
    )?;
    Ok(())
}

pub fn update_is_saved(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute("UPDATE generated_images SET is_saved = 1 WHERE id = ?1", [id])?;
    Ok(())
}

pub fn update_all_is_saved(conn: &Connection, project_id: &str) -> Result<(), AppError> {
    conn.execute("UPDATE generated_images SET is_saved = 1 WHERE project_id = ?1", [project_id])?;
    Ok(())
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM generated_images WHERE id = ?1", [id])?;
    Ok(())
}

pub fn delete_unsaved(conn: &Connection, project_id: &str) -> Result<Vec<String>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT file_path FROM generated_images WHERE project_id = ?1 AND is_saved = 0",
    )?;
    let paths: Vec<String> = stmt
        .query_map([project_id], |row| row.get(0))?
        .collect::<Result<Vec<_>, _>>()?;
    conn.execute(
        "DELETE FROM generated_images WHERE project_id = ?1 AND is_saved = 0",
        [project_id],
    )?;
    Ok(paths)
}
