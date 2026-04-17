use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::PresetFolderDto;
use crate::repositories::preset_folder as repo;
use crate::repositories::prompt_preset as preset_repo;

pub fn list_all(conn: &Connection) -> Result<Vec<PresetFolderDto>, AppError> {
    Ok(repo::list_all(conn)?.into_iter().map(Into::into).collect())
}

pub fn create(
    conn: &Connection,
    parent_id: Option<i64>,
    title: &str,
) -> Result<PresetFolderDto, AppError> {
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

pub fn delete(conn: &Connection, id: i64) -> Result<(), AppError> {
    repo::delete(conn, id)
}

pub fn delete_presets_in_folder(conn: &Connection, folder_id: i64) -> Result<usize, AppError> {
    repo::find_by_id(conn, folder_id)?;
    let descendants = collect_subtree(conn, folder_id)?;
    let mut removed = 0usize;
    for fid in descendants {
        removed += preset_repo::delete_by_folder(conn, fid)?;
    }
    Ok(removed)
}

pub fn count_presets_in_subtree(conn: &Connection, folder_id: i64) -> Result<i64, AppError> {
    let descendants = collect_subtree(conn, folder_id)?;
    let mut total = 0i64;
    for fid in descendants {
        total += preset_repo::count_by_folder(conn, fid)?;
    }
    Ok(total)
}

fn collect_subtree(conn: &Connection, root: i64) -> Result<Vec<i64>, AppError> {
    let mut stmt = conn.prepare(
        "WITH RECURSIVE d(id) AS (
             SELECT id FROM preset_folders WHERE id = ?1
             UNION ALL
             SELECT c.id FROM preset_folders c JOIN d ON c.parent_id = d.id
         )
         SELECT id FROM d",
    )?;
    let ids: Vec<i64> = stmt
        .query_map([root], |r| r.get::<_, i64>(0))?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(ids)
}

pub fn set_preset_folder(
    conn: &Connection,
    preset_id: &str,
    folder_id: Option<i64>,
) -> Result<(), AppError> {
    if let Some(fid) = folder_id {
        repo::find_by_id(conn, fid)?;
    }
    preset_repo::set_folder(conn, preset_id, folder_id)
}
