// Seed the tag database from bundled resource files on first run.
//
// Reads:
//   <resource_dir>/resources/tag_groups.json
//   <resource_dir>/resources/character_groups.json
//   <resource_dir>/resources/danbooru_tags.csv
//
// Populates: tags, tag_aliases, tag_groups, tag_group_members, tags_fts
// All inserts run inside a single transaction. Guarded by tags row count.

use std::collections::HashMap;
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;

use rusqlite::{Connection, params};
use serde::Deserialize;

use crate::error::AppError;

#[derive(Debug, Default)]
pub struct SeedStats {
    pub tags: usize,
    pub groups: usize,
    pub members: usize,
}

#[derive(Debug, Deserialize)]
struct TagGroupsFile {
    groups: Vec<ScrapedGroup>,
}

#[derive(Debug, Deserialize)]
struct ScrapedGroup {
    id: String,
    title: String,
    #[serde(default)]
    path: Vec<String>,
    #[serde(default)]
    tags: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct CharacterGroupsFile {
    works: HashMap<String, Vec<String>>,
}

/// Seed the tag database if the `tags` table is empty. Returns None if already seeded.
pub fn seed_if_empty(
    conn: &mut Connection,
    resources_dir: &Path,
) -> Result<Option<SeedStats>, AppError> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM tags", [], |r| r.get(0))?;
    if count > 0 {
        return Ok(None);
    }

    let tag_groups_path = resources_dir.join("tag_groups.json");
    let character_groups_path = resources_dir.join("character_groups.json");
    let csv_path = resources_dir.join("danbooru_tags.csv");

    let tag_groups: TagGroupsFile = read_json(&tag_groups_path)?;
    let character_groups: CharacterGroupsFile = read_json(&character_groups_path)?;

    let tx = conn.transaction()?;
    let stats = run_seed(&tx, tag_groups, character_groups, &csv_path)?;
    tx.commit()?;
    Ok(Some(stats))
}

fn read_json<T: for<'de> Deserialize<'de>>(path: &Path) -> Result<T, AppError> {
    let file = File::open(path).map_err(|e| {
        AppError::Io(format!("cannot open {}: {}", path.display(), e))
    })?;
    let reader = BufReader::new(file);
    serde_json::from_reader(reader)
        .map_err(|e| AppError::Io(format!("cannot parse {}: {}", path.display(), e)))
}

fn run_seed(
    tx: &rusqlite::Transaction<'_>,
    tag_groups: TagGroupsFile,
    character_groups: CharacterGroupsFile,
    csv_path: &Path,
) -> Result<SeedStats, AppError> {
    let mut stats = SeedStats::default();

    // --- 1. Tags + aliases from CSV ---
    //
    // We accept rows where field 0 = name, field 1 = category (0/1/3/4/5),
    // field 2 = post_count (ignored), field 3 = quoted alias list.
    {
        let mut insert_tag = tx.prepare(
            "INSERT OR IGNORE INTO tags (name, csv_category) VALUES (?1, ?2)",
        )?;
        let mut insert_alias = tx.prepare(
            "INSERT OR IGNORE INTO tag_aliases (tag_id, alias) VALUES (?1, ?2)",
        )?;
        let mut find_tag = tx.prepare("SELECT id FROM tags WHERE name = ?1")?;

        let file = File::open(csv_path).map_err(|e| {
            AppError::Io(format!("cannot open {}: {}", csv_path.display(), e))
        })?;
        let reader = BufReader::new(file);
        for line in reader.lines() {
            let line = match line {
                Ok(l) if !l.is_empty() => l,
                _ => continue,
            };
            let Some(row) = parse_csv_row(&line) else {
                continue;
            };
            if insert_tag.execute(params![row.name, row.category as i64])? == 0 {
                continue; // already present via a duplicate row
            }
            stats.tags += 1;
            if row.aliases.is_empty() {
                continue;
            }
            let tag_id: i64 = find_tag.query_row(params![row.name], |r| r.get(0))?;
            for alias in &row.aliases {
                insert_alias.execute(params![tag_id, alias])?;
            }
        }
    }

    // --- 2. Scrape-only diff tags (any tag appearing in a group but not in CSV) ---
    {
        let mut insert_tag = tx.prepare(
            "INSERT OR IGNORE INTO tags (name, csv_category) VALUES (?1, NULL)",
        )?;
        for group in &tag_groups.groups {
            for name in &group.tags {
                if insert_tag.execute(params![name])? > 0 {
                    stats.tags += 1;
                }
            }
        }
    }

    // --- 3. Build tag_groups tree ---
    //
    // Scrape tree: root → super → category → ... → group (leaves)
    // Character tree: root → "Characters (CSV)" → work (leaves)
    //
    // We cache (parent_id, segment_title) → group_id so we don't re-insert the same
    // intermediate node twice.
    let root_id = insert_group(
        tx, "root", "Tag Groups", None, "root", 0,
    )?;
    stats.groups += 1;

    let mut path_cache: HashMap<(Option<i64>, String), i64> = HashMap::new();

    // Scrape groups
    {
        let mut slug_counter: i64 = 0;
        for group in &tag_groups.groups {
            let mut parent = Some(root_id);
            // Walk the hierarchical path creating intermediate nodes as needed.
            // Each intermediate gets kind='super' if at depth 1, 'category' otherwise.
            for (depth, segment) in group.path.iter().enumerate() {
                let key = (parent, segment.clone());
                let node_id = if let Some(&id) = path_cache.get(&key) {
                    id
                } else {
                    let kind = if depth == 0 { "super" } else { "category" };
                    slug_counter += 1;
                    let slug = format!("path:{}:{}", depth, slug_counter);
                    let id = insert_group(
                        tx,
                        &slug,
                        segment,
                        parent,
                        kind,
                        depth as i64,
                    )?;
                    stats.groups += 1;
                    path_cache.insert(key, id);
                    id
                };
                parent = Some(node_id);
            }
            // Leaf: the group itself
            let leaf_slug = format!("group:{}", group.id);
            let leaf_id =
                insert_group(tx, &leaf_slug, &group.title, parent, "group", 0)?;
            stats.groups += 1;

            // Members
            let mut insert_member = tx.prepare(
                "INSERT OR IGNORE INTO tag_group_members (tag_id, group_id, source) VALUES ((SELECT id FROM tags WHERE name = ?1), ?2, 'seed')",
            )?;
            for name in &group.tags {
                if insert_member.execute(params![name, leaf_id])? > 0 {
                    stats.members += 1;
                }
            }
        }
    }

    // Character tree
    {
        let characters_root = insert_group(
            tx,
            "super:characters_csv",
            "Characters (by work)",
            Some(root_id),
            "super",
            99,
        )?;
        stats.groups += 1;

        let mut insert_member = tx.prepare(
            "INSERT OR IGNORE INTO tag_group_members (tag_id, group_id, source) VALUES ((SELECT id FROM tags WHERE name = ?1), ?2, 'seed')",
        )?;

        // Deterministic order for diff-friendly seeds.
        let mut works: Vec<(&String, &Vec<String>)> =
            character_groups.works.iter().collect();
        works.sort_by(|a, b| a.0.cmp(b.0));

        for (work, tags) in works {
            let slug = format!("work:{}", work);
            let title = prettify_work_title(work);
            let work_id = insert_group(
                tx,
                &slug,
                &title,
                Some(characters_root),
                "work",
                0,
            )?;
            stats.groups += 1;

            for name in tags {
                if insert_member.execute(params![name, work_id])? > 0 {
                    stats.members += 1;
                }
            }
        }
    }

    // --- 4. Populate FTS index ---
    tx.execute_batch(
        "INSERT INTO tags_fts(rowid, name, aliases)
         SELECT t.id, t.name, COALESCE((
             SELECT GROUP_CONCAT(a.alias, ' ')
             FROM tag_aliases a WHERE a.tag_id = t.id
         ), '')
         FROM tags t;",
    )?;

    Ok(stats)
}

