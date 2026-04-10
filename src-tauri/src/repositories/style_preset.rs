use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::{PresetVibeRef, StylePresetRow};

pub fn list_all(conn: &Connection) -> Result<Vec<StylePresetRow>, AppError> {
    let mut stmt = conn.prepare("SELECT id, name, artist_tags, created_at, thumbnail_path, is_favorite, model FROM style_presets ORDER BY created_at DESC")?;
    let rows = stmt.query_map([], |row| {
        Ok(StylePresetRow {
            id: row.get(0)?,
            name: row.get(1)?,
            artist_tags: row.get(2)?,
            created_at: row.get(3)?,
            thumbnail_path: row.get(4)?,
            is_favorite: row.get::<_, i32>(5)? != 0,
            model: row.get(6)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.into())
}

pub fn find_by_id(conn: &Connection, id: &str) -> Result<StylePresetRow, AppError> {
    conn.query_row(
        "SELECT id, name, artist_tags, created_at, thumbnail_path, is_favorite, model FROM style_presets WHERE id = ?1",
        [id],
        |row| {
            Ok(StylePresetRow {
                id: row.get(0)?,
                name: row.get(1)?,
                artist_tags: row.get(2)?,
                created_at: row.get(3)?,
                thumbnail_path: row.get(4)?,
                is_favorite: row.get::<_, i32>(5)? != 0,
                model: row.get(6)?,
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
        "INSERT INTO style_presets (id, name, artist_tags, created_at, thumbnail_path, is_favorite, model) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![row.id, row.name, row.artist_tags, row.created_at, row.thumbnail_path, row.is_favorite as i32, row.model],
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

pub fn toggle_favorite(conn: &Connection, id: &str) -> Result<(), AppError> {
    let updated = conn.execute(
        "UPDATE style_presets SET is_favorite = 1 - is_favorite WHERE id = ?1",
        [id],
    )?;
    if updated == 0 {
        return Err(AppError::NotFound(format!("style_preset {id}")));
    }
    Ok(())
}

pub fn update_thumbnail(
    conn: &Connection,
    id: &str,
    thumbnail_path: Option<&str>,
) -> Result<(), AppError> {
    let updated = conn.execute(
        "UPDATE style_presets SET thumbnail_path = ?1 WHERE id = ?2",
        rusqlite::params![thumbnail_path, id],
    )?;
    if updated == 0 {
        return Err(AppError::NotFound(format!("style_preset {id}")));
    }
    Ok(())
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM style_presets WHERE id = ?1", [id])?;
    Ok(())
}

pub fn find_vibe_refs_by_preset(
    conn: &Connection,
    preset_id: &str,
) -> Result<Vec<PresetVibeRef>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT vibe_id, strength FROM style_preset_vibes WHERE style_preset_id = ?1",
    )?;
    let rows = stmt.query_map([preset_id], |row| {
        Ok(PresetVibeRef {
            vibe_id: row.get(0)?,
            strength: row.get(1)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.into())
}

pub fn replace_vibe_refs(
    conn: &Connection,
    preset_id: &str,
    vibe_refs: &[PresetVibeRef],
) -> Result<(), AppError> {
    conn.execute(
        "DELETE FROM style_preset_vibes WHERE style_preset_id = ?1",
        [preset_id],
    )?;
    for vr in vibe_refs {
        conn.execute(
            "INSERT INTO style_preset_vibes (style_preset_id, vibe_id, strength) VALUES (?1, ?2, ?3)",
            rusqlite::params![preset_id, vr.vibe_id, vr.strength],
        )?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{create_test_style_preset, create_test_vibe, setup_test_db};

    #[test]
    fn test_insert_and_list_all() {
        let conn = setup_test_db();

        let p1 = create_test_style_preset(&conn, &[]);
        let p2 = create_test_style_preset(&conn, &[]);

        let all = list_all(&conn).unwrap();
        assert_eq!(all.len(), 2);
        let ids: Vec<&str> = all.iter().map(|p| p.id.as_str()).collect();
        assert!(ids.contains(&p1.id.as_str()));
        assert!(ids.contains(&p2.id.as_str()));
    }

    #[test]
    fn test_update() {
        let conn = setup_test_db();
        let mut preset = create_test_style_preset(&conn, &[]);

        preset.name = "Updated Name".to_string();
        preset.artist_tags = serde_json::to_string(&["new_artist"]).unwrap();
        update(&conn, &preset).unwrap();

        let found = find_by_id(&conn, &preset.id).unwrap();
        assert_eq!(found.name, "Updated Name");
        assert_eq!(found.artist_tags, r#"["new_artist"]"#);
    }

    #[test]
    fn test_delete() {
        let conn = setup_test_db();
        let vibe = create_test_vibe(&conn);
        let preset = create_test_style_preset(&conn, std::slice::from_ref(&vibe.id));

        delete(&conn, &preset.id).unwrap();

        // Preset should be gone
        let err = find_by_id(&conn, &preset.id).unwrap_err();
        assert!(matches!(err, AppError::NotFound(_)));

        // Junction rows should be gone (CASCADE)
        let refs = find_vibe_refs_by_preset(&conn, &preset.id).unwrap();
        assert!(refs.is_empty());

        // Vibe itself should still exist
        let vibe_found = crate::repositories::vibe::find_by_id(&conn, &vibe.id).unwrap();
        assert_eq!(vibe_found.id, vibe.id);
    }

    #[test]
    fn test_replace_vibe_refs() {
        let conn = setup_test_db();
        let v1 = create_test_vibe(&conn);
        let v2 = create_test_vibe(&conn);
        let v3 = create_test_vibe(&conn);
        let preset = create_test_style_preset(&conn, &[v1.id.clone(), v2.id.clone()]);

        let new_refs = vec![
            PresetVibeRef { vibe_id: v2.id.clone(), strength: 0.5 },
            PresetVibeRef { vibe_id: v3.id.clone(), strength: 0.8 },
        ];
        replace_vibe_refs(&conn, &preset.id, &new_refs).unwrap();

        let refs = find_vibe_refs_by_preset(&conn, &preset.id).unwrap();
        assert_eq!(refs.len(), 2);
        let ids: Vec<&str> = refs.iter().map(|r| r.vibe_id.as_str()).collect();
        assert!(ids.contains(&v2.id.as_str()));
        assert!(ids.contains(&v3.id.as_str()));
        assert!(!ids.contains(&v1.id.as_str()));
    }

    #[test]
    fn test_find_vibe_refs_by_preset() {
        let conn = setup_test_db();
        let v1 = create_test_vibe(&conn);
        let v2 = create_test_vibe(&conn);
        let preset = create_test_style_preset(&conn, &[v1.id.clone(), v2.id.clone()]);

        let refs = find_vibe_refs_by_preset(&conn, &preset.id).unwrap();
        assert_eq!(refs.len(), 2);
    }
}
