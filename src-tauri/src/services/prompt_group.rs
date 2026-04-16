use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::{
    CreatePromptGroupRequest, PromptGroupDto, PromptGroupRow, PromptGroupTagDto,
    UpdatePromptGroupRequest,
};
use crate::repositories::prompt_group as pg_repo;

fn row_into_dto(conn: &Connection, row: PromptGroupRow) -> Result<PromptGroupDto, AppError> {
    let tag_rows = pg_repo::find_tags_by_group(conn, &row.id)?;
    let tag_dtos: Vec<PromptGroupTagDto> = tag_rows.into_iter().map(Into::into).collect();
    let default_genre_ids = pg_repo::list_default_genres(conn, &row.id)?;
    Ok(row.into_dto(tag_dtos, default_genre_ids))
}

pub fn list_prompt_groups(
    conn: &Connection,
    search: Option<&str>,
) -> Result<Vec<PromptGroupDto>, AppError> {
    let rows = pg_repo::list(conn, search)?;
    let mut result = Vec::with_capacity(rows.len());
    for row in rows {
        result.push(row_into_dto(conn, row)?);
    }
    Ok(result)
}

pub fn get_prompt_group(conn: &Connection, id: &str) -> Result<PromptGroupDto, AppError> {
    let row = pg_repo::find_by_id(conn, id)?;
    row_into_dto(conn, row)
}

pub fn create_prompt_group(
    conn: &Connection,
    req: CreatePromptGroupRequest,
) -> Result<PromptGroupDto, AppError> {
    let now = chrono::Utc::now().to_rfc3339();
    let id = uuid::Uuid::new_v4().to_string();

    let row = PromptGroupRow {
        id: id.clone(),
        name: req.name,
        genre_id: None,
        is_default_for_genre: 0,
        is_system: 0,
        usage_type: "both".to_string(),
        created_at: now.clone(),
        updated_at: now,
        thumbnail_path: None,
        is_default: 0,
        category: None,
        default_strength: req.default_strength.unwrap_or(0.0),
        random_mode: 0,
        random_count: 1,
        random_source: "enabled".to_string(),
        wildcard_token: None,
    };
    pg_repo::insert(conn, &row)?;

    pg_repo::set_default_genres(conn, &id, &req.default_genre_ids)?;

    let tag_tuples: Vec<(String, String, String, i32, i32, Option<String>)> = req
        .tags
        .iter()
        .enumerate()
        .map(|(i, t)| {
            (
                uuid::Uuid::new_v4().to_string(),
                t.name.clone().unwrap_or_default(),
                t.tag.clone(),
                i as i32,
                t.default_strength.unwrap_or(0),
                t.thumbnail_path.clone(),
            )
        })
        .collect();
    pg_repo::replace_tags(conn, &id, &tag_tuples)?;

    get_prompt_group(conn, &id)
}

pub fn update_prompt_group(
    conn: &Connection,
    req: UpdatePromptGroupRequest,
) -> Result<(), AppError> {
    let mut existing = pg_repo::find_by_id(conn, &req.id)?;

    if let Some(name) = req.name {
        existing.name = name;
    }
    if let Some(is_default) = req.is_default {
        existing.is_default = i32::from(is_default);
    }
    if let Some(thumbnail_path) = req.thumbnail_path {
        existing.thumbnail_path = thumbnail_path;
    }
    if let Some(default_strength) = req.default_strength {
        existing.default_strength = default_strength;
    }
    if let Some(random_mode) = req.random_mode {
        existing.random_mode = i32::from(random_mode);
    }
    if let Some(random_count) = req.random_count {
        if random_count < 1 {
            return Err(AppError::Validation(
                "random_count must be >= 1".to_string(),
            ));
        }
        existing.random_count = random_count;
    }
    if let Some(random_source) = req.random_source {
        if random_source != "all" && random_source != "enabled" {
            return Err(AppError::Validation(
                "random_source must be 'all' or 'enabled'".to_string(),
            ));
        }
        existing.random_source = random_source;
    }
    if let Some(wildcard_token) = req.wildcard_token {
        existing.wildcard_token = wildcard_token.and_then(|s| {
            let trimmed = s.trim().to_string();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed)
            }
        });
    }

    existing.updated_at = chrono::Utc::now().to_rfc3339();
    pg_repo::update(conn, &existing)?;

    if let Some(default_genre_ids) = req.default_genre_ids {
        pg_repo::set_default_genres(conn, &req.id, &default_genre_ids)?;
    }

    if let Some(tags) = req.tags {
        let tag_tuples: Vec<(String, String, String, i32, i32, Option<String>)> = tags
            .iter()
            .enumerate()
            .map(|(i, t)| {
                (
                    uuid::Uuid::new_v4().to_string(),
                    t.name.clone().unwrap_or_default(),
                    t.tag.clone(),
                    i as i32,
                    t.default_strength.unwrap_or(0),
                    t.thumbnail_path.clone(),
                )
            })
            .collect();
        pg_repo::replace_tags(conn, &req.id, &tag_tuples)?;
    }

    Ok(())
}

pub fn update_prompt_group_thumbnail(
    conn: &Connection,
    id: &str,
    thumbnail_path: Option<&str>,
) -> Result<(), AppError> {
    let mut existing = pg_repo::find_by_id(conn, id)?;
    existing.thumbnail_path = thumbnail_path.map(|s| s.to_string());
    existing.updated_at = chrono::Utc::now().to_rfc3339();
    pg_repo::update(conn, &existing)?;
    Ok(())
}

pub fn delete_prompt_group(conn: &Connection, id: &str) -> Result<(), AppError> {
    let row = pg_repo::find_by_id(conn, id)?;
    if row.is_system != 0 {
        return Err(AppError::Validation(
            "system prompt group cannot be deleted".to_string(),
        ));
    }
    pg_repo::delete(conn, id)?;
    Ok(())
}

pub fn list_default_genres(
    conn: &Connection,
    prompt_group_id: &str,
) -> Result<Vec<String>, AppError> {
    pg_repo::list_default_genres(conn, prompt_group_id)
}

pub fn set_default_genres(
    conn: &Connection,
    prompt_group_id: &str,
    genre_ids: &[String],
) -> Result<(), AppError> {
    // Confirm the group exists so the UI gets a clean error.
    pg_repo::find_by_id(conn, prompt_group_id)?;
    pg_repo::set_default_genres(conn, prompt_group_id, genre_ids)
}

#[cfg(test)]
#[path = "prompt_group_tests.rs"]
mod tests;
