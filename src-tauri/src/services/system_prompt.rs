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
    let terms: Vec<String> = query.split_whitespace().map(|t| t.to_lowercase()).collect();
    if terms.is_empty() {
        return Vec::new();
    }
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
        let matches = terms.iter().all(|t| {
            name_lower.contains(t.as_str())
                || tag.aliases.iter().any(|a| a.to_lowercase().contains(t.as_str()))
        });

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
            default_strength: 0.0,
            random_mode: 0,
            random_count: 1,
            random_source: "enabled".to_string(),
            wildcard_token: None,
            folder_id: None,
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
#[path = "system_prompt_tests.rs"]
mod tests;
