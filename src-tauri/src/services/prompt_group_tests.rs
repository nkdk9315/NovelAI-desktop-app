use super::*;
use crate::models::dto::TagInput;
use crate::test_utils::{create_test_genre, setup_test_db};

fn empty_create(name: &str) -> CreatePromptGroupRequest {
    CreatePromptGroupRequest {
        name: name.to_string(),
        folder_id: None,
        default_genre_ids: vec![],
        tags: vec![],
        default_strength: None,
    }
}

#[test]
fn test_create_with_tags() {
    let conn = setup_test_db();

    let pg = create_prompt_group(
        &conn,
        CreatePromptGroupRequest {
            name: "Test Group".to_string(),
            folder_id: None,
            default_genre_ids: vec![],
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
    assert_eq!(pg.tags.len(), 3);
    assert_eq!(pg.tags[1].default_strength, 3);
    assert!(pg.default_genre_ids.is_empty());
    assert!(pg.folder_id.is_none());
    assert!(!pg.is_system);
}

#[test]
fn test_create_with_folder_and_default_genres() {
    let conn = setup_test_db();
    let g1 = create_test_genre(&conn);
    let g2 = create_test_genre(&conn);
    conn.execute(
        "INSERT INTO prompt_group_folders (id, title, parent_id, sort_key) VALUES (1, 'F', NULL, 0)",
        [],
    )
    .unwrap();

    let pg = create_prompt_group(
        &conn,
        CreatePromptGroupRequest {
            name: "G".to_string(),
            folder_id: Some(1),
            default_genre_ids: vec![g1.id.clone(), g2.id.clone()],
            tags: vec![],
            default_strength: None,
        },
    )
    .unwrap();

    assert_eq!(pg.folder_id, Some(1));
    assert_eq!(pg.default_genre_ids.len(), 2);
}

#[test]
fn test_update_default_genres_replaces() {
    let conn = setup_test_db();
    let g1 = create_test_genre(&conn);
    let g2 = create_test_genre(&conn);

    let pg = create_prompt_group(
        &conn,
        CreatePromptGroupRequest {
            name: "G".to_string(),
            folder_id: None,
            default_genre_ids: vec![g1.id.clone()],
            tags: vec![],
            default_strength: None,
        },
    )
    .unwrap();

    update_prompt_group(
        &conn,
        UpdatePromptGroupRequest {
            id: pg.id.clone(),
            name: None,
            folder_id: None,
            default_genre_ids: Some(vec![g2.id.clone()]),
            tags: None,
            is_default: None,
            thumbnail_path: None,
            default_strength: None,
            random_mode: None,
            random_count: None,
            random_source: None,
            wildcard_token: None,
        },
    )
    .unwrap();

    let reloaded = get_prompt_group(&conn, &pg.id).unwrap();
    assert_eq!(reloaded.default_genre_ids, vec![g2.id]);
}

#[test]
fn test_update_folder_id_partial() {
    let conn = setup_test_db();
    conn.execute(
        "INSERT INTO prompt_group_folders (id, title, parent_id, sort_key) VALUES (1, 'F', NULL, 0)",
        [],
    )
    .unwrap();
    let pg = create_prompt_group(&conn, empty_create("G")).unwrap();

    update_prompt_group(
        &conn,
        UpdatePromptGroupRequest {
            id: pg.id.clone(),
            name: None,
            folder_id: Some(Some(1)),
            default_genre_ids: None,
            tags: None,
            is_default: None,
            thumbnail_path: None,
            default_strength: None,
            random_mode: None,
            random_count: None,
            random_source: None,
            wildcard_token: None,
        },
    )
    .unwrap();
    assert_eq!(get_prompt_group(&conn, &pg.id).unwrap().folder_id, Some(1));

    // Clear back to NULL via Some(None).
    update_prompt_group(
        &conn,
        UpdatePromptGroupRequest {
            id: pg.id.clone(),
            name: None,
            folder_id: Some(None),
            default_genre_ids: None,
            tags: None,
            is_default: None,
            thumbnail_path: None,
            default_strength: None,
            random_mode: None,
            random_count: None,
            random_source: None,
            wildcard_token: None,
        },
    )
    .unwrap();
    assert!(get_prompt_group(&conn, &pg.id).unwrap().folder_id.is_none());
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
            genre_id: None,
            is_default_for_genre: 0,
            is_system: 1,
            usage_type: "both".to_string(),
            created_at: "2026-01-01T00:00:00Z".to_string(),
            updated_at: "2026-01-01T00:00:00Z".to_string(),
            thumbnail_path: None,
            is_default: 0,
            category: None,
            default_strength: 0.0,
            random_mode: 0,
            random_count: 1,
            random_source: "enabled".to_string(),
            wildcard_token: None,
            folder_id: None,
        },
    )
    .unwrap();

    let result = delete_prompt_group(&conn, &id);
    assert!(matches!(result, Err(AppError::Validation(_))));
}

#[test]
fn test_delete_user_group() {
    let conn = setup_test_db();
    let pg = create_prompt_group(&conn, empty_create("Deletable")).unwrap();
    delete_prompt_group(&conn, &pg.id).unwrap();
    assert!(get_prompt_group(&conn, &pg.id).is_err());
}
