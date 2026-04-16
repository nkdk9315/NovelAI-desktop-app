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
