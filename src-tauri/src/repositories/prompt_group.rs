use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::{PromptGroupRow, PromptGroupTagRow};

pub fn list(
    conn: &Connection,
    genre_id: Option<&str>,
    usage_type: Option<&str>,
    search: Option<&str>,
) -> Result<Vec<PromptGroupRow>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, genre_id, is_default_for_genre, is_system, usage_type, created_at, updated_at FROM prompt_groups WHERE (?1 IS NULL OR genre_id = ?1) AND (?2 IS NULL OR usage_type = ?2) AND (?3 IS NULL OR name LIKE '%' || ?3 || '%') ORDER BY created_at DESC",
    )?;
    let rows = stmt.query_map(rusqlite::params![genre_id, usage_type, search], |row| {
        Ok(PromptGroupRow {
            id: row.get(0)?,
            name: row.get(1)?,
            genre_id: row.get(2)?,
            is_default_for_genre: row.get(3)?,
            is_system: row.get(4)?,
            usage_type: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.into())
}

pub fn find_by_id(conn: &Connection, id: &str) -> Result<PromptGroupRow, AppError> {
    conn.query_row(
        "SELECT id, name, genre_id, is_default_for_genre, is_system, usage_type, created_at, updated_at FROM prompt_groups WHERE id = ?1",
        [id],
        |row| {
            Ok(PromptGroupRow {
                id: row.get(0)?,
                name: row.get(1)?,
                genre_id: row.get(2)?,
                is_default_for_genre: row.get(3)?,
                is_system: row.get(4)?,
                usage_type: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        },
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("prompt_group {id}")),
        _ => e.into(),
    })
}

pub fn insert(conn: &Connection, row: &PromptGroupRow) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO prompt_groups (id, name, genre_id, is_default_for_genre, is_system, usage_type, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![row.id, row.name, row.genre_id, row.is_default_for_genre, row.is_system, row.usage_type, row.created_at, row.updated_at],
    )?;
    Ok(())
}

pub fn update(conn: &Connection, row: &PromptGroupRow) -> Result<(), AppError> {
    conn.execute(
        "UPDATE prompt_groups SET name = ?2, genre_id = ?3, is_default_for_genre = ?4, usage_type = ?5, updated_at = ?6 WHERE id = ?1",
        rusqlite::params![row.id, row.name, row.genre_id, row.is_default_for_genre, row.usage_type, row.updated_at],
    )?;
    Ok(())
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM prompt_groups WHERE id = ?1", [id])?;
    Ok(())
}

pub fn clear_default_for_genre(
    conn: &Connection,
    genre_id: &str,
    except_id: &str,
) -> Result<(), AppError> {
    conn.execute(
        "UPDATE prompt_groups SET is_default_for_genre = 0 WHERE genre_id = ?1 AND id != ?2",
        rusqlite::params![genre_id, except_id],
    )?;
    Ok(())
}

pub fn find_tags_by_group(
    conn: &Connection,
    prompt_group_id: &str,
) -> Result<Vec<PromptGroupTagRow>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, prompt_group_id, tag, sort_order FROM prompt_group_tags WHERE prompt_group_id = ?1 ORDER BY sort_order ASC",
    )?;
    let rows = stmt.query_map([prompt_group_id], |row| {
        Ok(PromptGroupTagRow {
            id: row.get(0)?,
            prompt_group_id: row.get(1)?,
            tag: row.get(2)?,
            sort_order: row.get(3)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.into())
}

pub fn replace_tags(
    conn: &Connection,
    prompt_group_id: &str,
    tags: &[(String, String, i32)],
) -> Result<(), AppError> {
    conn.execute(
        "DELETE FROM prompt_group_tags WHERE prompt_group_id = ?1",
        [prompt_group_id],
    )?;
    for (id, tag, sort_order) in tags {
        conn.execute(
            "INSERT INTO prompt_group_tags (id, prompt_group_id, tag, sort_order) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![id, prompt_group_id, tag, sort_order],
        )?;
    }
    Ok(())
}
