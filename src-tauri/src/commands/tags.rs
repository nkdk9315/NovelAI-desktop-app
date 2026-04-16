use tauri::State;

use crate::error::AppError;
use crate::models::dto::{CountByIdDto, TagDto, TagGroupDto, TagWithGroupsDto};
use crate::services::tag as svc;
use crate::state::AppState;

fn lock_db<'a>(state: &'a State<'_, AppState>) -> Result<std::sync::MutexGuard<'a, rusqlite::Connection>, AppError> {
    state
        .db
        .lock()
        .map_err(|e| AppError::Database(format!("db mutex poisoned: {e}")))
}

#[tauri::command]
pub fn search_tags(
    state: State<'_, AppState>,
    query: String,
    group_id: Option<i64>,
    limit: Option<usize>,
) -> Result<Vec<TagDto>, String> {
    let conn = lock_db(&state)?;
    svc::search(&conn, &query, group_id, limit.unwrap_or(50)).map_err(Into::into)
}

#[tauri::command]
pub fn list_tag_group_roots(state: State<'_, AppState>) -> Result<Vec<TagGroupDto>, String> {
    let conn = lock_db(&state)?;
    svc::list_roots(&conn).map_err(Into::into)
}

#[tauri::command]
pub fn get_tag_group(
    state: State<'_, AppState>,
    group_id: i64,
) -> Result<TagGroupDto, String> {
    let conn = lock_db(&state)?;
    svc::get_group(&conn, group_id).map_err(Into::into)
}

#[tauri::command]
pub fn list_tag_group_children(
    state: State<'_, AppState>,
    parent_id: i64,
) -> Result<Vec<TagGroupDto>, String> {
    let conn = lock_db(&state)?;
    svc::list_children(&conn, parent_id).map_err(Into::into)
}

#[tauri::command]
pub fn list_tag_group_tags(
    state: State<'_, AppState>,
    group_id: i64,
    limit: Option<usize>,
) -> Result<Vec<TagDto>, String> {
    let conn = lock_db(&state)?;
    // Default raised well above typical group sizes. "Unknown / Original"
    // has thousands of entries; previous 500 cap silently truncated them.
    svc::list_group_tags(&conn, group_id, limit.unwrap_or(20_000)).map_err(Into::into)
}

#[tauri::command]
pub fn list_unclassified_character_tags(
    state: State<'_, AppState>,
    limit: Option<usize>,
) -> Result<Vec<TagDto>, String> {
    let conn = lock_db(&state)?;
    svc::list_unclassified_characters(&conn, limit.unwrap_or(200)).map_err(Into::into)
}

#[tauri::command]
pub fn list_orphan_tags_by_category(
    state: State<'_, AppState>,
    csv_category: i64,
    letter_bucket: Option<String>,
    limit: Option<usize>,
) -> Result<Vec<TagDto>, String> {
    let conn = lock_db(&state)?;
    svc::list_orphan_tags_by_category(
        &conn,
        csv_category,
        letter_bucket.as_deref(),
        limit.unwrap_or(20_000),
    )
    .map_err(Into::into)
}

#[tauri::command]
pub fn create_user_tag_group(
    state: State<'_, AppState>,
    parent_id: Option<i64>,
    title: String,
) -> Result<TagGroupDto, String> {
    let conn = lock_db(&state)?;
    svc::create_user_group(&conn, parent_id, &title).map_err(Into::into)
}

#[tauri::command]
pub fn rename_tag_group(
    state: State<'_, AppState>,
    group_id: i64,
    title: String,
) -> Result<(), String> {
    let conn = lock_db(&state)?;
    svc::rename_user_group(&conn, group_id, &title).map_err(Into::into)
}

#[tauri::command]
pub fn delete_tag_group(state: State<'_, AppState>, group_id: i64) -> Result<(), String> {
    let conn = lock_db(&state)?;
    svc::delete_user_group(&conn, group_id).map_err(Into::into)
}

#[tauri::command]
pub fn move_tag_group(
    state: State<'_, AppState>,
    group_id: i64,
    new_parent_id: Option<i64>,
) -> Result<(), String> {
    let conn = lock_db(&state)?;
    svc::move_user_group(&conn, group_id, new_parent_id).map_err(Into::into)
}

#[tauri::command]
pub fn add_tags_to_group(
    state: State<'_, AppState>,
    group_id: i64,
    tag_ids: Vec<i64>,
) -> Result<usize, String> {
    let conn = lock_db(&state)?;
    svc::add_members(&conn, group_id, &tag_ids).map_err(Into::into)
}

#[tauri::command]
pub fn remove_tags_from_group(
    state: State<'_, AppState>,
    group_id: i64,
    tag_ids: Vec<i64>,
) -> Result<usize, String> {
    let conn = lock_db(&state)?;
    svc::remove_members(&conn, group_id, &tag_ids).map_err(Into::into)
}

#[tauri::command]
pub fn list_favorite_tag_group_roots(
    state: State<'_, AppState>,
) -> Result<Vec<TagGroupDto>, String> {
    let conn = lock_db(&state)?;
    svc::list_favorite_roots(&conn).map_err(Into::into)
}

#[tauri::command]
pub fn list_favorite_tag_group_children(
    state: State<'_, AppState>,
    parent_id: i64,
) -> Result<Vec<TagGroupDto>, String> {
    let conn = lock_db(&state)?;
    svc::list_favorite_children(&conn, parent_id).map_err(Into::into)
}

#[tauri::command]
pub fn count_tag_members_per_group(
    state: State<'_, AppState>,
) -> Result<Vec<CountByIdDto>, String> {
    let conn = lock_db(&state)?;
    svc::count_tag_members_per_group(&conn).map_err(Into::into)
}

#[tauri::command]
pub fn count_favorite_descendants_per_group(
    state: State<'_, AppState>,
) -> Result<Vec<CountByIdDto>, String> {
    let conn = lock_db(&state)?;
    svc::count_favorite_descendants_per_group(&conn).map_err(Into::into)
}

#[tauri::command]
pub fn search_tags_with_groups(
    state: State<'_, AppState>,
    query: String,
    limit: Option<usize>,
) -> Result<Vec<TagWithGroupsDto>, String> {
    let conn = lock_db(&state)?;
    svc::search_with_groups(&conn, &query, limit.unwrap_or(50)).map_err(Into::into)
}

#[tauri::command]
pub fn toggle_tag_group_favorite(
    state: State<'_, AppState>,
    group_id: i64,
) -> Result<bool, String> {
    let conn = lock_db(&state)?;
    svc::toggle_favorite(&conn, group_id).map_err(Into::into)
}
