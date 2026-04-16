use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::{AssetFolderDto, CountByIdDto};
use crate::repositories::style_preset as preset_repo;
use crate::repositories::style_preset_folder as repo;

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

/// Delete a folder and every style preset in its subtree.
pub fn delete(conn: &Connection, id: i64) -> Result<(), AppError> {
    let mut stmt = conn.prepare(
        "WITH RECURSIVE d(id) AS (
             SELECT id FROM style_preset_folders WHERE id = ?1
             UNION ALL
             SELECT c.id FROM style_preset_folders c JOIN d ON c.parent_id = d.id
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
        let sql = ["SELECT id FROM style_presets WHERE folder_id IN (", &placeholders, ")"].concat();
        let mut stmt = conn.prepare(&sql)?;
        let params: Vec<&dyn rusqlite::ToSql> = descendants
            .iter()
            .map(|v| v as &dyn rusqlite::ToSql)
            .collect();
        let preset_ids: Vec<String> = stmt
            .query_map(params.as_slice(), |r| r.get::<_, String>(0))?
            .collect::<Result<Vec<_>, _>>()?;
        drop(stmt);
        for preset_id in preset_ids {
            crate::services::style_preset::delete_style_preset(conn, &preset_id)?;
        }
    }

    repo::delete(conn, id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repositories::style_preset as preset_repo;
    use crate::test_utils::{create_test_style_preset, setup_test_db};

    #[test]
    fn delete_cascades_presets_in_subtree() {
        let conn = setup_test_db();
        let root = create(&conn, None, "Root").unwrap();
        let child = create(&conn, Some(root.id), "Child").unwrap();

        let p1 = create_test_style_preset(&conn, &[]);
        let p2 = create_test_style_preset(&conn, &[]);
        let p3 = create_test_style_preset(&conn, &[]); // outside — must survive
        preset_repo::set_folder(&conn, &p1.id, Some(root.id)).unwrap();
        preset_repo::set_folder(&conn, &p2.id, Some(child.id)).unwrap();

        delete(&conn, root.id).unwrap();

        assert!(preset_repo::find_by_id(&conn, &p1.id).is_err());
        assert!(preset_repo::find_by_id(&conn, &p2.id).is_err());
        assert!(preset_repo::find_by_id(&conn, &p3.id).is_ok());
    }
}

pub fn set_preset_folder(
    conn: &Connection,
    preset_id: &str,
    folder_id: Option<i64>,
) -> Result<(), AppError> {
    if let Some(fid) = folder_id {
        repo::find(conn, fid)?;
    }
    preset_repo::set_folder(conn, preset_id, folder_id)
}

pub fn count_presets_per_folder(conn: &Connection) -> Result<Vec<CountByIdDto>, AppError> {
    Ok(preset_repo::count_by_folder(conn)?
        .into_iter()
        .map(|(folder_id, count)| CountByIdDto {
            id: folder_id.unwrap_or(-1),
            count,
        })
        .collect())
}
