// Tag group favorite queries: filtered tree traversal, toggle, counting.
//
// Split from `tag.rs` to stay within the 300-line limit.

use rusqlite::{Connection, params};

use crate::error::AppError;
use crate::models::dto::{TagGroupRow, TagRow};

use super::tag::{map_group_row, map_tag_row};

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

/// Per-group tag membership count — used by the left tree UI to show
/// how many tags each leaf group holds without issuing one IPC per row.
pub fn count_tag_members_per_group(conn: &Connection) -> Result<Vec<(i64, i64)>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT group_id, COUNT(*) FROM tag_group_members GROUP BY group_id",
    )?;
    let rows = stmt.query_map([], |r| Ok((r.get::<_, i64>(0)?, r.get::<_, i64>(1)?)))?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

/// For each branch that has at least one favorited descendant, return
/// the total count of favorited nodes strictly below it.
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

/// Tags with the given `csv_category` that do NOT appear in any group.
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
