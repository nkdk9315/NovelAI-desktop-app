// Repository for the tag database (tags + tag_groups + tag_group_members).
//
// All reads use prepared statements. Write operations that modify tag_groups
// enforce `source = 'user'` so seeded rows cannot be renamed/moved/deleted.
//
// Favorite-filtered queries (favorite tree, counting, orphans) live in the
// sibling `tag_favorite` module to stay within the 300-line limit.

use rusqlite::{Connection, params};

use crate::error::AppError;
use crate::models::dto::{TagGroupRow, TagRow};

// ---- Reads ----

/// Wrap a raw user query in double quotes so the FTS5 parser treats it as a
/// literal phrase, escaping any embedded quotes. The trigram tokenizer
/// handles the rest — no operator characters need stripping.
fn to_fts_match(raw: &str) -> String {
    let escaped = raw.replace('"', "\"\"");
    format!("\"{escaped}\"")
}

pub fn search(
    conn: &Connection,
    query: &str,
    group_id: Option<i64>,
    limit: usize,
) -> Result<Vec<TagRow>, AppError> {
    let match_query = to_fts_match(query);
    let sql = "
        SELECT t.id, t.name, t.csv_category
        FROM tags_fts f
        JOIN tags t ON t.id = f.rowid
        WHERE tags_fts MATCH ?1
          AND (?2 IS NULL OR EXISTS (
              SELECT 1 FROM tag_group_members m
              WHERE m.tag_id = t.id AND m.group_id = ?2
          ))
        ORDER BY rank
        LIMIT ?3";
    let mut stmt = conn.prepare(sql)?;
    let rows = stmt.query_map(params![match_query, group_id, limit as i64], map_tag_row)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

/// LIKE-based fallback used when the query is shorter than 3 characters —
/// the trigram FTS index has no trigrams to match against below that
/// threshold.
pub fn search_like(
    conn: &Connection,
    query: &str,
    group_id: Option<i64>,
    limit: usize,
) -> Result<Vec<TagRow>, AppError> {
    let escaped = query.replace('\\', "\\\\").replace('%', "\\%").replace('_', "\\_");
    let pattern = format!("%{escaped}%");
    let prefix = format!("{escaped}%");
    let sql = "
        SELECT t.id, t.name, t.csv_category
        FROM tags t
        WHERE t.name LIKE ?1 ESCAPE '\\'
          AND (?2 IS NULL OR EXISTS (
              SELECT 1 FROM tag_group_members m
              WHERE m.tag_id = t.id AND m.group_id = ?2
          ))
        ORDER BY
            CASE
                WHEN t.name = ?3 THEN 0
                WHEN t.name LIKE ?4 ESCAPE '\\' THEN 1
                ELSE 2
            END,
            t.name
        LIMIT ?5";
    let mut stmt = conn.prepare(sql)?;
    let rows = stmt.query_map(
        params![pattern, group_id, query, prefix, limit as i64],
        map_tag_row,
    )?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

/// Return all tag_groups that the given tag belongs to directly.
pub fn list_parent_groups(conn: &Connection, tag_id: i64) -> Result<Vec<TagGroupRow>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT g.id, g.slug, g.title, g.parent_id, g.kind, g.source, g.sort_key,
                (SELECT COUNT(*) FROM tag_groups c WHERE c.parent_id = g.id),
                g.is_favorite
         FROM tag_group_members m
         JOIN tag_groups g ON g.id = m.group_id
         WHERE m.tag_id = ?1
         ORDER BY g.sort_key, g.title",
    )?;
    let rows = stmt.query_map([tag_id], map_group_row)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

// ---- Groups ----

pub fn list_roots(conn: &Connection) -> Result<Vec<TagGroupRow>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, slug, title, parent_id, kind, source, sort_key,
                (SELECT COUNT(*) FROM tag_groups c WHERE c.parent_id = tag_groups.id),
                is_favorite
         FROM tag_groups WHERE parent_id IS NULL ORDER BY sort_key, title",
    )?;
    let rows = stmt.query_map([], map_group_row)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

pub fn list_children(conn: &Connection, parent_id: i64) -> Result<Vec<TagGroupRow>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, slug, title, parent_id, kind, source, sort_key,
                (SELECT COUNT(*) FROM tag_groups c WHERE c.parent_id = tag_groups.id),
                is_favorite
         FROM tag_groups WHERE parent_id = ?1 ORDER BY sort_key, title",
    )?;
    let rows = stmt.query_map([parent_id], map_group_row)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

pub fn find_group(conn: &Connection, group_id: i64) -> Result<TagGroupRow, AppError> {
    conn.query_row(
        "SELECT id, slug, title, parent_id, kind, source, sort_key,
                (SELECT COUNT(*) FROM tag_groups c WHERE c.parent_id = tag_groups.id),
                is_favorite
         FROM tag_groups WHERE id = ?1",
        [group_id],
        map_group_row,
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => {
            AppError::NotFound(format!("tag_group {group_id}"))
        }
        _ => e.into(),
    })
}

