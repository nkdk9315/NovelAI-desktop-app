// Repository for the tag database (tags + tag_groups + tag_group_members).
//
// All reads use prepared statements. Write operations that modify tag_groups
// enforce `source = 'user'` so seeded rows cannot be renamed/moved/deleted.

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
    // With the trigram tokenizer, MATCH supports prefix/substring search on
    // any characters. Escape the query into a quoted FTS5 phrase here so the
    // service layer stays unaware of FTS5 syntax.
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
/// threshold. Slower (no index for the middle-match case) but bounded by
/// `limit`, so acceptable for 1-2 character queries.
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

/// Per-group tag membership count — used by the left tree UI to show
/// how many tags each leaf group holds without issuing one IPC per row.
/// One GROUP BY on `tag_group_members`. Runs once per modal open.
pub fn count_tag_members_per_group(conn: &Connection) -> Result<Vec<(i64, i64)>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT group_id, COUNT(*) FROM tag_group_members GROUP BY group_id",
    )?;
    let rows = stmt.query_map([], |r| Ok((r.get::<_, i64>(0)?, r.get::<_, i64>(1)?)))?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

/// For each branch that has at least one favorited descendant, return
/// the total count of favorited nodes strictly below it. Walks up the
/// `parent_id` chain from every favorited row, using UNION (de-dup) so
/// each (favorited_id, ancestor_id) pair appears once.
pub fn count_favorite_descendants_per_group(
    conn: &Connection,
) -> Result<Vec<(i64, i64)>, AppError> {
    let sql = "
        WITH RECURSIVE ancestors(leaf_id, ancestor_id) AS (
            SELECT id, parent_id FROM tag_groups
            WHERE is_favorite = 1 AND parent_id IS NOT NULL
            UNION
            SELECT a.leaf_id, tg.parent_id
            FROM tag_groups tg
            JOIN ancestors a ON tg.id = a.ancestor_id
            WHERE tg.parent_id IS NOT NULL
        )
        SELECT ancestor_id, COUNT(*) FROM ancestors GROUP BY ancestor_id";
    let mut stmt = conn.prepare(sql)?;
    let rows = stmt.query_map([], |r| Ok((r.get::<_, i64>(0)?, r.get::<_, i64>(1)?)))?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

/// Return all tag_groups that the given tag belongs to directly (via
/// `tag_group_members`). Used by the global search UI to show "this tag
/// lives in these groups".
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

// Recursive CTE: node ids that either are favorited themselves or are
// ancestors of a favorited node. Used to filter the tree to only branches
// that contain at least one favorited leaf.
const FAVORITE_ANCESTORS_CTE: &str = "
    WITH RECURSIVE favorite_ancestors(id) AS (
        SELECT id FROM tag_groups WHERE is_favorite = 1
        UNION
        SELECT tg.parent_id FROM tag_groups tg
            JOIN favorite_ancestors fa ON tg.id = fa.id
            WHERE tg.parent_id IS NOT NULL
    )";

pub fn list_favorite_roots(conn: &Connection) -> Result<Vec<TagGroupRow>, AppError> {
    let sql = format!(
        "{FAVORITE_ANCESTORS_CTE}
         SELECT id, slug, title, parent_id, kind, source, sort_key,
                (SELECT COUNT(*) FROM tag_groups c
                   WHERE c.parent_id = tag_groups.id
                     AND c.id IN (SELECT id FROM favorite_ancestors)),
                is_favorite
         FROM tag_groups
         WHERE parent_id IS NULL
           AND id IN (SELECT id FROM favorite_ancestors)
         ORDER BY sort_key, title"
    );
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map([], map_group_row)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

pub fn list_favorite_children(
    conn: &Connection,
    parent_id: i64,
) -> Result<Vec<TagGroupRow>, AppError> {
    let sql = format!(
        "{FAVORITE_ANCESTORS_CTE}
         SELECT id, slug, title, parent_id, kind, source, sort_key,
                (SELECT COUNT(*) FROM tag_groups c
                   WHERE c.parent_id = tag_groups.id
                     AND c.id IN (SELECT id FROM favorite_ancestors)),
                is_favorite
         FROM tag_groups
         WHERE parent_id = ?1
           AND id IN (SELECT id FROM favorite_ancestors)
         ORDER BY sort_key, title"
    );
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map([parent_id], map_group_row)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

pub fn toggle_favorite(conn: &Connection, group_id: i64) -> Result<bool, AppError> {
    let affected = conn.execute(
        "UPDATE tag_groups SET is_favorite = 1 - is_favorite WHERE id = ?1",
        [group_id],
    )?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("tag_group {group_id}")));
    }
    let is_favorite: i64 = conn.query_row(
        "SELECT is_favorite FROM tag_groups WHERE id = ?1",
        [group_id],
        |r| r.get(0),
    )?;
    Ok(is_favorite != 0)
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

/// Return tags with the given `csv_category` that do NOT appear in any
/// `tag_group_members` row — i.e. tags the seed scrape could not place
/// into any hierarchical group. Used by the "Unclassified" virtual tree
/// node so the user can still reach them from the left pane.
///
/// `letter_bucket` optionally narrows to a single first-letter bucket so
/// the UI can serve them under a sidebar letter sub-tree:
///   * `Some("A")..=Some("Z")` — name starts with that letter (any case)
///   * `Some("0-9")` — name starts with a digit
///   * `Some("#")` — anything else (symbols, CJK, etc.)
///   * `None` — no filter
pub fn list_orphan_tags_by_category(
    conn: &Connection,
    csv_category: i64,
    letter_bucket: Option<&str>,
    limit: usize,
) -> Result<Vec<TagRow>, AppError> {
    let (extra_where, letter_param): (&str, Option<String>) = match letter_bucket {
        None => ("", None),
        Some("0-9") => (" AND SUBSTR(t.name, 1, 1) GLOB '[0-9]'", None),
        Some("#") => (
            " AND NOT (UPPER(SUBSTR(t.name, 1, 1)) GLOB '[A-Z]' OR SUBSTR(t.name, 1, 1) GLOB '[0-9]')",
            None,
        ),
        Some(letter) if letter.chars().count() == 1 => (
            " AND UPPER(SUBSTR(t.name, 1, 1)) = ?3",
            Some(letter.to_uppercase()),
        ),
        _ => ("", None),
    };
    let sql = format!(
        "SELECT t.id, t.name, t.csv_category
         FROM tags t
         WHERE t.csv_category = ?1
           AND NOT EXISTS (
               SELECT 1 FROM tag_group_members m WHERE m.tag_id = t.id
           ){extra_where}
         ORDER BY t.name
         LIMIT ?2"
    );
    let mut stmt = conn.prepare(&sql)?;
    let rows = if let Some(l) = letter_param {
        stmt.query_map(params![csv_category, limit as i64, l], map_tag_row)?
            .collect::<Result<Vec<_>, _>>()
    } else {
        stmt.query_map(params![csv_category, limit as i64], map_tag_row)?
            .collect::<Result<Vec<_>, _>>()
    };
    rows.map_err(Into::into)
}

pub fn list_unclassified_characters(
    conn: &Connection,
    limit: usize,
) -> Result<Vec<TagRow>, AppError> {
    // csv_category=4 tags that are only reachable under unknown_work (or not in
    // any group at all). Useful for "organize my characters" UX.
    let sql = "
        SELECT t.id, t.name, t.csv_category
        FROM tags t
        WHERE t.csv_category = 4
          AND NOT EXISTS (
              SELECT 1 FROM tag_group_members m
              JOIN tag_groups g ON g.id = m.group_id
              WHERE m.tag_id = t.id
                AND g.slug != 'work:unknown_work'
          )
        ORDER BY t.name
        LIMIT ?1";
    let mut stmt = conn.prepare(sql)?;
    let rows = stmt.query_map([limit as i64], map_tag_row)?;
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
    // Only user-added memberships may be removed so seed data stays stable.
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

fn map_tag_row(row: &rusqlite::Row) -> rusqlite::Result<TagRow> {
    Ok(TagRow {
        id: row.get(0)?,
        name: row.get(1)?,
        csv_category: row.get(2)?,
    })
}

fn map_group_row(row: &rusqlite::Row) -> rusqlite::Result<TagGroupRow> {
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
