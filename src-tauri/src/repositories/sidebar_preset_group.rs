use rusqlite::Connection;
use std::collections::HashSet;

use crate::error::AppError;
use crate::models::dto::{SidebarPresetGroupActivePresetDto, SidebarPresetGroupInstanceRow};

fn map_row(row: &rusqlite::Row) -> rusqlite::Result<SidebarPresetGroupInstanceRow> {
    Ok(SidebarPresetGroupInstanceRow {
        id: row.get(0)?,
        project_id: row.get(1)?,
        folder_id: row.get(2)?,
        source_character_id: row.get(3)?,
        target_character_id: row.get(4)?,
        position: row.get(5)?,
        default_positive_strength: row.get(6)?,
        default_negative_strength: row.get(7)?,
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
    })
}

const SELECT_COLS: &str = "id, project_id, folder_id, source_character_id, \
     target_character_id, position, default_positive_strength, \
     default_negative_strength, created_at, updated_at";

pub fn list_by_project(
    conn: &Connection,
    project_id: &str,
) -> Result<Vec<SidebarPresetGroupInstanceRow>, AppError> {
    let sql = format!(
        "SELECT {SELECT_COLS} FROM sidebar_preset_group_instances \
         WHERE project_id = ?1 ORDER BY position ASC, created_at ASC"
    );
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map([project_id], map_row)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

pub fn find_by_id(
    conn: &Connection,
    id: &str,
) -> Result<SidebarPresetGroupInstanceRow, AppError> {
    let sql = format!(
        "SELECT {SELECT_COLS} FROM sidebar_preset_group_instances WHERE id = ?1"
    );
    conn.query_row(&sql, [id], map_row).map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => {
            AppError::NotFound(format!("sidebar_preset_group_instance {id}"))
        }
        _ => e.into(),
    })
}

pub fn insert(conn: &Connection, row: &SidebarPresetGroupInstanceRow) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO sidebar_preset_group_instances \
         (id, project_id, folder_id, source_character_id, target_character_id, \
          position, default_positive_strength, default_negative_strength, \
          created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![
            row.id,
            row.project_id,
            row.folder_id,
            row.source_character_id,
            row.target_character_id,
            row.position,
            row.default_positive_strength,
            row.default_negative_strength,
            row.created_at,
            row.updated_at,
        ],
    )?;
    Ok(())
}

pub fn update_pair(
    conn: &Connection,
    id: &str,
    source_character_id: &str,
    target_character_id: &str,
    updated_at: &str,
) -> Result<(), AppError> {
    let affected = conn.execute(
        "UPDATE sidebar_preset_group_instances \
         SET source_character_id = ?2, target_character_id = ?3, updated_at = ?4 \
         WHERE id = ?1",
        rusqlite::params![id, source_character_id, target_character_id, updated_at],
    )?;
    if affected == 0 {
        return Err(AppError::NotFound(format!(
            "sidebar_preset_group_instance {id}"
        )));
    }
    Ok(())
}

pub fn update_default_strength(
    conn: &Connection,
    id: &str,
    positive: f64,
    negative: f64,
    updated_at: &str,
) -> Result<(), AppError> {
    let affected = conn.execute(
        "UPDATE sidebar_preset_group_instances \
         SET default_positive_strength = ?2, default_negative_strength = ?3, updated_at = ?4 \
         WHERE id = ?1",
        rusqlite::params![id, positive, negative, updated_at],
    )?;
    if affected == 0 {
        return Err(AppError::NotFound(format!(
            "sidebar_preset_group_instance {id}"
        )));
    }
    Ok(())
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
    let affected = conn.execute(
        "DELETE FROM sidebar_preset_group_instances WHERE id = ?1",
        [id],
    )?;
    if affected == 0 {
        return Err(AppError::NotFound(format!(
            "sidebar_preset_group_instance {id}"
        )));
    }
    Ok(())
}

