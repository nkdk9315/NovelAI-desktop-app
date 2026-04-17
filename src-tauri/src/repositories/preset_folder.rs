use rusqlite::{Connection, params};

use crate::error::AppError;
use crate::models::dto::PresetFolderRow;

fn map_row(row: &rusqlite::Row) -> rusqlite::Result<PresetFolderRow> {
    Ok(PresetFolderRow {
        id: row.get(0)?,
        title: row.get(1)?,
        parent_id: row.get(2)?,
        sort_key: row.get(3)?,
    })
}

#[allow(dead_code)]
pub fn list_roots(conn: &Connection) -> Result<Vec<PresetFolderRow>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, title, parent_id, sort_key
         FROM preset_folders WHERE parent_id IS NULL
         ORDER BY sort_key, title",
    )?;
    let rows = stmt.query_map([], map_row)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

#[allow(dead_code)]
pub fn list_children(
    conn: &Connection,
    parent_id: i64,
) -> Result<Vec<PresetFolderRow>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, title, parent_id, sort_key
         FROM preset_folders WHERE parent_id = ?1
         ORDER BY sort_key, title",
    )?;
    let rows = stmt.query_map([parent_id], map_row)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

pub fn list_all(conn: &Connection) -> Result<Vec<PresetFolderRow>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, title, parent_id, sort_key FROM preset_folders ORDER BY sort_key, title",
    )?;
    let rows = stmt.query_map([], map_row)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

pub fn find_by_id(conn: &Connection, id: i64) -> Result<PresetFolderRow, AppError> {
    conn.query_row(
        "SELECT id, title, parent_id, sort_key FROM preset_folders WHERE id = ?1",
        [id],
        map_row,
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => {
            AppError::NotFound(format!("preset_folder {id}"))
        }
        _ => e.into(),
    })
}

pub fn next_sort_key(conn: &Connection, parent_id: Option<i64>) -> Result<i64, AppError> {
    let max: Option<i64> = match parent_id {
        Some(p) => conn.query_row(
            "SELECT MAX(sort_key) FROM preset_folders WHERE parent_id = ?1",
            [p],
            |r| r.get(0),
        )?,
        None => conn.query_row(
            "SELECT MAX(sort_key) FROM preset_folders WHERE parent_id IS NULL",
            [],
            |r| r.get(0),
        )?,
    };
    Ok(max.unwrap_or(-1) + 1)
}

pub fn insert(conn: &Connection, parent_id: Option<i64>, title: &str) -> Result<i64, AppError> {
    if title.trim().is_empty() {
        return Err(AppError::Validation("folder title must not be empty".into()));
    }
    let now = chrono::Utc::now().to_rfc3339();
    let sort_key = next_sort_key(conn, parent_id)?;
    conn.execute(
        "INSERT INTO preset_folders (title, parent_id, sort_key, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?4)",
        params![title.trim(), parent_id, sort_key, now],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn update_title(conn: &Connection, id: i64, title: &str) -> Result<(), AppError> {
    if title.trim().is_empty() {
        return Err(AppError::Validation("folder title must not be empty".into()));
    }
    let now = chrono::Utc::now().to_rfc3339();
    let affected = conn.execute(
        "UPDATE preset_folders SET title = ?2, updated_at = ?3 WHERE id = ?1",
        params![id, title.trim(), now],
    )?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("preset_folder {id}")));
    }
    Ok(())
}

pub fn move_to(conn: &Connection, id: i64, new_parent_id: Option<i64>) -> Result<(), AppError> {
    if let Some(mut cursor) = new_parent_id {
        if cursor == id {
            return Err(AppError::Validation("cannot move a folder into itself".into()));
        }
        loop {
            let parent: Option<i64> = conn
                .query_row(
                    "SELECT parent_id FROM preset_folders WHERE id = ?1",
                    [cursor],
                    |r| r.get(0),
                )
                .map_err(|e| match e {
                    rusqlite::Error::QueryReturnedNoRows => {
                        AppError::NotFound(format!("preset_folder {cursor}"))
                    }
                    _ => e.into(),
                })?;
            match parent {
                None => break,
                Some(p) if p == id => {
                    return Err(AppError::Validation(
                        "cannot move a folder into its own descendant".into(),
                    ));
                }
                Some(p) => cursor = p,
            }
        }
    }
    let now = chrono::Utc::now().to_rfc3339();
    let affected = conn.execute(
        "UPDATE preset_folders SET parent_id = ?2, updated_at = ?3 WHERE id = ?1",
        params![id, new_parent_id, now],
    )?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("preset_folder {id}")));
    }
    Ok(())
}

pub fn delete(conn: &Connection, id: i64) -> Result<(), AppError> {
    let affected = conn.execute("DELETE FROM preset_folders WHERE id = ?1", [id])?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("preset_folder {id}")));
    }
    Ok(())
}
