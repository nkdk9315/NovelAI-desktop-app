use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::GenreRow;

pub fn list_all(conn: &Connection) -> Result<Vec<GenreRow>, AppError> {
    let mut stmt = conn.prepare("SELECT id, name, is_system, sort_order, created_at FROM genres ORDER BY sort_order ASC")?;
    let rows = stmt.query_map([], |row| {
        Ok(GenreRow {
            id: row.get(0)?,
            name: row.get(1)?,
            is_system: row.get(2)?,
            sort_order: row.get(3)?,
            created_at: row.get(4)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.into())
}

pub fn find_by_id(conn: &Connection, id: &str) -> Result<GenreRow, AppError> {
    conn.query_row(
        "SELECT id, name, is_system, sort_order, created_at FROM genres WHERE id = ?1",
        [id],
        |row| {
            Ok(GenreRow {
                id: row.get(0)?,
                name: row.get(1)?,
                is_system: row.get(2)?,
                sort_order: row.get(3)?,
                created_at: row.get(4)?,
            })
        },
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("genre {id}")),
        _ => e.into(),
    })
}

pub fn insert(conn: &Connection, row: &GenreRow) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO genres (id, name, is_system, sort_order, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![row.id, row.name, row.is_system, row.sort_order, row.created_at],
    )?;
    Ok(())
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM genres WHERE id = ?1", [id])?;
    Ok(())
}
