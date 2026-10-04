use rusqlite::Connection;

use crate::error::AppError;

/// Applied in order; the number is the `schema_version` reached after running it.
const MIGRATIONS: &[(i64, &str)] = &[
    (1, include_str!("../migrations/001_init.sql")),
    (2, include_str!("../migrations/002_vibe_ux.sql")),
    (3, include_str!("../migrations/003_vibe_favorite.sql")),
    (4, include_str!("../migrations/004_preset_thumbnail.sql")),
    (5, include_str!("../migrations/005_preset_vibe_strength.sql")),
    (6, include_str!("../migrations/006_preset_favorite.sql")),
    (7, include_str!("../migrations/007_preset_model.sql")),
    (8, include_str!("../migrations/008_project_thumbnail.sql")),
    (9, include_str!("../migrations/009_prompt_group_overhaul.sql")),
    (10, include_str!("../migrations/010_prompt_entry_name.sql")),
    (11, include_str!("../migrations/011_prompt_group_default_strength.sql")),
    (12, include_str!("../migrations/012_add_main_genre.sql")),
    (13, include_str!("../migrations/013_tag_database.sql")),
    (14, include_str!("../migrations/014_tag_group_favorites.sql")),
    (15, include_str!("../migrations/015_system_group_genre_defaults.sql")),
    (16, include_str!("../migrations/016_prompt_group_random_wildcard.sql")),
    (17, include_str!("../migrations/017_vibe_folders.sql")),
    (18, include_str!("../migrations/018_style_preset_folders.sql")),
    (19, include_str!("../migrations/019_prompt_group_folders.sql")),
    (20, include_str!("../migrations/020_prompt_group_default_genres.sql")),
    (21, include_str!("../migrations/021_prompt_entry_negative_prompt.sql")),
    (22, include_str!("../migrations/022_prompt_presets.sql")),
    (23, include_str!("../migrations/023_sidebar_preset_groups.sql")),
    (24, include_str!("../migrations/024_sidebar_preset_group_strength.sql")),
    (25, include_str!("../migrations/025_preset_slot_positions.sql")),
    (26, include_str!("../migrations/026_prompt_preset_sort_key.sql")),
    (27, include_str!("../migrations/027_nax_explorer.sql")),
    (28, include_str!("../migrations/028_nax_first_seen.sql")),
    (29, include_str!("../migrations/029_sprite_sets.sql")),
    (30, include_str!("../migrations/030_ai_providers.sql")),
];

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

    for (number, sql) in MIGRATIONS {
        if version < *number {
            conn.execute_batch(sql)?;
            conn.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
                rusqlite::params!["schema_version", number.to_string()],
            )?;
        }
    }

    Ok(())
}
