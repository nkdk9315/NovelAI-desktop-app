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
    usage_type: Option<&str>,
    search: Option<&str>,
) -> Result<Vec<PromptGroupDto>, AppError> {
    let rows = pg_repo::list(conn, genre_id, usage_type, search)?;
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
        usage_type: req.usage_type,
        created_at: now.clone(),
        updated_at: now,
    };
    pg_repo::insert(conn, &row)?;

    // Insert tags
    let tag_tuples: Vec<(String, String, i32)> = req
        .tags
        .iter()
        .enumerate()
        .map(|(i, tag)| (uuid::Uuid::new_v4().to_string(), tag.clone(), i as i32))
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
    if let Some(is_default) = req.is_default_for_genre {
        existing.is_default_for_genre = i32::from(is_default);
    }

    existing.updated_at = chrono::Utc::now().to_rfc3339();
    pg_repo::update(conn, &existing)?;

    // Enforce default exclusivity
    if existing.is_default_for_genre != 0 {
        if let Some(ref genre_id) = existing.genre_id {
            pg_repo::clear_default_for_genre(conn, genre_id, &existing.id)?;
        }
    }

    if let Some(tags) = req.tags {
        let tag_tuples: Vec<(String, String, i32)> = tags
            .iter()
            .enumerate()
            .map(|(i, tag)| (uuid::Uuid::new_v4().to_string(), tag.clone(), i as i32))
            .collect();
        pg_repo::replace_tags(conn, &req.id, &tag_tuples)?;
    }

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
                usage_type: "both".to_string(),
                tags: vec!["tag1".to_string(), "tag2".to_string(), "tag3".to_string()],
            },
        )
        .unwrap();

        assert_eq!(pg.name, "Test Group");
        assert_eq!(pg.genre_id, Some(genre.id));
        assert_eq!(pg.tags.len(), 3);
        assert_eq!(pg.tags[0].tag, "tag1");
        assert_eq!(pg.tags[1].tag, "tag2");
        assert_eq!(pg.tags[2].tag, "tag3");
        assert!(!pg.is_system);
    }

    #[test]
    fn test_update_default_exclusivity() {
        let conn = setup_test_db();
        let genre = create_test_genre(&conn);

        let pg1 = create_prompt_group(
            &conn,
            CreatePromptGroupRequest {
                name: "Group A".to_string(),
                genre_id: Some(genre.id.clone()),
                usage_type: "both".to_string(),
                tags: vec![],
            },
        )
        .unwrap();

        let pg2 = create_prompt_group(
            &conn,
            CreatePromptGroupRequest {
                name: "Group B".to_string(),
                genre_id: Some(genre.id.clone()),
                usage_type: "both".to_string(),
                tags: vec![],
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
                is_default_for_genre: Some(true),
            },
        )
        .unwrap();

        // Set pg2 as default — pg1 should lose default
        update_prompt_group(
            &conn,
            UpdatePromptGroupRequest {
                id: pg2.id.clone(),
                name: None,
                genre_id: None,
                tags: None,
                is_default_for_genre: Some(true),
            },
        )
        .unwrap();

        let found1 = get_prompt_group(&conn, &pg1.id).unwrap();
        let found2 = get_prompt_group(&conn, &pg2.id).unwrap();
        assert!(!found1.is_default_for_genre);
        assert!(found2.is_default_for_genre);
    }

    #[test]
    fn test_delete_system_group_rejected() {
        let conn = setup_test_db();
        // Insert a system prompt group
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
                usage_type: "both".to_string(),
                tags: vec!["a".to_string()],
            },
        )
        .unwrap();

        delete_prompt_group(&conn, &pg.id).unwrap();
        assert!(get_prompt_group(&conn, &pg.id).is_err());
    }
}
