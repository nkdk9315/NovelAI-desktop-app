use crate::models::dto::{CategoryDto, SystemTagDto};
use crate::state::{SystemPromptDB, SystemTag};
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
