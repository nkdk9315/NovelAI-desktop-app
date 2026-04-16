use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::{PresetCharacterSlotRow, PromptPresetRow};

fn map_row(row: &rusqlite::Row) -> rusqlite::Result<PromptPresetRow> {
    Ok(PromptPresetRow {
        id: row.get(0)?,
        name: row.get(1)?,
        folder_id: row.get(2)?,
        created_at: row.get(3)?,
        updated_at: row.get(4)?,
    })
}

pub fn list(conn: &Connection, search: Option<&str>) -> Result<Vec<PromptPresetRow>, AppError> {
    let sql = "SELECT id, name, folder_id, created_at, updated_at \
               FROM prompt_presets WHERE (?1 IS NULL OR name LIKE '%' || ?1 || '%') \
               ORDER BY created_at DESC";
    let mut stmt = conn.prepare(sql)?;
    let rows = stmt.query_map(rusqlite::params![search], map_row)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

pub fn find_by_id(conn: &Connection, id: &str) -> Result<PromptPresetRow, AppError> {
    let sql = "SELECT id, name, folder_id, created_at, updated_at \
               FROM prompt_presets WHERE id = ?1";
    conn.query_row(sql, [id], map_row).map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => {
            AppError::NotFound(["prompt_preset ", id].concat())
        }
        _ => e.into(),
    })
}

pub fn insert(conn: &Connection, row: &PromptPresetRow) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO prompt_presets (id, name, folder_id, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![row.id, row.name, row.folder_id, row.created_at, row.updated_at],
    )?;
    Ok(())
}

pub fn update(conn: &Connection, row: &PromptPresetRow) -> Result<(), AppError> {
    conn.execute(
        "UPDATE prompt_presets SET name = ?2, folder_id = ?3, updated_at = ?4 WHERE id = ?1",
        rusqlite::params![row.id, row.name, row.folder_id, row.updated_at],
    )?;
    Ok(())
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
    let affected = conn.execute("DELETE FROM prompt_presets WHERE id = ?1", [id])?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("prompt_preset {id}")));
    }
    Ok(())
}

pub fn set_folder(conn: &Connection, id: &str, folder_id: Option<i64>) -> Result<(), AppError> {
    let updated = conn.execute(
        "UPDATE prompt_presets SET folder_id = ?1 WHERE id = ?2",
        rusqlite::params![folder_id, id],
    )?;
    if updated == 0 {
        return Err(AppError::NotFound(format!("prompt_preset {id}")));
    }
    Ok(())
}

pub fn count_by_folder(conn: &Connection, folder_id: i64) -> Result<i64, AppError> {
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM prompt_presets WHERE folder_id = ?1",
        [folder_id],
        |r| r.get(0),
    )?;
    Ok(count)
}

pub fn delete_by_folder(conn: &Connection, folder_id: i64) -> Result<usize, AppError> {
    let affected = conn.execute(
        "DELETE FROM prompt_presets WHERE folder_id = ?1",
        [folder_id],
    )?;
    Ok(affected)
}

pub fn list_slots(
    conn: &Connection,
    preset_id: &str,
) -> Result<Vec<PresetCharacterSlotRow>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, preset_id, slot_index, slot_label, genre_id, positive_prompt, \
         negative_prompt, role FROM preset_character_slots \
         WHERE preset_id = ?1 ORDER BY slot_index ASC",
    )?;
    let rows = stmt.query_map([preset_id], |row| {
        Ok(PresetCharacterSlotRow {
            id: row.get(0)?,
            preset_id: row.get(1)?,
            slot_index: row.get(2)?,
            slot_label: row.get(3)?,
            genre_id: row.get(4)?,
            positive_prompt: row.get(5)?,
            negative_prompt: row.get(6)?,
            role: row.get(7)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

/// Slot tuple: (id, slot_index, slot_label, genre_id, positive_prompt, negative_prompt, role)
#[allow(clippy::type_complexity)]
pub fn replace_slots(
    conn: &Connection,
    preset_id: &str,
    slots: &[(String, i32, String, Option<String>, String, String, String)],
) -> Result<(), AppError> {
    conn.execute(
        "DELETE FROM preset_character_slots WHERE preset_id = ?1",
        [preset_id],
    )?;
    for (id, slot_index, slot_label, genre_id, positive_prompt, negative_prompt, role) in slots {
        conn.execute(
            "INSERT INTO preset_character_slots \
             (id, preset_id, slot_index, slot_label, genre_id, positive_prompt, negative_prompt, role) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![id, preset_id, slot_index, slot_label, genre_id, positive_prompt, negative_prompt, role],
        )?;
    }
    Ok(())
}
