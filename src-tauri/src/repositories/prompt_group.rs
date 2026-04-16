use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::{PromptGroupRow, PromptGroupTagRow};

fn map_row(row: &rusqlite::Row) -> rusqlite::Result<PromptGroupRow> {
    Ok(PromptGroupRow {
        id: row.get(0)?,
        name: row.get(1)?,
        genre_id: row.get(2)?,
        is_default_for_genre: row.get(3)?,
        is_system: row.get(4)?,
        usage_type: row.get(5)?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
        thumbnail_path: row.get(8)?,
        is_default: row.get(9)?,
        category: row.get(10)?,
        default_strength: row.get(11)?,
        random_mode: row.get(12)?,
        random_count: row.get(13)?,
        random_source: row.get(14)?,
        wildcard_token: row.get(15)?,
        folder_id: row.get(16)?,
    })
}

pub fn list(
    conn: &Connection,
    search: Option<&str>,
) -> Result<Vec<PromptGroupRow>, AppError> {
    let sql = concat!(
        "SELECT id, name, genre_id, is_default_for_genre, is_system, usage_type, ",
        "created_at, updated_at, thumbnail_path, is_default, category, default_strength, ",
        "random_mode, random_count, random_source, wildcard_token, folder_id ",
        "FROM prompt_groups WHERE (?1 IS NULL OR name LIKE '%' || ?1 || '%') ORDER BY created_at DESC"
    );
    let mut stmt = conn.prepare(sql)?;
    let rows = stmt.query_map(rusqlite::params![search], map_row)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

pub fn find_by_id(conn: &Connection, id: &str) -> Result<PromptGroupRow, AppError> {
    let sql = concat!(
        "SELECT id, name, genre_id, is_default_for_genre, is_system, usage_type, ",
        "created_at, updated_at, thumbnail_path, is_default, category, default_strength, ",
        "random_mode, random_count, random_source, wildcard_token, folder_id ",
        "FROM prompt_groups WHERE id = ?1"
    );
    conn.query_row(sql, [id], map_row).map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => {
            AppError::NotFound(["prompt_group ", id].concat())
        }
        _ => e.into(),
    })
}

pub fn insert(conn: &Connection, row: &PromptGroupRow) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO prompt_groups (id, name, genre_id, is_default_for_genre, is_system, usage_type, created_at, updated_at, thumbnail_path, is_default, category, default_strength, random_mode, random_count, random_source, wildcard_token, folder_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
        rusqlite::params![row.id, row.name, row.genre_id, row.is_default_for_genre, row.is_system, row.usage_type, row.created_at, row.updated_at, row.thumbnail_path, row.is_default, row.category, row.default_strength, row.random_mode, row.random_count, row.random_source, row.wildcard_token, row.folder_id],
    )?;
    Ok(())
}

pub fn update(conn: &Connection, row: &PromptGroupRow) -> Result<(), AppError> {
    conn.execute(
        "UPDATE prompt_groups SET name = ?2, is_default = ?3, thumbnail_path = ?4, updated_at = ?5, default_strength = ?6, random_mode = ?7, random_count = ?8, random_source = ?9, wildcard_token = ?10, folder_id = ?11 WHERE id = ?1",
        rusqlite::params![row.id, row.name, row.is_default, row.thumbnail_path, row.updated_at, row.default_strength, row.random_mode, row.random_count, row.random_source, row.wildcard_token, row.folder_id],
    )?;
    Ok(())
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM prompt_groups WHERE id = ?1", [id])?;
    Ok(())
}

pub fn set_folder(
    conn: &Connection,
    id: &str,
    folder_id: Option<i64>,
) -> Result<(), AppError> {
    let updated = conn.execute(
        "UPDATE prompt_groups SET folder_id = ?1 WHERE id = ?2",
        rusqlite::params![folder_id, id],
    )?;
    if updated == 0 {
        return Err(AppError::NotFound(format!("prompt_group {id}")));
    }
    Ok(())
}

pub fn count_by_folder(conn: &Connection, folder_id: i64) -> Result<i64, AppError> {
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM prompt_groups WHERE folder_id = ?1",
        [folder_id],
        |r| r.get(0),
    )?;
    Ok(count)
}

pub fn delete_by_folder(conn: &Connection, folder_id: i64) -> Result<usize, AppError> {
    let affected = conn.execute(
        "DELETE FROM prompt_groups WHERE folder_id = ?1",
        [folder_id],
    )?;
    Ok(affected)
}

pub fn list_default_genres(
    conn: &Connection,
    prompt_group_id: &str,
) -> Result<Vec<String>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT genre_id FROM prompt_group_default_genres WHERE prompt_group_id = ?1 ORDER BY genre_id",
    )?;
    let rows = stmt.query_map([prompt_group_id], |r| r.get::<_, String>(0))?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

pub fn set_default_genres(
    conn: &Connection,
    prompt_group_id: &str,
    genre_ids: &[String],
) -> Result<(), AppError> {
    conn.execute(
        "DELETE FROM prompt_group_default_genres WHERE prompt_group_id = ?1",
        [prompt_group_id],
    )?;
    for gid in genre_ids {
        conn.execute(
            "INSERT OR IGNORE INTO prompt_group_default_genres (prompt_group_id, genre_id) VALUES (?1, ?2)",
            rusqlite::params![prompt_group_id, gid],
        )?;
    }
    Ok(())
}

pub fn list_groups_for_default_genre(
    conn: &Connection,
    genre_id: &str,
) -> Result<Vec<String>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT prompt_group_id FROM prompt_group_default_genres WHERE genre_id = ?1 ORDER BY prompt_group_id",
    )?;
    let rows = stmt.query_map([genre_id], |r| r.get::<_, String>(0))?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

pub fn find_tags_by_group(
    conn: &Connection,
    prompt_group_id: &str,
) -> Result<Vec<PromptGroupTagRow>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, tag, sort_order, default_strength, thumbnail_path FROM prompt_group_tags WHERE prompt_group_id = ?1 ORDER BY sort_order ASC",
    )?;
    let rows = stmt.query_map([prompt_group_id], |row| {
        Ok(PromptGroupTagRow {
            id: row.get(0)?,
            name: row.get(1)?,
            tag: row.get(2)?,
            sort_order: row.get(3)?,
            default_strength: row.get(4)?,
            thumbnail_path: row.get(5)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

/// Tag tuple: (id, name, tag, sort_order, default_strength, thumbnail_path)
#[allow(clippy::type_complexity)]
pub fn replace_tags(
    conn: &Connection,
    prompt_group_id: &str,
    tags: &[(String, String, String, i32, i32, Option<String>)],
) -> Result<(), AppError> {
    conn.execute(
        "DELETE FROM prompt_group_tags WHERE prompt_group_id = ?1",
        [prompt_group_id],
    )?;
    for (id, name, tag, sort_order, default_strength, thumbnail_path) in tags {
        conn.execute(
            "INSERT INTO prompt_group_tags (id, prompt_group_id, name, tag, sort_order, default_strength, thumbnail_path) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![id, prompt_group_id, name, tag, sort_order, default_strength, thumbnail_path],
        )?;
    }
    Ok(())
}

#[cfg(test)]
#[path = "prompt_group_tests.rs"]
mod tests;