pub fn next_position(conn: &Connection, project_id: &str) -> Result<i32, AppError> {
    let max: Option<i32> = conn
        .query_row(
            "SELECT MAX(position) FROM sidebar_preset_group_instances WHERE project_id = ?1",
            [project_id],
            |r| r.get(0),
        )
        .ok();
    Ok(max.unwrap_or(-1) + 1)
}

pub fn set_position(conn: &Connection, id: &str, position: i32) -> Result<(), AppError> {
    let affected = conn.execute(
        "UPDATE sidebar_preset_group_instances SET position = ?2 WHERE id = ?1",
        rusqlite::params![id, position],
    )?;
    if affected == 0 {
        return Err(AppError::NotFound(format!(
            "sidebar_preset_group_instance {id}"
        )));
    }
    Ok(())
}

pub fn list_active_presets(
    conn: &Connection,
    instance_id: &str,
) -> Result<Vec<SidebarPresetGroupActivePresetDto>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT preset_id, positive_strength, negative_strength, activated_at \
         FROM sidebar_preset_group_active_presets \
         WHERE instance_id = ?1 ORDER BY activated_at ASC, preset_id ASC",
    )?;
    let rows = stmt.query_map([instance_id], |r| {
        Ok(SidebarPresetGroupActivePresetDto {
            preset_id: r.get(0)?,
            positive_strength: r.get(1)?,
            negative_strength: r.get(2)?,
            activated_at: r.get(3)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

/// Apply the given desired set of active preset ids as a DIFF:
/// - INSERT rows for newly-added preset ids (with NULL strengths)
/// - DELETE rows for removed preset ids
/// - Existing rows are left alone, preserving any per-preset strength overrides.
pub fn diff_active_presets(
    conn: &Connection,
    instance_id: &str,
    desired_preset_ids: &[String],
) -> Result<(), AppError> {
    let existing: Vec<String> = {
        let mut stmt = conn.prepare(
            "SELECT preset_id FROM sidebar_preset_group_active_presets \
             WHERE instance_id = ?1",
        )?;
        let rows = stmt.query_map([instance_id], |r| r.get::<_, String>(0))?;
        rows.collect::<Result<Vec<_>, _>>()?
    };
    let existing_set: HashSet<&str> = existing.iter().map(|s| s.as_str()).collect();
    let desired_set: HashSet<&str> = desired_preset_ids.iter().map(|s| s.as_str()).collect();

    let now = chrono::Utc::now().to_rfc3339();
    for pid in desired_preset_ids {
        if !existing_set.contains(pid.as_str()) {
            conn.execute(
                "INSERT INTO sidebar_preset_group_active_presets \
                 (instance_id, preset_id, positive_strength, negative_strength, activated_at) \
                 VALUES (?1, ?2, NULL, NULL, ?3)",
                rusqlite::params![instance_id, pid, now],
            )?;
        }
    }
    for pid in &existing {
        if !desired_set.contains(pid.as_str()) {
            conn.execute(
                "DELETE FROM sidebar_preset_group_active_presets \
                 WHERE instance_id = ?1 AND preset_id = ?2",
                rusqlite::params![instance_id, pid],
            )?;
        }
    }
    Ok(())
}

pub fn update_preset_strength(
    conn: &Connection,
    instance_id: &str,
    preset_id: &str,
    positive: Option<f64>,
    negative: Option<f64>,
) -> Result<(), AppError> {
    let affected = conn.execute(
        "UPDATE sidebar_preset_group_active_presets \
         SET positive_strength = ?3, negative_strength = ?4 \
         WHERE instance_id = ?1 AND preset_id = ?2",
        rusqlite::params![instance_id, preset_id, positive, negative],
    )?;
    if affected == 0 {
        return Err(AppError::NotFound(format!(
            "active preset {preset_id} in instance {instance_id}"
        )));
    }
    Ok(())
}
