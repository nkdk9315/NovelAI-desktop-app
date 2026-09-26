// Favorited non-artist nax.moe tags (migration 027). Keyed by `tag_key`, so
// a tag is favorited once regardless of which gallery/model it was seen in.

use rusqlite::{params, Connection};

use crate::error::AppError;
use crate::models::dto::NaxFavoriteTagDto;

use super::nax::tag_key;

pub fn list(conn: &Connection) -> Result<Vec<NaxFavoriteTagDto>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT tag, category, created_at FROM nax_favorite_tags ORDER BY created_at DESC, tag_key",
    )?;
    let rows = stmt.query_map([], |r| {
        Ok(NaxFavoriteTagDto { tag: r.get(0)?, category: r.get(1)?, created_at: r.get(2)? })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

/// Add the tag if absent, remove it if present. Returns the new state.
pub fn toggle(conn: &Connection, tag: &str, category: &str, now: &str) -> Result<bool, AppError> {
    let key = tag_key(tag);
    let removed = conn.execute("DELETE FROM nax_favorite_tags WHERE tag_key = ?1", [&key])?;
    if removed > 0 {
        return Ok(false);
    }
    conn.execute(
        "INSERT INTO nax_favorite_tags (tag_key, tag, category, created_at) VALUES (?1, ?2, ?3, ?4)",
        params![key, tag.trim(), category, now],
    )?;
    Ok(true)
}
