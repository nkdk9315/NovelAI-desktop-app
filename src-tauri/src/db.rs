use rusqlite::Connection;

use crate::error::AppError;

const MIGRATION_001: &str = include_str!("../migrations/001_init.sql");
const MIGRATION_002: &str = include_str!("../migrations/002_vibe_ux.sql");
const MIGRATION_003: &str = include_str!("../migrations/003_vibe_favorite.sql");
const MIGRATION_004: &str = include_str!("../migrations/004_preset_thumbnail.sql");
const MIGRATION_005: &str = include_str!("../migrations/005_preset_vibe_strength.sql");
const MIGRATION_006: &str = include_str!("../migrations/006_preset_favorite.sql");
const MIGRATION_007: &str = include_str!("../migrations/007_preset_model.sql");

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

    Ok(())
}
