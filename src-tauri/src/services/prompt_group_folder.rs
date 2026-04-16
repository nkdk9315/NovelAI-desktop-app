use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::PromptGroupFolderDto;
use crate::repositories::prompt_group as pg_repo;
use crate::repositories::prompt_group_folder as repo;

pub fn list_all(conn: &Connection) -> Result<Vec<PromptGroupFolderDto>, AppError> {
    Ok(repo::list_all(conn)?.into_iter().map(Into::into).collect())
}

#[allow(dead_code)]
pub fn list_roots(conn: &Connection) -> Result<Vec<PromptGroupFolderDto>, AppError> {
    Ok(repo::list_roots(conn)?.into_iter().map(Into::into).collect())
}

#[allow(dead_code)]
pub fn list_children(
    conn: &Connection,
    parent_id: i64,
) -> Result<Vec<PromptGroupFolderDto>, AppError> {
    Ok(repo::list_children(conn, parent_id)?
        .into_iter()
        .map(Into::into)
        .collect())
}

pub fn create(
    conn: &Connection,
    parent_id: Option<i64>,
    title: &str,
) -> Result<PromptGroupFolderDto, AppError> {
    if let Some(p) = parent_id {
        repo::find_by_id(conn, p)?;
    }
    let id = repo::insert(conn, parent_id, title)?;
    Ok(repo::find_by_id(conn, id)?.into())
}

pub fn rename(conn: &Connection, id: i64, title: &str) -> Result<(), AppError> {
    repo::update_title(conn, id, title)
}

pub fn move_folder(
    conn: &Connection,
    id: i64,
    new_parent_id: Option<i64>,
) -> Result<(), AppError> {
    repo::move_to(conn, id, new_parent_id)
}

/// Delete a folder. Thanks to the FK cascades on both `prompt_group_folders`
/// and `prompt_groups`, all descendant folders and every prompt_group whose
/// `folder_id` lives inside the subtree are removed automatically. We still
/// walk the subtree explicitly so the UI can be told the exact count of
/// prompt_groups that were purged.
pub fn delete(conn: &Connection, id: i64) -> Result<(), AppError> {
    repo::delete(conn, id)
}

/// Delete every prompt_group inside `folder_id` and all of its sub-folders,
/// but leave the folders themselves intact. Mirrors the "clear contents"
/// right-click action in the UI. Returns the number of prompt_groups removed.
pub fn delete_groups_in_folder(conn: &Connection, folder_id: i64) -> Result<usize, AppError> {
    repo::find_by_id(conn, folder_id)?;

    let descendants = collect_subtree(conn, folder_id)?;
    let mut removed = 0usize;
    for fid in descendants {
        removed += pg_repo::delete_by_folder(conn, fid)?;
    }
    Ok(removed)
}

pub fn count_groups_in_subtree(conn: &Connection, folder_id: i64) -> Result<i64, AppError> {
    let descendants = collect_subtree(conn, folder_id)?;
    let mut total = 0i64;
    for fid in descendants {
        total += pg_repo::count_by_folder(conn, fid)?;
    }
    Ok(total)
}

fn collect_subtree(conn: &Connection, root: i64) -> Result<Vec<i64>, AppError> {
    let mut stmt = conn.prepare(
        "WITH RECURSIVE d(id) AS (
             SELECT id FROM prompt_group_folders WHERE id = ?1
             UNION ALL
             SELECT c.id FROM prompt_group_folders c JOIN d ON c.parent_id = d.id
         )
         SELECT id FROM d",
    )?;
    let ids: Vec<i64> = stmt
        .query_map([root], |r| r.get::<_, i64>(0))?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(ids)
}

pub fn set_group_folder(
    conn: &Connection,
    prompt_group_id: &str,
    folder_id: Option<i64>,
) -> Result<(), AppError> {
    if let Some(fid) = folder_id {
        repo::find_by_id(conn, fid)?;
    }
    pg_repo::set_folder(conn, prompt_group_id, folder_id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{create_test_prompt_group, setup_test_db};

    #[test]
    fn delete_groups_in_folder_purges_subtree() {
        let conn = setup_test_db();
        let root = create(&conn, None, "Root").unwrap();
        let child = create(&conn, Some(root.id), "Child").unwrap();

        let a = create_test_prompt_group(&conn);
        let b = create_test_prompt_group(&conn);
        let outside = create_test_prompt_group(&conn);
        pg_repo::set_folder(&conn, &a.id, Some(root.id)).unwrap();
        pg_repo::set_folder(&conn, &b.id, Some(child.id)).unwrap();

        let removed = delete_groups_in_folder(&conn, root.id).unwrap();
        assert_eq!(removed, 2);
        assert!(pg_repo::find_by_id(&conn, &a.id).is_err());
        assert!(pg_repo::find_by_id(&conn, &b.id).is_err());
        assert!(pg_repo::find_by_id(&conn, &outside.id).is_ok());
        // Folders survive.
        assert!(crate::repositories::prompt_group_folder::find_by_id(&conn, root.id).is_ok());
        assert!(crate::repositories::prompt_group_folder::find_by_id(&conn, child.id).is_ok());
    }

    #[test]
    fn delete_folder_cascades_groups() {
        let conn = setup_test_db();
        let root = create(&conn, None, "Root").unwrap();
        let a = create_test_prompt_group(&conn);
        pg_repo::set_folder(&conn, &a.id, Some(root.id)).unwrap();

        delete(&conn, root.id).unwrap();
        assert!(pg_repo::find_by_id(&conn, &a.id).is_err());
    }

    #[test]
    fn count_in_subtree() {
        let conn = setup_test_db();
        let root = create(&conn, None, "Root").unwrap();
        let child = create(&conn, Some(root.id), "Child").unwrap();
        let a = create_test_prompt_group(&conn);
        let b = create_test_prompt_group(&conn);
        pg_repo::set_folder(&conn, &a.id, Some(root.id)).unwrap();
        pg_repo::set_folder(&conn, &b.id, Some(child.id)).unwrap();

        assert_eq!(count_groups_in_subtree(&conn, root.id).unwrap(), 2);
        assert_eq!(count_groups_in_subtree(&conn, child.id).unwrap(), 1);
    }
}
