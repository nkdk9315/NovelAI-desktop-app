use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::{
    CreatePromptGroupRequest, PromptGroupDto, PromptGroupRow, PromptGroupTagDto,
    UpdatePromptGroupRequest,
};
use crate::repositories::prompt_group as pg_repo;

pub fn list_prompt_groups(
    conn: &Connection,
    genre_id: Option<&str>,
    search: Option<&str>,
) -> Result<Vec<PromptGroupDto>, AppError> {
    let rows = pg_repo::list(conn, genre_id, search)?;
    let mut result = Vec::with_capacity(rows.len());
    for row in rows {
        let tags = pg_repo::find_tags_by_group(conn, &row.id)?;
        let tag_dtos: Vec<PromptGroupTagDto> = tags.into_iter().map(|t| t.into()).collect();
        result.push(row.into_dto(tag_dtos));
    }
    Ok(result)
}

pub fn get_prompt_group(conn: &Connection, id: &str) -> Result<PromptGroupDto, AppError> {
    let row = pg_repo::find_by_id(conn, id)?;
    let tags = pg_repo::find_tags_by_group(conn, &row.id)?;
    let tag_dtos: Vec<PromptGroupTagDto> = tags.into_iter().map(|t| t.into()).collect();
    Ok(row.into_dto(tag_dtos))
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
        genre_id: req.genre_id,
        is_default_for_genre: 0,
        is_system: 0,
        usage_type: "both".to_string(),
        created_at: now.clone(),
        updated_at: now,
        thumbnail_path: None,
        is_default: 0,
        category: None,
        default_strength: req.default_strength.unwrap_or(0.0),
    };
    pg_repo::insert(conn, &row)?;

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
    if let Some(genre_id) = req.genre_id {
        existing.genre_id = genre_id;
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

    existing.updated_at = chrono::Utc::now().to_rfc3339();
    pg_repo::update(conn, &existing)?;

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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::dto::TagInput;
    use crate::test_utils::{create_test_genre, setup_test_db};

    #[test]
    fn test_create_with_tags() {
        let conn = setup_test_db();
        let genre = create_test_genre(&conn);

        let pg = create_prompt_group(
            &conn,
            CreatePromptGroupRequest {
                name: "Test Group".to_string(),
                genre_id: Some(genre.id.clone()),
                tags: vec![
                    TagInput { name: None, tag: "tag1".to_string(), default_strength: None, thumbnail_path: None },
                    TagInput { name: None, tag: "tag2".to_string(), default_strength: Some(3), thumbnail_path: None },
                    TagInput { name: None, tag: "tag3".to_string(), default_strength: Some(-2), thumbnail_path: Some("/tmp/t.png".to_string()) },
                ],
                default_strength: None,
            },
        )
        .unwrap();

        assert_eq!(pg.name, "Test Group");
        assert_eq!(pg.genre_id, Some(genre.id));
        assert_eq!(pg.tags.len(), 3);
        assert_eq!(pg.tags[0].tag, "tag1");
        assert_eq!(pg.tags[0].default_strength, 0);
        assert_eq!(pg.tags[1].tag, "tag2");
        assert_eq!(pg.tags[1].default_strength, 3);
        assert_eq!(pg.tags[2].tag, "tag3");
        assert_eq!(pg.tags[2].default_strength, -2);
        assert_eq!(pg.tags[2].thumbnail_path.as_deref(), Some("/tmp/t.png"));
        assert!(!pg.is_system);
    }

    #[test]
    fn test_update_multiple_defaults_allowed() {
        let conn = setup_test_db();
        let genre = create_test_genre(&conn);

        let pg1 = create_prompt_group(
            &conn,
            CreatePromptGroupRequest {
                name: "Group A".to_string(),
                genre_id: Some(genre.id.clone()),
                tags: vec![],
                default_strength: None,
            },
        )
        .unwrap();

        let pg2 = create_prompt_group(
            &conn,
            CreatePromptGroupRequest {
                name: "Group B".to_string(),
                genre_id: Some(genre.id.clone()),
                tags: vec![],
                default_strength: None,
            },
        )
        .unwrap();

        // Set pg1 as default
        update_prompt_group(
            &conn,
            UpdatePromptGroupRequest {
                id: pg1.id.clone(),
                name: None,
                genre_id: None,
                tags: None,
                is_default: Some(true),
                thumbnail_path: None,
                default_strength: None,
            },
        )
        .unwrap();

        // Set pg2 as default — pg1 should ALSO remain default (multiple allowed)
        update_prompt_group(
            &conn,
            UpdatePromptGroupRequest {
                id: pg2.id.clone(),
                name: None,
                genre_id: None,
                tags: None,
                is_default: Some(true),
                thumbnail_path: None,
                default_strength: None,
            },
        )
        .unwrap();

        let found1 = get_prompt_group(&conn, &pg1.id).unwrap();
        let found2 = get_prompt_group(&conn, &pg2.id).unwrap();
        assert!(found1.is_default);
        assert!(found2.is_default);
    }

    #[test]
    fn test_delete_system_group_rejected() {
        let conn = setup_test_db();
        let id = uuid::Uuid::new_v4().to_string();
        pg_repo::insert(
            &conn,
            &PromptGroupRow {
                id: id.clone(),
                name: "System Group".to_string(),
                genre_id: Some("genre-male".to_string()),
                is_default_for_genre: 0,
                is_system: 1,
                usage_type: "both".to_string(),
                created_at: "2026-01-01T00:00:00Z".to_string(),
                updated_at: "2026-01-01T00:00:00Z".to_string(),
                thumbnail_path: None,
                is_default: 0,
                category: None,
                default_strength: 0.0,
            },
        )
        .unwrap();

        let result = delete_prompt_group(&conn, &id);
        assert!(result.is_err());
        match result.unwrap_err() {
            AppError::Validation(msg) => assert!(msg.contains("system")),
            other => panic!("expected Validation, got {:?}", other),
        }
    }

    #[test]
    fn test_delete_user_group() {
        let conn = setup_test_db();
        let genre = create_test_genre(&conn);
        let pg = create_prompt_group(
            &conn,
            CreatePromptGroupRequest {
                name: "Deletable".to_string(),
                genre_id: Some(genre.id),
                tags: vec![TagInput { name: None, tag: "a".to_string(), default_strength: None, thumbnail_path: None }],
                default_strength: None,
            },
        )
        .unwrap();

        delete_prompt_group(&conn, &pg.id).unwrap();
        assert!(get_prompt_group(&conn, &pg.id).is_err());
    }

    #[test]
    fn test_update_genre_id_null_clear() {
        let conn = setup_test_db();
        let genre = create_test_genre(&conn);

        let pg = create_prompt_group(
            &conn,
            CreatePromptGroupRequest {
                name: "Has Genre".to_string(),
                genre_id: Some(genre.id.clone()),
                tags: vec![],
                default_strength: None,
            },
        )
        .unwrap();
        assert_eq!(pg.genre_id, Some(genre.id));

        update_prompt_group(
            &conn,
            UpdatePromptGroupRequest {
                id: pg.id.clone(),
                name: None,
                genre_id: Some(None),
                tags: None,
                is_default: None,
                thumbnail_path: None,
                default_strength: None,
            },
        )
        .unwrap();

        let updated = get_prompt_group(&conn, &pg.id).unwrap();
        assert_eq!(updated.genre_id, None);
    }
}
