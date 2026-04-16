// Repository for `vibe_folders` — user-defined hierarchical organization of vibes.
// All operations mirror `repositories::tag` (see migration 013) but target the
// simpler vibe_folders table (no seed/user split, no slug, no kind).

use rusqlite::{Connection, params};

use crate::error::AppError;
use crate::models::dto::AssetFolderRow;

pub fn list_roots(conn: &Connection) -> Result<Vec<AssetFolderRow>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, title, parent_id, sort_key,
                (SELECT COUNT(*) FROM vibe_folders c WHERE c.parent_id = vibe_folders.id)
         FROM vibe_folders WHERE parent_id IS NULL ORDER BY sort_key, title",
    )?;
    let rows = stmt.query_map([], map_row)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

pub fn list_children(conn: &Connection, parent_id: i64) -> Result<Vec<AssetFolderRow>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, title, parent_id, sort_key,
                (SELECT COUNT(*) FROM vibe_folders c WHERE c.parent_id = vibe_folders.id)
         FROM vibe_folders WHERE parent_id = ?1 ORDER BY sort_key, title",
    )?;
    let rows = stmt.query_map([parent_id], map_row)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

pub fn find(conn: &Connection, id: i64) -> Result<AssetFolderRow, AppError> {
    conn.query_row(
        "SELECT id, title, parent_id, sort_key,
                (SELECT COUNT(*) FROM vibe_folders c WHERE c.parent_id = vibe_folders.id)
         FROM vibe_folders WHERE id = ?1",
        [id],
        map_row,
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("vibe_folder {id}")),
        _ => e.into(),
    })
}

pub fn create(conn: &Connection, parent_id: Option<i64>, title: &str) -> Result<i64, AppError> {
    if title.trim().is_empty() {
        return Err(AppError::Validation("folder title must not be empty".into()));
    }
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO vibe_folders (title, parent_id, sort_key, created_at, updated_at)
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
        "UPDATE vibe_folders SET title = ?2, updated_at = ?3 WHERE id = ?1",
        params![id, title.trim(), now],
    )?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("vibe_folder {id}")));
    }
    Ok(())
}

pub fn move_folder(conn: &Connection, id: i64, new_parent_id: Option<i64>) -> Result<(), AppError> {
    // Reject cycles: walk up from the proposed new parent; if we reach `id`
    // we'd be creating a loop.
    if let Some(mut cursor) = new_parent_id {
        if cursor == id {
            return Err(AppError::Validation("cannot move a folder into itself".into()));
        }
        loop {
            let parent: Option<i64> = conn
                .query_row(
                    "SELECT parent_id FROM vibe_folders WHERE id = ?1",
                    [cursor],
                    |r| r.get(0),
                )
                .map_err(|e| match e {
                    rusqlite::Error::QueryReturnedNoRows => {
                        AppError::NotFound(format!("vibe_folder {cursor}"))
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
        "UPDATE vibe_folders SET parent_id = ?2, updated_at = ?3 WHERE id = ?1",
        params![id, new_parent_id, now],
    )?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("vibe_folder {id}")));
    }
    Ok(())
}

pub fn delete(conn: &Connection, id: i64) -> Result<(), AppError> {
    let affected = conn.execute("DELETE FROM vibe_folders WHERE id = ?1", [id])?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("vibe_folder {id}")));
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
    fn create_and_list() {
        let conn = setup_test_db();
        let root = create(&conn, None, "Characters").unwrap();
        let child = create(&conn, Some(root), "Heroes").unwrap();

        let roots = list_roots(&conn).unwrap();
        assert_eq!(roots.len(), 1);
        assert_eq!(roots[0].id, root);
        assert_eq!(roots[0].child_count, 1);

        let children = list_children(&conn, root).unwrap();
        assert_eq!(children.len(), 1);
        assert_eq!(children[0].id, child);
    }

    #[test]
    fn rename_updates_title() {
        let conn = setup_test_db();
        let id = create(&conn, None, "Old").unwrap();
        rename(&conn, id, "New").unwrap();
        assert_eq!(find(&conn, id).unwrap().title, "New");
    }

    #[test]
    fn move_rejects_cycle() {
        let conn = setup_test_db();
        let a = create(&conn, None, "A").unwrap();
        let b = create(&conn, Some(a), "B").unwrap();
        // Moving A under B would form a cycle (B is a descendant of A).
        let err = move_folder(&conn, a, Some(b)).unwrap_err();
        assert!(matches!(err, AppError::Validation(_)));
    }

    #[test]
    fn move_self_rejected() {
        let conn = setup_test_db();
        let a = create(&conn, None, "A").unwrap();
        let err = move_folder(&conn, a, Some(a)).unwrap_err();
        assert!(matches!(err, AppError::Validation(_)));
    }

    #[test]
    fn delete_cascades_children_and_nulls_vibe_folder_id() {
        let conn = setup_test_db();
        let root = create(&conn, None, "Root").unwrap();
        let child = create(&conn, Some(root), "Child").unwrap();

        // Place a vibe into the child folder.
        let vibe = crate::test_utils::create_test_vibe(&conn);
        crate::repositories::vibe::set_folder(&conn, &vibe.id, Some(child)).unwrap();

        // Delete the root → child cascades, vibe.folder_id becomes NULL.
        delete(&conn, root).unwrap();

        assert!(find(&conn, root).is_err());
        assert!(find(&conn, child).is_err());

        let reloaded = crate::repositories::vibe::find_by_id(&conn, &vibe.id).unwrap();
        assert!(reloaded.folder_id.is_none());
    }
}
