use rusqlite::Connection;

use crate::models::dto::{
    GeneratedImageRow, GenreRow, PromptGroupRow, ProjectRow, StylePresetRow, VibeRow,
};

const MIGRATION_001: &str = include_str!("../migrations/001_init.sql");
const MIGRATION_002: &str = include_str!("../migrations/002_vibe_ux.sql");
const MIGRATION_003: &str = include_str!("../migrations/003_vibe_favorite.sql");
const MIGRATION_004: &str = include_str!("../migrations/004_preset_thumbnail.sql");
const MIGRATION_005: &str = include_str!("../migrations/005_preset_vibe_strength.sql");
const MIGRATION_006: &str = include_str!("../migrations/006_preset_favorite.sql");
const MIGRATION_007: &str = include_str!("../migrations/007_preset_model.sql");
const MIGRATION_008: &str = include_str!("../migrations/008_project_thumbnail.sql");
const MIGRATION_013: &str = include_str!("../migrations/013_tag_database.sql");

pub fn setup_test_db() -> Connection {
    let conn = Connection::open_in_memory().unwrap();
    conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
    )
    .unwrap();
    conn.execute_batch(MIGRATION_001).unwrap();
    conn.execute_batch(MIGRATION_002).unwrap();
    conn.execute_batch(MIGRATION_003).unwrap();
    conn.execute_batch(MIGRATION_004).unwrap();
    conn.execute_batch(MIGRATION_005).unwrap();
    conn.execute_batch(MIGRATION_006).unwrap();
    conn.execute_batch(MIGRATION_007).unwrap();
    conn.execute_batch(MIGRATION_008).unwrap();
    conn.execute_batch(MIGRATION_013).unwrap();
    conn
}

pub fn create_test_project(conn: &Connection) -> ProjectRow {
    let row = ProjectRow {
        id: uuid::Uuid::new_v4().to_string(),
        name: "Test Project".to_string(),
        project_type: "simple".to_string(),
        directory_path: "/tmp/test-project".to_string(),
        created_at: "2026-01-01T00:00:00Z".to_string(),
        updated_at: "2026-01-01T00:00:00Z".to_string(),
        thumbnail_path: None,
    };
    crate::repositories::project::insert(conn, &row).unwrap();
    row
}

pub fn create_test_genre(conn: &Connection) -> GenreRow {
    let row = GenreRow {
        id: uuid::Uuid::new_v4().to_string(),
        name: format!("Test Genre {}", &uuid::Uuid::new_v4().to_string()[..8]),
        is_system: 0,
        sort_order: 10,
        created_at: "2026-01-01T00:00:00Z".to_string(),
    };
    crate::repositories::genre::insert(conn, &row).unwrap();
    row
}

pub fn create_test_prompt_group(conn: &Connection, genre_id: &str) -> PromptGroupRow {
    let row = PromptGroupRow {
        id: uuid::Uuid::new_v4().to_string(),
        name: format!("Test Group {}", &uuid::Uuid::new_v4().to_string()[..8]),
        genre_id: Some(genre_id.to_string()),
        is_default_for_genre: 0,
        is_system: 0,
        usage_type: "both".to_string(),
        created_at: "2026-01-01T00:00:00Z".to_string(),
        updated_at: "2026-01-01T00:00:00Z".to_string(),
    };
    crate::repositories::prompt_group::insert(conn, &row).unwrap();
    row
}

pub fn create_test_image(conn: &Connection, project_id: &str, is_saved: i32) -> GeneratedImageRow {
    let row = GeneratedImageRow {
        id: uuid::Uuid::new_v4().to_string(),
        project_id: project_id.to_string(),
        file_path: format!("images/{}.png", uuid::Uuid::new_v4()),
        seed: 12345,
        prompt_snapshot: "test prompt".to_string(),
        width: 832,
        height: 1216,
        model: "nai-diffusion-4-curated-preview".to_string(),
        is_saved,
        created_at: "2026-01-01T00:00:00Z".to_string(),
    };
    crate::repositories::image::insert(conn, &row).unwrap();
    row
}

pub fn create_test_vibe(conn: &Connection) -> VibeRow {
    let row = VibeRow {
        id: uuid::Uuid::new_v4().to_string(),
        name: format!("Test Vibe {}", &uuid::Uuid::new_v4().to_string()[..8]),
        file_path: format!("/tmp/vibes/{}.naiv4vibe", uuid::Uuid::new_v4()),
        model: "nai-diffusion-4-curated-preview".to_string(),
        created_at: "2026-01-01T00:00:00Z".to_string(),
        thumbnail_path: None,
        is_favorite: false,
    };
    crate::repositories::vibe::insert(conn, &row).unwrap();
    row
}

pub fn create_test_style_preset(conn: &Connection, vibe_ids: &[String]) -> StylePresetRow {
    use crate::models::dto::PresetVibeRef;
    let row = StylePresetRow {
        id: uuid::Uuid::new_v4().to_string(),
        name: format!("Test Preset {}", &uuid::Uuid::new_v4().to_string()[..8]),
        artist_tags: serde_json::to_string(&["artist1", "artist2"]).unwrap(),
        created_at: "2026-01-01T00:00:00Z".to_string(),
        thumbnail_path: None,
        is_favorite: false,
        model: "nai-diffusion-4-5-full".to_string(),
    };
    crate::repositories::style_preset::insert(conn, &row).unwrap();
    if !vibe_ids.is_empty() {
        let refs: Vec<PresetVibeRef> = vibe_ids.iter().map(|id| PresetVibeRef { vibe_id: id.clone(), strength: 0.7 }).collect();
        crate::repositories::style_preset::replace_vibe_refs(conn, &row.id, &refs).unwrap();
    }
    row
}
