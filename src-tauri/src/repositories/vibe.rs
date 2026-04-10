use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::VibeRow;

pub fn list_all(conn: &Connection) -> Result<Vec<VibeRow>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, file_path, model, created_at, thumbnail_path, is_favorite FROM vibes ORDER BY created_at DESC",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(VibeRow {
            id: row.get(0)?,
            name: row.get(1)?,
            file_path: row.get(2)?,
            model: row.get(3)?,
            created_at: row.get(4)?,
            thumbnail_path: row.get(5)?,
            is_favorite: row.get::<_, i32>(6)? != 0,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.into())
}

pub fn find_by_id(conn: &Connection, id: &str) -> Result<VibeRow, AppError> {
    conn.query_row(
        "SELECT id, name, file_path, model, created_at, thumbnail_path, is_favorite FROM vibes WHERE id = ?1",
        [id],
        |row| {
            Ok(VibeRow {
                id: row.get(0)?,
                name: row.get(1)?,
                file_path: row.get(2)?,
                model: row.get(3)?,
                created_at: row.get(4)?,
                thumbnail_path: row.get(5)?,
                is_favorite: row.get::<_, i32>(6)? != 0,
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
        "INSERT INTO vibes (id, name, file_path, model, created_at, thumbnail_path, is_favorite) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![row.id, row.name, row.file_path, row.model, row.created_at, row.thumbnail_path, row.is_favorite as i32],
    )?;
    Ok(())
}

pub fn update_name(conn: &Connection, id: &str, name: &str) -> Result<(), AppError> {
    let updated = conn.execute(
        "UPDATE vibes SET name = ?1 WHERE id = ?2",
        rusqlite::params![name, id],
    )?;
    if updated == 0 {
        return Err(AppError::NotFound(format!("vibe {id}")));
    }
    Ok(())
}

pub fn update_thumbnail(
    conn: &Connection,
    id: &str,
    thumbnail_path: Option<&str>,
) -> Result<(), AppError> {
    let updated = conn.execute(
        "UPDATE vibes SET thumbnail_path = ?1 WHERE id = ?2",
        rusqlite::params![thumbnail_path, id],
    )?;
    if updated == 0 {
        return Err(AppError::NotFound(format!("vibe {id}")));
    }
    Ok(())
}

pub fn toggle_favorite(conn: &Connection, id: &str) -> Result<(), AppError> {
    let updated = conn.execute(
        "UPDATE vibes SET is_favorite = 1 - is_favorite WHERE id = ?1",
        [id],
    )?;
    if updated == 0 {
        return Err(AppError::NotFound(format!("vibe {id}")));
    }
    Ok(())
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM vibes WHERE id = ?1", [id])?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{create_test_style_preset, create_test_vibe, setup_test_db};

    #[test]
    fn test_insert_and_list_all() {
        let conn = setup_test_db();

        let v1 = create_test_vibe(&conn);
        let v2 = create_test_vibe(&conn);

        let all = list_all(&conn).unwrap();
        assert_eq!(all.len(), 2);
        // Both created_at are identical so order is deterministic by rowid DESC
        let ids: Vec<&str> = all.iter().map(|v| v.id.as_str()).collect();
        assert!(ids.contains(&v1.id.as_str()));
        assert!(ids.contains(&v2.id.as_str()));
    }

    #[test]
    fn test_find_by_id() {
        let conn = setup_test_db();
        let vibe = create_test_vibe(&conn);

        let found = find_by_id(&conn, &vibe.id).unwrap();
        assert_eq!(found.name, vibe.name);
        assert_eq!(found.file_path, vibe.file_path);
        assert_eq!(found.model, vibe.model);
    }

    #[test]
    fn test_find_by_id_not_found() {
        let conn = setup_test_db();
        let err = find_by_id(&conn, "nonexistent").unwrap_err();
        assert!(matches!(err, AppError::NotFound(_)));
    }

    #[test]
    fn test_update_name() {
        let conn = setup_test_db();
        let vibe = create_test_vibe(&conn);

        update_name(&conn, &vibe.id, "New Name").unwrap();
        let found = find_by_id(&conn, &vibe.id).unwrap();
        assert_eq!(found.name, "New Name");
    }

    #[test]
    fn test_update_name_not_found() {
        let conn = setup_test_db();
        let err = update_name(&conn, "nonexistent", "Name").unwrap_err();
        assert!(matches!(err, AppError::NotFound(_)));
    }

    #[test]
    fn test_update_thumbnail() {
        let conn = setup_test_db();
        let vibe = create_test_vibe(&conn);
        assert!(vibe.thumbnail_path.is_none());

        update_thumbnail(&conn, &vibe.id, Some("/tmp/thumb.png")).unwrap();
        let found = find_by_id(&conn, &vibe.id).unwrap();
        assert_eq!(found.thumbnail_path.as_deref(), Some("/tmp/thumb.png"));

        // Clear thumbnail
        update_thumbnail(&conn, &vibe.id, None).unwrap();
        let found = find_by_id(&conn, &vibe.id).unwrap();
        assert!(found.thumbnail_path.is_none());
    }

    #[test]
    fn test_update_thumbnail_not_found() {
        let conn = setup_test_db();
        let err = update_thumbnail(&conn, "nonexistent", Some("/tmp/x.png")).unwrap_err();
        assert!(matches!(err, AppError::NotFound(_)));
    }

    #[test]
    fn test_delete_cascades_preset_vibes() {
        let conn = setup_test_db();
        let vibe = create_test_vibe(&conn);
        let preset = create_test_style_preset(&conn, std::slice::from_ref(&vibe.id));

        // Verify junction row exists
        let vibe_ids =
            crate::repositories::style_preset::find_vibe_refs_by_preset(&conn, &preset.id)
                .unwrap();
        assert_eq!(vibe_ids.len(), 1);

        // Delete the vibe — CASCADE should remove junction row
        delete(&conn, &vibe.id).unwrap();

        let vibe_ids =
            crate::repositories::style_preset::find_vibe_refs_by_preset(&conn, &preset.id)
                .unwrap();
        assert!(vibe_ids.is_empty());

        // Preset itself should still exist
        let preset_found =
            crate::repositories::style_preset::find_by_id(&conn, &preset.id).unwrap();
        assert_eq!(preset_found.id, preset.id);
    }
}
