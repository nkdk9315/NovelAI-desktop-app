use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::VibeRow;

pub fn list_all(conn: &Connection) -> Result<Vec<VibeRow>, AppError> {
    let mut stmt = conn.prepare("SELECT id, name, file_path, model, created_at FROM vibes ORDER BY created_at DESC")?;
    let rows = stmt.query_map([], |row| {
        Ok(VibeRow {
            id: row.get(0)?,
            name: row.get(1)?,
            file_path: row.get(2)?,
            model: row.get(3)?,
            created_at: row.get(4)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.into())
}

pub fn find_by_id(conn: &Connection, id: &str) -> Result<VibeRow, AppError> {
    conn.query_row(
        "SELECT id, name, file_path, model, created_at FROM vibes WHERE id = ?1",
        [id],
        |row| {
            Ok(VibeRow {
                id: row.get(0)?,
                name: row.get(1)?,
                file_path: row.get(2)?,
                model: row.get(3)?,
                created_at: row.get(4)?,
            })
        },
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("vibe {id}")),
        _ => e.into(),
    })
}

pub fn insert(conn: &Connection, row: &VibeRow) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO vibes (id, name, file_path, model, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![row.id, row.name, row.file_path, row.model, row.created_at],
    )?;
    Ok(())
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM vibes WHERE id = ?1", [id])?;
    Ok(())
}
