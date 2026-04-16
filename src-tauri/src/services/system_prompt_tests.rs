use super::*;

fn test_db() -> SystemPromptDB {
    let csv = "\
1girl,0,7553466,\"sole_female,1girls\"
highres,5,7126634,\"high_resolution,high_res,hires\"
solo,0,9129586,
hatsune_miku,4,200000,miku
touhou,3,500000,
miyuki_(artist),1,10000,
long_hair,0,5915693,
";
    load_system_prompt_db(csv.as_bytes())
}

#[test]
fn test_get_categories() {
    let db = test_db();
    let cats = get_categories(&db);
    assert!(!cats.is_empty());

    // Check category 0 (一般タグ) has 3 tags: 1girl, solo, long_hair
    let general = cats.iter().find(|c| c.id == 0).unwrap();
    assert_eq!(general.name, "一般タグ");
    assert_eq!(general.count, 3);

    // Category 4 (キャラクター) has 1
    let char_cat = cats.iter().find(|c| c.id == 4).unwrap();
    assert_eq!(char_cat.name, "キャラクター");
    assert_eq!(char_cat.count, 1);
}

#[test]
fn test_search_partial_match() {
    let db = test_db();

    // Partial match on tag name
    let results = search_system_prompts(&db, "girl", None, 50);
    assert_eq!(results.len(), 1);
    assert_eq!(results[0].name, "1girl");

    // Partial match on alias
    let results = search_system_prompts(&db, "sole_female", None, 50);
    assert_eq!(results.len(), 1);
    assert_eq!(results[0].name, "1girl");

    // Case-insensitive
    let results = search_system_prompts(&db, "MIKU", None, 50);
    assert_eq!(results.len(), 1);
    assert_eq!(results[0].name, "hatsune_miku");
}

#[test]
fn test_search_category_filter() {
    let db = test_db();

    // Filter by category 0 (General)
    let results = search_system_prompts(&db, "girl", Some(0), 50);
    assert_eq!(results.len(), 1);

    // Filter by category 4 (Character) - no "girl" match
    let results = search_system_prompts(&db, "girl", Some(4), 50);
    assert!(results.is_empty());

    // Filter by non-existent category
    let results = search_system_prompts(&db, "girl", Some(99), 50);
    assert!(results.is_empty());
}

#[test]
fn test_seed_system_prompt_groups() {
    let conn = crate::test_utils::setup_test_db();
    seed_system_prompt_groups(&conn).unwrap();

    // Should create 5 system groups
    let groups = crate::repositories::prompt_group::list(&conn, None).unwrap();
    let system_groups: Vec<_> = groups.iter().filter(|g| g.is_system != 0).collect();
    assert_eq!(system_groups.len(), 5);

    // Verify categories
    let cats: Vec<Option<i32>> = system_groups.iter().map(|g| g.category).collect();
    assert!(cats.contains(&Some(0)));
    assert!(cats.contains(&Some(1)));
    assert!(cats.contains(&Some(3)));
    assert!(cats.contains(&Some(4)));
    assert!(cats.contains(&Some(5)));

    // Idempotent — running again should not create duplicates
    seed_system_prompt_groups(&conn).unwrap();
    let groups2 = crate::repositories::prompt_group::list(&conn, None).unwrap();
    let system_groups2: Vec<_> = groups2.iter().filter(|g| g.is_system != 0).collect();
    assert_eq!(system_groups2.len(), 5);
}

#[test]
fn test_list_system_group_tags() {
    let db = test_db();
    // Category 0 has 3 tags: 1girl, solo, long_hair
    let (tags, total) = list_system_group_tags(&db, 0, None, 0, 50);
    assert_eq!(total, 3);
    assert_eq!(tags.len(), 3);

    // With search filter
    let (tags, total) = list_system_group_tags(&db, 0, Some("girl"), 0, 50);
    assert_eq!(total, 1);
    assert_eq!(tags[0].name, "1girl");

    // With pagination
    let (tags, total) = list_system_group_tags(&db, 0, None, 1, 1);
    assert_eq!(total, 3);
    assert_eq!(tags.len(), 1);

    // Non-existent category
    let (tags, total) = list_system_group_tags(&db, 99, None, 0, 50);
    assert_eq!(total, 0);
    assert!(tags.is_empty());
}

#[test]
fn test_search_limit() {
    let db = test_db();

    // Search with limit 1 — should only return 1 result
    let results = search_system_prompts(&db, "r", None, 1);
    assert_eq!(results.len(), 1);

    // Search broader to get multiple
    let all = search_system_prompts(&db, "r", None, 50);
    assert!(all.len() > 1);
}
