use rusqlite::Connection;

use crate::models::dto::{GeneratedImageRow, ProjectRow};

const MIGRATION_001: &str = include_str!("../migrations/001_init.sql");

pub fn setup_test_db() -> Connection {
    let conn = Connection::open_in_memory().unwrap();
    conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
    )
    .unwrap();
    conn.execute_batch(MIGRATION_001).unwrap();
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
    };
    crate::repositories::project::insert(conn, &row).unwrap();
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
