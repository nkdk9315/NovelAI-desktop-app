use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::StylePresetRow;

pub fn list_all(conn: &Connection) -> Result<Vec<StylePresetRow>, AppError> {
    let mut stmt = conn.prepare("SELECT id, name, artist_tags, created_at FROM style_presets ORDER BY created_at DESC")?;
    let rows = stmt.query_map([], |row| {
        Ok(StylePresetRow {
            id: row.get(0)?,
            name: row.get(1)?,
            artist_tags: row.get(2)?,
            created_at: row.get(3)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.into())
}

pub fn find_by_id(conn: &Connection, id: &str) -> Result<StylePresetRow, AppError> {
    conn.query_row(
        "SELECT id, name, artist_tags, created_at FROM style_presets WHERE id = ?1",
        [id],
        |row| {
            Ok(StylePresetRow {
                id: row.get(0)?,
                name: row.get(1)?,
                artist_tags: row.get(2)?,
                created_at: row.get(3)?,
            })
        },
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("style_preset {id}")),
        _ => e.into(),
    })
}

pub fn insert(conn: &Connection, row: &StylePresetRow) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO style_presets (id, name, artist_tags, created_at) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![row.id, row.name, row.artist_tags, row.created_at],
    )?;
    Ok(())
}

pub fn update(conn: &Connection, row: &StylePresetRow) -> Result<(), AppError> {
    conn.execute(
        "UPDATE style_presets SET name = ?2, artist_tags = ?3 WHERE id = ?1",
        rusqlite::params![row.id, row.name, row.artist_tags],
    )?;
    Ok(())
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM style_presets WHERE id = ?1", [id])?;
    Ok(())
}

pub fn find_vibe_ids_by_preset(
    conn: &Connection,
    preset_id: &str,
) -> Result<Vec<String>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT vibe_id FROM style_preset_vibes WHERE style_preset_id = ?1",
    )?;
    let rows = stmt.query_map([preset_id], |row| row.get(0))?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.into())
}

pub fn replace_vibe_ids(
    conn: &Connection,
    preset_id: &str,
    vibe_ids: &[String],
) -> Result<(), AppError> {
    conn.execute(
        "DELETE FROM style_preset_vibes WHERE style_preset_id = ?1",
        [preset_id],
    )?;
    for vibe_id in vibe_ids {
        conn.execute(
            "INSERT INTO style_preset_vibes (style_preset_id, vibe_id) VALUES (?1, ?2)",
            rusqlite::params![preset_id, vibe_id],
        )?;
    }
    Ok(())
}
