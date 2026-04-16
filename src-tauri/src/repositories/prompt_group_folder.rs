// Repository for `prompt_group_folders` — user-defined hierarchical
// organization of prompt groups. Mirrors `repositories::vibe_folder` except
// that deleting a folder cascades into its prompt_groups (see migration 019).

use rusqlite::{Connection, params};

use crate::error::AppError;
use crate::models::dto::PromptGroupFolderRow;

fn map_row(row: &rusqlite::Row) -> rusqlite::Result<PromptGroupFolderRow> {
    Ok(PromptGroupFolderRow {
        id: row.get(0)?,
        title: row.get(1)?,
        parent_id: row.get(2)?,
        sort_key: row.get(3)?,
    })
}

#[allow(dead_code)]
pub fn list_roots(conn: &Connection) -> Result<Vec<PromptGroupFolderRow>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, title, parent_id, sort_key
         FROM prompt_group_folders WHERE parent_id IS NULL
         ORDER BY sort_key, title",
    )?;
    let rows = stmt.query_map([], map_row)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

#[allow(dead_code)]
pub fn list_children(
    conn: &Connection,
    parent_id: i64,
) -> Result<Vec<PromptGroupFolderRow>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, title, parent_id, sort_key
         FROM prompt_group_folders WHERE parent_id = ?1
         ORDER BY sort_key, title",
    )?;
    let rows = stmt.query_map([parent_id], map_row)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

pub fn list_all(conn: &Connection) -> Result<Vec<PromptGroupFolderRow>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, title, parent_id, sort_key FROM prompt_group_folders ORDER BY sort_key, title",
    )?;
    let rows = stmt.query_map([], map_row)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

pub fn find_by_id(conn: &Connection, id: i64) -> Result<PromptGroupFolderRow, AppError> {
    conn.query_row(
        "SELECT id, title, parent_id, sort_key FROM prompt_group_folders WHERE id = ?1",
        [id],
        map_row,
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => {
            AppError::NotFound(format!("prompt_group_folder {id}"))
        }
        _ => e.into(),
    })
}

pub fn next_sort_key(conn: &Connection, parent_id: Option<i64>) -> Result<i64, AppError> {
    let max: Option<i64> = match parent_id {
        Some(p) => conn.query_row(
            "SELECT MAX(sort_key) FROM prompt_group_folders WHERE parent_id = ?1",
            [p],
            |r| r.get(0),
        )?,
        None => conn.query_row(
            "SELECT MAX(sort_key) FROM prompt_group_folders WHERE parent_id IS NULL",
            [],
            |r| r.get(0),
        )?,
    };
    Ok(max.unwrap_or(-1) + 1)
}

pub fn insert(conn: &Connection, parent_id: Option<i64>, title: &str) -> Result<i64, AppError> {
    if title.trim().is_empty() {
        return Err(AppError::Validation("folder title must not be empty".into()));
    }
    let now = chrono::Utc::now().to_rfc3339();
    let sort_key = next_sort_key(conn, parent_id)?;
    conn.execute(
        "INSERT INTO prompt_group_folders (title, parent_id, sort_key, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?4)",
        params![title.trim(), parent_id, sort_key, now],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn update_title(conn: &Connection, id: i64, title: &str) -> Result<(), AppError> {
    if title.trim().is_empty() {
        return Err(AppError::Validation("folder title must not be empty".into()));
    }
    let now = chrono::Utc::now().to_rfc3339();
    let affected = conn.execute(
        "UPDATE prompt_group_folders SET title = ?2, updated_at = ?3 WHERE id = ?1",
        params![id, title.trim(), now],
    )?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("prompt_group_folder {id}")));
    }
    Ok(())
}

pub fn move_to(conn: &Connection, id: i64, new_parent_id: Option<i64>) -> Result<(), AppError> {
    if let Some(mut cursor) = new_parent_id {
        if cursor == id {
            return Err(AppError::Validation("cannot move a folder into itself".into()));
        }
        loop {
            let parent: Option<i64> = conn
                .query_row(
                    "SELECT parent_id FROM prompt_group_folders WHERE id = ?1",
                    [cursor],
                    |r| r.get(0),
                )
                .map_err(|e| match e {
                    rusqlite::Error::QueryReturnedNoRows => {
                        AppError::NotFound(format!("prompt_group_folder {cursor}"))
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
        "UPDATE prompt_group_folders SET parent_id = ?2, updated_at = ?3 WHERE id = ?1",
        params![id, new_parent_id, now],
    )?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("prompt_group_folder {id}")));
    }
    Ok(())
}

pub fn delete(conn: &Connection, id: i64) -> Result<(), AppError> {
    let affected = conn.execute("DELETE FROM prompt_group_folders WHERE id = ?1", [id])?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("prompt_group_folder {id}")));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repositories::prompt_group as pg_repo;
    use crate::test_utils::{create_test_prompt_group, setup_test_db};

    #[test]
    fn create_and_list() {
        let conn = setup_test_db();
        let root = insert(&conn, None, "Characters").unwrap();
        let child = insert(&conn, Some(root), "Heroes").unwrap();

        let roots = list_roots(&conn).unwrap();
        assert_eq!(roots.len(), 1);
        assert_eq!(roots[0].id, root);

        let children = list_children(&conn, root).unwrap();
        assert_eq!(children.len(), 1);
        assert_eq!(children[0].id, child);

        assert_eq!(list_all(&conn).unwrap().len(), 2);
    }

    #[test]
    fn rename_updates_title() {
        let conn = setup_test_db();
        let id = insert(&conn, None, "Old").unwrap();
        update_title(&conn, id, "New").unwrap();
        assert_eq!(find_by_id(&conn, id).unwrap().title, "New");
    }

    #[test]
    fn move_rejects_cycle_and_self() {
        let conn = setup_test_db();
        let a = insert(&conn, None, "A").unwrap();
        let b = insert(&conn, Some(a), "B").unwrap();
        assert!(matches!(
            move_to(&conn, a, Some(b)).unwrap_err(),
            AppError::Validation(_)
        ));
        assert!(matches!(
            move_to(&conn, a, Some(a)).unwrap_err(),
            AppError::Validation(_)
        ));
    }

    #[test]
    fn delete_cascades_children_and_groups() {
        let conn = setup_test_db();
        let root = insert(&conn, None, "Root").unwrap();
        let child = insert(&conn, Some(root), "Child").unwrap();

        let pg = create_test_prompt_group(&conn);
        pg_repo::set_folder(&conn, &pg.id, Some(child)).unwrap();

        delete(&conn, root).unwrap();
        assert!(find_by_id(&conn, root).is_err());
        assert!(find_by_id(&conn, child).is_err());
        // The prompt_group was cascaded because folder_id pointed into the
        // deleted subtree.
        assert!(pg_repo::find_by_id(&conn, &pg.id).is_err());
    }

    #[test]
    fn next_sort_key_increments_per_parent() {
        let conn = setup_test_db();
        assert_eq!(next_sort_key(&conn, None).unwrap(), 0);
        let a = insert(&conn, None, "A").unwrap();
        assert_eq!(next_sort_key(&conn, None).unwrap(), 1);
        assert_eq!(next_sort_key(&conn, Some(a)).unwrap(), 0);
    }
}
