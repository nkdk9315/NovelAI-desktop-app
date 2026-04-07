use rusqlite::Connection;

use crate::error::AppError;

const MIGRATION_001: &str = include_str!("../migrations/001_init.sql");

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

    Ok(())
}
