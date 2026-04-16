use rusqlite::Connection;

use crate::error::AppError;

const MIGRATION_001: &str = include_str!("../migrations/001_init.sql");
const MIGRATION_002: &str = include_str!("../migrations/002_vibe_ux.sql");
const MIGRATION_003: &str = include_str!("../migrations/003_vibe_favorite.sql");
const MIGRATION_004: &str = include_str!("../migrations/004_preset_thumbnail.sql");
const MIGRATION_005: &str = include_str!("../migrations/005_preset_vibe_strength.sql");
const MIGRATION_006: &str = include_str!("../migrations/006_preset_favorite.sql");
const MIGRATION_007: &str = include_str!("../migrations/007_preset_model.sql");
const MIGRATION_008: &str = include_str!("../migrations/008_project_thumbnail.sql");
const MIGRATION_009: &str = include_str!("../migrations/009_prompt_group_overhaul.sql");
const MIGRATION_010: &str = include_str!("../migrations/010_prompt_entry_name.sql");
const MIGRATION_011: &str = include_str!("../migrations/011_prompt_group_default_strength.sql");
const MIGRATION_012: &str = include_str!("../migrations/012_add_main_genre.sql");
const MIGRATION_013: &str = include_str!("../migrations/013_tag_database.sql");
const MIGRATION_014: &str = include_str!("../migrations/014_tag_group_favorites.sql");
const MIGRATION_015: &str = include_str!("../migrations/015_system_group_genre_defaults.sql");
const MIGRATION_016: &str = include_str!("../migrations/016_prompt_group_random_wildcard.sql");
const MIGRATION_017: &str = include_str!("../migrations/017_vibe_folders.sql");
const MIGRATION_018: &str = include_str!("../migrations/018_style_preset_folders.sql");
const MIGRATION_019: &str = include_str!("../migrations/019_prompt_group_folders.sql");
const MIGRATION_020: &str = include_str!("../migrations/020_prompt_group_default_genres.sql");

pub fn init_db(path: &str) -> Result<Connection, AppError> {
    let conn = Connection::open(path)?;
    conn.execute_batch("PRAGMA journal_mode=WAL;")?;
    conn.execute_batch("PRAGMA foreign_keys=ON;")?;
    run_migrations(&conn)?;
    Ok(conn)
}

fn run_migrations(conn: &Connection) -> Result<(), AppError> {
    // Bootstrap: settings table may not exist yet
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
    )?;

    let version: i64 = conn
        .query_row(
            "SELECT COALESCE(
                (SELECT CAST(value AS INTEGER) FROM settings WHERE key = 'schema_version'),
                0
            )",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if version < 1 {
        conn.execute_batch(MIGRATION_001)?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params!["schema_version", "1"],
        )?;
    }

    if version < 2 {
        conn.execute_batch(MIGRATION_002)?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params!["schema_version", "2"],
        )?;
    }

    if version < 3 {
        conn.execute_batch(MIGRATION_003)?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params!["schema_version", "3"],
        )?;
    }

    if version < 4 {
        conn.execute_batch(MIGRATION_004)?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params!["schema_version", "4"],
        )?;
    }

    if version < 5 {
        conn.execute_batch(MIGRATION_005)?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params!["schema_version", "5"],
        )?;
    }

    if version < 6 {
        conn.execute_batch(MIGRATION_006)?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params!["schema_version", "6"],
        )?;
    }

    if version < 7 {
        conn.execute_batch(MIGRATION_007)?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params!["schema_version", "7"],
        )?;
    }

    if version < 8 {
        conn.execute_batch(MIGRATION_008)?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params!["schema_version", "8"],
        )?;
    }

    if version < 9 {
        conn.execute_batch(MIGRATION_009)?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params!["schema_version", "9"],
        )?;
    }

    if version < 10 {
        conn.execute_batch(MIGRATION_010)?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params!["schema_version", "10"],
        )?;
    }

    if version < 11 {
        conn.execute_batch(MIGRATION_011)?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params!["schema_version", "11"],
        )?;
    }

    if version < 12 {
        conn.execute_batch(MIGRATION_012)?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params!["schema_version", "12"],
        )?;
    }

    if version < 13 {
        conn.execute_batch(MIGRATION_013)?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params!["schema_version", "13"],
        )?;
    }

    if version < 14 {
        conn.execute_batch(MIGRATION_014)?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params!["schema_version", "14"],
        )?;
    }

    if version < 15 {
        conn.execute_batch(MIGRATION_015)?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params!["schema_version", "15"],
        )?;
    }

    if version < 16 {
        conn.execute_batch(MIGRATION_016)?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params!["schema_version", "16"],
        )?;
    }

    if version < 17 {
        conn.execute_batch(MIGRATION_017)?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params!["schema_version", "17"],
        )?;
    }

    if version < 18 {
        conn.execute_batch(MIGRATION_018)?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params!["schema_version", "18"],
        )?;
    }

    if version < 19 {
        conn.execute_batch(MIGRATION_019)?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params!["schema_version", "19"],
        )?;
    }

    if version < 20 {
        conn.execute_batch(MIGRATION_020)?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params!["schema_version", "20"],
        )?;
    }

    Ok(())
}