fn insert_group(
    tx: &rusqlite::Transaction<'_>,
    slug: &str,
    title: &str,
    parent_id: Option<i64>,
    kind: &str,
    sort_key: i64,
) -> Result<i64, AppError> {
    tx.execute(
        "INSERT INTO tag_groups (slug, title, parent_id, kind, source, sort_key) VALUES (?1, ?2, ?3, ?4, 'seed', ?5)",
        params![slug, title, parent_id, kind, sort_key],
    )?;
    Ok(tx.last_insert_rowid())
}

fn prettify_work_title(slug: &str) -> String {
    if slug == "unknown_work" {
        return "Unknown / Original".to_string();
    }
    slug.split('_')
        .map(|w| {
            let mut c = w.chars();
            match c.next() {
                Some(first) => first.to_uppercase().chain(c).collect::<String>(),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

struct CsvRow<'a> {
    name: &'a str,
    category: u8,
    aliases: Vec<String>,
}

/// Minimal CSV parser for `danbooru_tags.csv`.
///
/// Row format: `name,category,post_count,"alias1,alias2"` (post_count ignored).
/// Quoted field handling is identical to the original SystemPromptDB parser.
fn parse_csv_row(line: &str) -> Option<CsvRow<'_>> {
    let mut fields: Vec<String> = Vec::new();
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
    let category: u8 = fields[1].parse().ok()?;
    // We must borrow the name from `line`, but we already pushed it into `fields[0]`.
    // The caller only uses `name` as `&str`, so keep it from the owned string by
    // returning a ref into `line` via a rescan.
    let first_comma = line.find(',')?;
    let name = &line[..first_comma];

    let aliases = if fields.len() > 3 && !fields[3].is_empty() {
        fields[3]
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect()
    } else {
        Vec::new()
    };

    Some(CsvRow {
        name,
        category,
        aliases,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::setup_test_db;
    use std::path::PathBuf;

    fn resources_dir() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("resources")
    }

    /// End-to-end smoke: seed the real JSON + CSV resource files into an
    /// in-memory DB and verify invariants. Ignored by default because it
    /// inserts ~170k rows (~3-5s on a warm build).
    #[test]
    #[ignore]
    fn seeds_real_resources() {
        let mut conn = setup_test_db();
        let stats = seed_if_empty(&mut conn, &resources_dir())
            .unwrap()
            .expect("first seed should run");

        assert!(stats.tags > 100_000, "expected 100k+ tags, got {}", stats.tags);
        assert!(stats.groups > 200, "expected 200+ groups, got {}", stats.groups);
        assert!(stats.members > 10_000, "expected 10k+ members, got {}", stats.members);

        // Second call should be a no-op
        let second = seed_if_empty(&mut conn, &resources_dir()).unwrap();
        assert!(second.is_none());

        // black_hair should be findable via FTS and reachable under a hair-color group
        let hit: String = conn
            .query_row(
                "SELECT t.name FROM tags_fts f JOIN tags t ON t.id = f.rowid
                 WHERE tags_fts MATCH '\"black_hair\"' LIMIT 1",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(hit, "black_hair");

        // cynthia_(pokemon) should be under the pokemon work.
        let pokemon_title: String = conn
            .query_row(
                "SELECT g.title FROM tag_groups g
                 JOIN tag_group_members m ON m.group_id = g.id
                 JOIN tags t ON t.id = m.tag_id
                 WHERE t.name = 'cynthia_(pokemon)' AND g.slug = 'work:pokemon'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(pokemon_title, "Pokemon");
    }
}

