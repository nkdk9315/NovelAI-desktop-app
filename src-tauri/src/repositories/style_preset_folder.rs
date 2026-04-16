// Repository for `style_preset_folders` — mirror of `vibe_folder` targeting
// style_preset_folders / style_presets.

use rusqlite::{Connection, params};

use crate::error::AppError;
use crate::models::dto::AssetFolderRow;

pub fn list_roots(conn: &Connection) -> Result<Vec<AssetFolderRow>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, title, parent_id, sort_key,
                (SELECT COUNT(*) FROM style_preset_folders c WHERE c.parent_id = style_preset_folders.id)
         FROM style_preset_folders WHERE parent_id IS NULL ORDER BY sort_key, title",
    )?;
    let rows = stmt.query_map([], map_row)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

pub fn list_children(conn: &Connection, parent_id: i64) -> Result<Vec<AssetFolderRow>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, title, parent_id, sort_key,
                (SELECT COUNT(*) FROM style_preset_folders c WHERE c.parent_id = style_preset_folders.id)
         FROM style_preset_folders WHERE parent_id = ?1 ORDER BY sort_key, title",
    )?;
    let rows = stmt.query_map([parent_id], map_row)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

pub fn find(conn: &Connection, id: i64) -> Result<AssetFolderRow, AppError> {
    conn.query_row(
        "SELECT id, title, parent_id, sort_key,
                (SELECT COUNT(*) FROM style_preset_folders c WHERE c.parent_id = style_preset_folders.id)
         FROM style_preset_folders WHERE id = ?1",
        [id],
        map_row,
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => {
            AppError::NotFound(format!("style_preset_folder {id}"))
        }
        _ => e.into(),
    })
}

pub fn create(conn: &Connection, parent_id: Option<i64>, title: &str) -> Result<i64, AppError> {
    if title.trim().is_empty() {
        return Err(AppError::Validation("folder title must not be empty".into()));
    }
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO style_preset_folders (title, parent_id, sort_key, created_at, updated_at)
         VALUES (?1, ?2, 0, ?3, ?3)",
        params![title.trim(), parent_id, now],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn rename(conn: &Connection, id: i64, title: &str) -> Result<(), AppError> {
    if title.trim().is_empty() {
        return Err(AppError::Validation("folder title must not be empty".into()));
    }
    let now = chrono::Utc::now().to_rfc3339();
    let affected = conn.execute(
        "UPDATE style_preset_folders SET title = ?2, updated_at = ?3 WHERE id = ?1",
        params![id, title.trim(), now],
    )?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("style_preset_folder {id}")));
    }
    Ok(())
}

pub fn move_folder(conn: &Connection, id: i64, new_parent_id: Option<i64>) -> Result<(), AppError> {
    if let Some(mut cursor) = new_parent_id {
        if cursor == id {
            return Err(AppError::Validation("cannot move a folder into itself".into()));
        }
        loop {
            let parent: Option<i64> = conn
                .query_row(
                    "SELECT parent_id FROM style_preset_folders WHERE id = ?1",
                    [cursor],
                    |r| r.get(0),
                )
                .map_err(|e| match e {
                    rusqlite::Error::QueryReturnedNoRows => {
                        AppError::NotFound(format!("style_preset_folder {cursor}"))
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
        "UPDATE style_preset_folders SET parent_id = ?2, updated_at = ?3 WHERE id = ?1",
        params![id, new_parent_id, now],
    )?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("style_preset_folder {id}")));
    }
    Ok(())
}

pub fn delete(conn: &Connection, id: i64) -> Result<(), AppError> {
    let affected = conn.execute("DELETE FROM style_preset_folders WHERE id = ?1", [id])?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("style_preset_folder {id}")));
    }
    Ok(())
}

fn map_row(row: &rusqlite::Row) -> rusqlite::Result<AssetFolderRow> {
    Ok(AssetFolderRow {
        id: row.get(0)?,
        title: row.get(1)?,
        parent_id: row.get(2)?,
        sort_key: row.get(3)?,
        child_count: row.get(4)?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::setup_test_db;

    #[test]
    fn lifecycle() {
        let conn = setup_test_db();
        let a = create(&conn, None, "A").unwrap();
        let b = create(&conn, Some(a), "B").unwrap();

        assert_eq!(list_roots(&conn).unwrap().len(), 1);
        assert_eq!(list_children(&conn, a).unwrap().len(), 1);

        rename(&conn, b, "B2").unwrap();
        assert_eq!(find(&conn, b).unwrap().title, "B2");

        let err = move_folder(&conn, a, Some(b)).unwrap_err();
        assert!(matches!(err, AppError::Validation(_)));

        delete(&conn, a).unwrap();
        assert!(find(&conn, a).is_err());
        assert!(find(&conn, b).is_err());
    }

    #[test]
    fn delete_sets_preset_folder_id_to_null() {
        let conn = setup_test_db();
        let root = create(&conn, None, "Root").unwrap();
        let preset = crate::test_utils::create_test_style_preset(&conn, &[]);
        crate::repositories::style_preset::set_folder(&conn, &preset.id, Some(root)).unwrap();

        delete(&conn, root).unwrap();

        let reloaded = crate::repositories::style_preset::find_by_id(&conn, &preset.id).unwrap();
        assert!(reloaded.folder_id.is_none());
    }
}