pub fn list_group_tags(
    conn: &Connection,
    group_id: i64,
    limit: usize,
) -> Result<Vec<TagRow>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT t.id, t.name, t.csv_category
         FROM tag_group_members m JOIN tags t ON t.id = m.tag_id
         WHERE m.group_id = ?1 ORDER BY t.name LIMIT ?2",
    )?;
    let rows = stmt.query_map(params![group_id, limit as i64], map_tag_row)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

// ---- User writes ----

pub fn create_user_group(
    conn: &Connection,
    parent_id: Option<i64>,
    title: &str,
) -> Result<i64, AppError> {
    if title.trim().is_empty() {
        return Err(AppError::Validation("title must not be empty".into()));
    }
    let now = chrono::Utc::now().to_rfc3339();
    let slug = format!("user:{}", uuid::Uuid::new_v4());
    conn.execute(
        "INSERT INTO tag_groups (slug, title, parent_id, kind, source, sort_key, created_at, updated_at)
         VALUES (?1, ?2, ?3, 'user', 'user', 0, ?4, ?4)",
        params![slug, title, parent_id, now],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn rename_user_group(
    conn: &Connection,
    group_id: i64,
    title: &str,
) -> Result<(), AppError> {
    if title.trim().is_empty() {
        return Err(AppError::Validation("title must not be empty".into()));
    }
    let now = chrono::Utc::now().to_rfc3339();
    let affected = conn.execute(
        "UPDATE tag_groups SET title = ?2, updated_at = ?3 WHERE id = ?1 AND source = 'user'",
        params![group_id, title, now],
    )?;
    if affected == 0 {
        return Err(AppError::Validation(
            "cannot rename: group is seeded or does not exist".into(),
        ));
    }
    Ok(())
}

pub fn move_user_group(
    conn: &Connection,
    group_id: i64,
    new_parent_id: Option<i64>,
) -> Result<(), AppError> {
    let now = chrono::Utc::now().to_rfc3339();
    let affected = conn.execute(
        "UPDATE tag_groups SET parent_id = ?2, updated_at = ?3 WHERE id = ?1 AND source = 'user'",
        params![group_id, new_parent_id, now],
    )?;
    if affected == 0 {
        return Err(AppError::Validation(
            "cannot move: group is seeded or does not exist".into(),
        ));
    }
    Ok(())
}

pub fn delete_user_group(conn: &Connection, group_id: i64) -> Result<(), AppError> {
    let affected = conn.execute(
        "DELETE FROM tag_groups WHERE id = ?1 AND source = 'user'",
        [group_id],
    )?;
    if affected == 0 {
        return Err(AppError::Validation(
            "cannot delete: group is seeded or does not exist".into(),
        ));
    }
    Ok(())
}

pub fn add_members(
    conn: &Connection,
    group_id: i64,
    tag_ids: &[i64],
) -> Result<usize, AppError> {
    let mut stmt = conn.prepare(
        "INSERT OR IGNORE INTO tag_group_members (tag_id, group_id, source) VALUES (?1, ?2, 'user')",
    )?;
    let mut added = 0;
    for &tag_id in tag_ids {
        added += stmt.execute(params![tag_id, group_id])?;
    }
    Ok(added)
}

pub fn remove_members(
    conn: &Connection,
    group_id: i64,
    tag_ids: &[i64],
) -> Result<usize, AppError> {
    let mut stmt = conn.prepare(
        "DELETE FROM tag_group_members WHERE group_id = ?1 AND tag_id = ?2 AND source = 'user'",
    )?;
    let mut removed = 0;
    for &tag_id in tag_ids {
        removed += stmt.execute(params![group_id, tag_id])?;
    }
    Ok(removed)
}

// ---- row mappers ----

pub(super) fn map_tag_row(row: &rusqlite::Row) -> rusqlite::Result<TagRow> {
    Ok(TagRow {
        id: row.get(0)?,
        name: row.get(1)?,
        csv_category: row.get(2)?,
    })
}

pub(super) fn map_group_row(row: &rusqlite::Row) -> rusqlite::Result<TagGroupRow> {
    let is_favorite: i64 = row.get(8)?;
    Ok(TagGroupRow {
        id: row.get(0)?,
        slug: row.get(1)?,
        title: row.get(2)?,
        parent_id: row.get(3)?,
        kind: row.get(4)?,
        source: row.get(5)?,
        sort_key: row.get(6)?,
        child_count: row.get(7)?,
        is_favorite: is_favorite != 0,
    })
}
