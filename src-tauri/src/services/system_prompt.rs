use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::{CategoryDto, PromptGroupRow, SystemTagDto};
use crate::repositories::prompt_group as pg_repo;
use crate::state::{SystemPromptDB, SystemTag};
use rand::seq::SliceRandom;
use std::collections::HashMap;
use std::io::BufRead;

fn category_name(id: u8) -> &'static str {
    match id {
        0 => "一般タグ",
        1 => "アーティスト",
        3 => "作品名",
        4 => "キャラクター",
        5 => "メタ",
        _ => "その他",
    }
}

pub fn load_system_prompt_db<R: BufRead>(reader: R) -> SystemPromptDB {
    let mut tags = Vec::new();
    let mut by_category: HashMap<u8, Vec<usize>> = HashMap::new();

    for line in reader.lines() {
        let line = match line {
            Ok(l) => l,
            Err(_) => continue,
        };
        if line.is_empty() {
            continue;
        }

        if let Some(tag) = parse_csv_line(&line) {
            let idx = tags.len();
            by_category.entry(tag.category).or_default().push(idx);
            tags.push(tag);
        }
    }

    SystemPromptDB { tags, by_category }
}

fn parse_csv_line(line: &str) -> Option<SystemTag> {
    // Format: tag_name,category,post_count,"alias1,alias2" or tag_name,category,post_count,
    // Need to handle quoted aliases field
    let mut fields = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;

    for ch in line.chars() {
        if ch == '"' {
            in_quotes = !in_quotes;
        } else if ch == ',' && !in_quotes {
            fields.push(std::mem::take(&mut current));
        } else {
            current.push(ch);
        }
    }
    fields.push(current);

    if fields.len() < 3 {
        return None;
    }

    let name = fields[0].clone();
    let category: u8 = fields[1].parse().ok()?;
    let post_count: u64 = fields[2].parse().ok()?;
    let aliases: Vec<String> = if fields.len() > 3 && !fields[3].is_empty() {
        fields[3].split(',').map(|s| s.trim().to_string()).collect()
    } else {
        Vec::new()
    };

    Some(SystemTag {
        name,
        category,
        post_count,
        aliases,
    })
}

pub fn get_categories(db: &SystemPromptDB) -> Vec<CategoryDto> {
    let mut categories: Vec<CategoryDto> = db
        .by_category
        .iter()
        .map(|(&id, indices)| CategoryDto {
            id,
            name: category_name(id).to_string(),
            count: indices.len(),
        })
        .collect();
    categories.sort_by_key(|c| c.id);
    categories
}

pub fn search_system_prompts(
    db: &SystemPromptDB,
    query: &str,
    category: Option<u8>,
    limit: usize,
) -> Vec<SystemTagDto> {
    let query_lower = query.to_lowercase();
    let mut results = Vec::new();

    let all_indices: Vec<usize>;
    let indices: &[usize] = match category {
        Some(cat) => match db.by_category.get(&cat) {
            Some(indices) => indices,
            None => return results,
        },
        None => {
            all_indices = (0..db.tags.len()).collect();
            &all_indices
        }
    };

    for &idx in indices {
        let tag = &db.tags[idx];
        let name_lower = tag.name.to_lowercase();
        let matches = name_lower.contains(&query_lower)
            || tag
                .aliases
                .iter()
                .any(|a: &String| a.to_lowercase().contains(&query_lower));

        if matches {
            results.push(SystemTagDto {
                name: tag.name.clone(),
                category: tag.category,
                post_count: tag.post_count,
                aliases: tag.aliases.clone(),
            });
            if results.len() >= limit {
                break;
            }
        }
    }

    results
}

/// System prompt group categories to seed
const SYSTEM_CATEGORIES: &[(u8, &str)] = &[
    (0, "General Tags"),
    (1, "Artist Tags"),
    (3, "Works Tags"),
    (4, "Character Tags"),
    (5, "Meta Tags"),
];

/// Seeds system prompt groups into DB on first launch.
/// Each group represents one CSV category; tags are served from in-memory SystemPromptDB.
pub fn seed_system_prompt_groups(conn: &Connection) -> Result<(), AppError> {
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM prompt_groups WHERE is_system = 1",
        [],
        |row| row.get(0),
    )?;
    if count > 0 {
        return Ok(());
    }

    let now = chrono::Utc::now().to_rfc3339();
    for &(cat_id, name) in SYSTEM_CATEGORIES {
        let row = PromptGroupRow {
            id: format!("system-group-cat-{cat_id}"),
            name: name.to_string(),
            genre_id: None,
            is_default_for_genre: 0,
            is_system: 1,
            usage_type: "both".to_string(),
            created_at: now.clone(),
            updated_at: now.clone(),
            thumbnail_path: None,
            is_default: 0,
            category: Some(cat_id as i32),
        };
        pg_repo::insert(conn, &row)?;
    }
    Ok(())
}

/// List tags for a system prompt group by category, with optional search and pagination.
pub fn list_system_group_tags(
    db: &SystemPromptDB,
    category: u8,
    query: Option<&str>,
    offset: usize,
    limit: usize,
) -> (Vec<SystemTagDto>, usize) {
    let indices = match db.by_category.get(&category) {
        Some(indices) => indices,
        None => return (Vec::new(), 0),
    };

    let query_lower = query.map(|q| q.to_lowercase());

    let filtered: Vec<&SystemTag> = indices
        .iter()
        .map(|&idx| &db.tags[idx])
        .filter(|tag| {
            if let Some(ref q) = query_lower {
                let name_lower = tag.name.to_lowercase();
                name_lower.contains(q)
                    || tag.aliases.iter().any(|a| a.to_lowercase().contains(q))
            } else {
                true
            }
        })
        .collect();

    let total_count = filtered.len();
    let results: Vec<SystemTagDto> = filtered
        .into_iter()
        .skip(offset)
        .take(limit)
        .map(|tag| SystemTagDto {
            name: tag.name.clone(),
            category: tag.category,
            post_count: tag.post_count,
            aliases: tag.aliases.clone(),
        })
        .collect();

    (results, total_count)
}

pub fn get_random_tags(db: &SystemPromptDB, category: u8, count: usize) -> Vec<SystemTagDto> {
    let indices = match db.by_category.get(&category) {
        Some(indices) => indices,
        None => return Vec::new(),
    };
    let mut rng = rand::thread_rng();
    let selected: Vec<&usize> = indices.choose_multiple(&mut rng, count.min(indices.len())).collect();
    selected
        .into_iter()
        .map(|&idx| {
            let tag = &db.tags[idx];
            SystemTagDto {
                name: tag.name.clone(),
                category: tag.category,
                post_count: tag.post_count,
                aliases: tag.aliases.clone(),
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
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
        let groups = crate::repositories::prompt_group::list(&conn, None, None).unwrap();
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
        let groups2 = crate::repositories::prompt_group::list(&conn, None, None).unwrap();
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
}
