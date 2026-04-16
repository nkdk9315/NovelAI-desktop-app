use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::{AssetFolderDto, CountByIdDto};
use crate::repositories::vibe as vibe_repo;
use crate::repositories::vibe_folder as repo;

pub fn list_roots(conn: &Connection) -> Result<Vec<AssetFolderDto>, AppError> {
    Ok(repo::list_roots(conn)?.into_iter().map(Into::into).collect())
}

pub fn list_children(conn: &Connection, parent_id: i64) -> Result<Vec<AssetFolderDto>, AppError> {
    Ok(repo::list_children(conn, parent_id)?
        .into_iter()
        .map(Into::into)
        .collect())
}

pub fn create(
    conn: &Connection,
    parent_id: Option<i64>,
    title: &str,
) -> Result<AssetFolderDto, AppError> {
    let id = repo::create(conn, parent_id, title)?;
    Ok(repo::find(conn, id)?.into())
}

pub fn rename(conn: &Connection, id: i64, title: &str) -> Result<(), AppError> {
    repo::rename(conn, id, title)
}

pub fn move_folder(
    conn: &Connection,
    id: i64,
    new_parent_id: Option<i64>,
) -> Result<(), AppError> {
    repo::move_folder(conn, id, new_parent_id)
}

/// Delete a folder and every vibe stored inside it or any of its sub-folders.
/// Vibe files on disk are removed via `services::vibe::delete_vibe`, which
/// also cleans up thumbnails and preset-vibe junction rows. Sub-folders are
/// cascaded by the FK on `vibe_folders.parent_id`.
pub fn delete(conn: &Connection, id: i64) -> Result<(), AppError> {
    // Collect the folder and all its descendants via a recursive CTE.
    let mut stmt = conn.prepare(
        "WITH RECURSIVE d(id) AS (
             SELECT id FROM vibe_folders WHERE id = ?1
             UNION ALL
             SELECT c.id FROM vibe_folders c JOIN d ON c.parent_id = d.id
         )
         SELECT id FROM d",
    )?;
    let descendants: Vec<i64> = stmt
        .query_map([id], |r| r.get::<_, i64>(0))?
        .collect::<Result<Vec<_>, _>>()?;
    drop(stmt);

    if !descendants.is_empty() {
        let placeholders = descendants.iter().map(|_| "?").collect::<Vec<_>>().join(",");
        // SAFETY: `placeholders` is a sequence of "?" literals, not user input.
        let sql = ["SELECT id FROM vibes WHERE folder_id IN (", &placeholders, ")"].concat();
        let mut stmt = conn.prepare(&sql)?;
        let params: Vec<&dyn rusqlite::ToSql> = descendants
            .iter()
            .map(|v| v as &dyn rusqlite::ToSql)
            .collect();
        let vibe_ids: Vec<String> = stmt
            .query_map(params.as_slice(), |r| r.get::<_, String>(0))?
            .collect::<Result<Vec<_>, _>>()?;
        drop(stmt);
        for vibe_id in vibe_ids {
            crate::services::vibe::delete_vibe(conn, &vibe_id)?;
        }
    }

    repo::delete(conn, id)
}

pub fn set_vibe_folder(
    conn: &Connection,
    vibe_id: &str,
    folder_id: Option<i64>,
) -> Result<(), AppError> {
    if let Some(fid) = folder_id {
        repo::find(conn, fid)?;
    }
    vibe_repo::set_folder(conn, vibe_id, folder_id)
}

pub fn count_vibes_per_folder(conn: &Connection) -> Result<Vec<CountByIdDto>, AppError> {
    Ok(vibe_repo::count_by_folder(conn)?
        .into_iter()
        .map(|(folder_id, count)| CountByIdDto {
            id: folder_id.unwrap_or(-1),
            count,
        })
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{create_test_vibe, setup_test_db};
    use crate::repositories::vibe as vibe_repo;

    #[test]
    fn delete_cascades_items_in_subtree() {
        let conn = setup_test_db();
        let root = create(&conn, None, "Root").unwrap();
        let child = create(&conn, Some(root.id), "Child").unwrap();

        let v1 = create_test_vibe(&conn);
        let v2 = create_test_vibe(&conn);
        let v3 = create_test_vibe(&conn); // outside the tree — must survive
        vibe_repo::set_folder(&conn, &v1.id, Some(root.id)).unwrap();
        vibe_repo::set_folder(&conn, &v2.id, Some(child.id)).unwrap();

        delete(&conn, root.id).unwrap();

        assert!(vibe_repo::find_by_id(&conn, &v1.id).is_err());
        assert!(vibe_repo::find_by_id(&conn, &v2.id).is_err());
        assert!(vibe_repo::find_by_id(&conn, &v3.id).is_ok());
    }
}
