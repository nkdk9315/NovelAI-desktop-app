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
    fn test_delete_cascades_preset_vibes() {
        let conn = setup_test_db();
        let vibe = create_test_vibe(&conn);
        let preset = create_test_style_preset(&conn, std::slice::from_ref(&vibe.id));

        // Verify junction row exists
        let vibe_ids =
            crate::repositories::style_preset::find_vibe_ids_by_preset(&conn, &preset.id)
                .unwrap();
        assert_eq!(vibe_ids.len(), 1);

        // Delete the vibe — CASCADE should remove junction row
        delete(&conn, &vibe.id).unwrap();

        let vibe_ids =
            crate::repositories::style_preset::find_vibe_ids_by_preset(&conn, &preset.id)
                .unwrap();
        assert!(vibe_ids.is_empty());

        // Preset itself should still exist
        let preset_found =
            crate::repositories::style_preset::find_by_id(&conn, &preset.id).unwrap();
        assert_eq!(preset_found.id, preset.id);
    }
}
