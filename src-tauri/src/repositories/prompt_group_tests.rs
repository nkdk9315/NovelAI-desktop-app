use super::*;
use crate::test_utils::{create_test_genre, create_test_prompt_group, setup_test_db};

#[test]
fn test_list_filter_search() {
    let conn = setup_test_db();
    let mut pg = create_test_prompt_group(&conn);
    pg.name = "Unique Searchable Name".to_string();
    conn.execute(
        "UPDATE prompt_groups SET name = ?2 WHERE id = ?1",
        rusqlite::params![pg.id, pg.name],
    )
    .unwrap();

    let found = list(&conn, Some("Searchable")).unwrap();
    assert_eq!(found.len(), 1);

    let not_found = list(&conn, Some("NonExistent")).unwrap();
    assert!(not_found.is_empty());
}

#[test]
fn test_list_returns_all() {
    let conn = setup_test_db();
    create_test_prompt_group(&conn);
    create_test_prompt_group(&conn);
    create_test_prompt_group(&conn);
    let all = list(&conn, None).unwrap();
    assert_eq!(all.len(), 3);
}

#[test]
fn test_insert_and_find_by_id() {
    let conn = setup_test_db();
    let pg = create_test_prompt_group(&conn);

    let found = find_by_id(&conn, &pg.id).unwrap();
    assert_eq!(found.name, pg.name);
    assert!(found.genre_id.is_none());
    assert_eq!(found.is_system, 0);
    assert!(found.folder_id.is_none());
}

#[test]
fn test_update() {
    let conn = setup_test_db();
    let mut pg = create_test_prompt_group(&conn);

    pg.name = "Updated Name".to_string();
    pg.is_default = 1;
    pg.updated_at = "2026-06-01T00:00:00Z".to_string();
    update(&conn, &pg).unwrap();

    let found = find_by_id(&conn, &pg.id).unwrap();
    assert_eq!(found.name, "Updated Name");
    assert_eq!(found.is_default, 1);
}

#[test]
fn test_delete() {
    let conn = setup_test_db();
    let pg = create_test_prompt_group(&conn);

    let tags = vec![(
        uuid::Uuid::new_v4().to_string(),
        "".to_string(),
        "tag1".to_string(),
        0,
        0,
        None,
    )];
    replace_tags(&conn, &pg.id, &tags).unwrap();

    delete(&conn, &pg.id).unwrap();
    assert!(find_by_id(&conn, &pg.id).is_err());
    let remaining = find_tags_by_group(&conn, &pg.id).unwrap();
    assert!(remaining.is_empty());
}

#[test]
fn test_replace_tags() {
    let conn = setup_test_db();
    let pg = create_test_prompt_group(&conn);

    let tags1 = vec![
        (uuid::Uuid::new_v4().to_string(), "Entry A".to_string(), "tag_a".to_string(), 0, 3, None),
        (uuid::Uuid::new_v4().to_string(), "Entry B".to_string(), "tag_b".to_string(), 1, -2, Some("/tmp/thumb.png".to_string())),
    ];
    replace_tags(&conn, &pg.id, &tags1).unwrap();
    let found = find_tags_by_group(&conn, &pg.id).unwrap();
    assert_eq!(found.len(), 2);
    assert_eq!(found[0].tag, "tag_a");
    assert_eq!(found[0].default_strength, 3);
    assert_eq!(found[1].thumbnail_path.as_deref(), Some("/tmp/thumb.png"));

    let tags2 = vec![
        (uuid::Uuid::new_v4().to_string(), "Entry X".to_string(), "tag_x".to_string(), 0, 0, None),
    ];
    replace_tags(&conn, &pg.id, &tags2).unwrap();
    let found = find_tags_by_group(&conn, &pg.id).unwrap();
    assert_eq!(found.len(), 1);
    assert_eq!(found[0].tag, "tag_x");
}

#[test]
fn test_default_genres_round_trip() {
    let conn = setup_test_db();
    let pg = create_test_prompt_group(&conn);
    let g1 = create_test_genre(&conn);
    let g2 = create_test_genre(&conn);

    set_default_genres(&conn, &pg.id, &[g1.id.clone(), g2.id.clone()]).unwrap();
    let listed = list_default_genres(&conn, &pg.id).unwrap();
    assert_eq!(listed.len(), 2);
    assert!(listed.contains(&g1.id));
    assert!(listed.contains(&g2.id));

    // Replacing with a smaller set removes the old ones.
    set_default_genres(&conn, &pg.id, std::slice::from_ref(&g1.id)).unwrap();
    let listed = list_default_genres(&conn, &pg.id).unwrap();
    assert_eq!(listed, vec![g1.id.clone()]);

    // Reverse lookup: find groups that default-show under a genre.
    let groups = list_groups_for_default_genre(&conn, &g1.id).unwrap();
    assert_eq!(groups, vec![pg.id.clone()]);
}

#[test]
fn test_set_folder_and_counts() {
    let conn = setup_test_db();
    conn.execute(
        "INSERT INTO prompt_group_folders (id, title, parent_id, sort_key) VALUES (1, 'F', NULL, 0)",
        [],
    )
    .unwrap();

    let pg = create_test_prompt_group(&conn);
    set_folder(&conn, &pg.id, Some(1)).unwrap();
    let reloaded = find_by_id(&conn, &pg.id).unwrap();
    assert_eq!(reloaded.folder_id, Some(1));

    assert_eq!(count_by_folder(&conn, 1).unwrap(), 1);
    let removed = delete_by_folder(&conn, 1).unwrap();
    assert_eq!(removed, 1);
    assert_eq!(count_by_folder(&conn, 1).unwrap(), 0);
}
