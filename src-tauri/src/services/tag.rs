// Thin service layer over `repositories::tag`.
//
// The main job here is turning free-text autocomplete queries into a safe
// FTS5 MATCH expression for the trigram-tokenized `tags_fts` index.

use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::{TagDto, TagGroupDto};
use crate::repositories::tag as repo;

/// Escape a user query for FTS5 MATCH. The trigram tokenizer handles any
/// characters, but we still need to double-quote the phrase so FTS5 parser
/// treats it literally (and escape any embedded double quotes).
fn to_fts_query(query: &str) -> String {
    let trimmed = query.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    let escaped = trimmed.replace('"', "\"\"");
    format!("\"{escaped}\"")
}

pub fn search(
    conn: &Connection,
    query: &str,
    group_id: Option<i64>,
    limit: usize,
) -> Result<Vec<TagDto>, AppError> {
    let fts_query = to_fts_query(query);
    if fts_query.is_empty() {
        return Ok(Vec::new());
    }
    let rows = repo::search(conn, &fts_query, group_id, limit)?;
    Ok(rows.into_iter().map(Into::into).collect())
}

pub fn list_roots(conn: &Connection) -> Result<Vec<TagGroupDto>, AppError> {
    Ok(repo::list_roots(conn)?.into_iter().map(Into::into).collect())
}

pub fn list_children(conn: &Connection, parent_id: i64) -> Result<Vec<TagGroupDto>, AppError> {
    Ok(repo::list_children(conn, parent_id)?
        .into_iter()
        .map(Into::into)
        .collect())
}

pub fn list_group_tags(
    conn: &Connection,
    group_id: i64,
    limit: usize,
) -> Result<Vec<TagDto>, AppError> {
    Ok(repo::list_group_tags(conn, group_id, limit)?
        .into_iter()
        .map(Into::into)
        .collect())
}

pub fn list_unclassified_characters(
    conn: &Connection,
    limit: usize,
) -> Result<Vec<TagDto>, AppError> {
    Ok(repo::list_unclassified_characters(conn, limit)?
        .into_iter()
        .map(Into::into)
        .collect())
}

pub fn create_user_group(
    conn: &Connection,
    parent_id: Option<i64>,
    title: &str,
) -> Result<TagGroupDto, AppError> {
    let id = repo::create_user_group(conn, parent_id, title)?;
    Ok(repo::find_group(conn, id)?.into())
}

pub fn rename_user_group(
    conn: &Connection,
    group_id: i64,
    title: &str,
) -> Result<(), AppError> {
    repo::rename_user_group(conn, group_id, title)
}

pub fn move_user_group(
    conn: &Connection,
    group_id: i64,
    new_parent_id: Option<i64>,
) -> Result<(), AppError> {
    repo::move_user_group(conn, group_id, new_parent_id)
}

pub fn delete_user_group(conn: &Connection, group_id: i64) -> Result<(), AppError> {
    repo::delete_user_group(conn, group_id)
}

pub fn add_members(
    conn: &Connection,
    group_id: i64,
    tag_ids: &[i64],
) -> Result<usize, AppError> {
    repo::add_members(conn, group_id, tag_ids)
}

pub fn remove_members(
    conn: &Connection,
    group_id: i64,
    tag_ids: &[i64],
) -> Result<usize, AppError> {
    repo::remove_members(conn, group_id, tag_ids)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::setup_test_db;

    #[test]
    fn fts_query_escapes_quotes() {
        assert_eq!(to_fts_query("foo"), r#""foo""#);
        assert_eq!(to_fts_query(r#"foo"bar"#), r#""foo""bar""#);
        assert_eq!(to_fts_query("  "), "");
    }

    #[test]
    fn user_group_lifecycle() {
        let conn = setup_test_db();
        let root = create_user_group(&conn, None, "My Characters").unwrap();
        assert_eq!(root.source, "user");
        assert_eq!(root.kind, "user");

        rename_user_group(&conn, root.id, "My Favs").unwrap();
        let reloaded = repo::find_group(&conn, root.id).unwrap();
        assert_eq!(reloaded.title, "My Favs");

        delete_user_group(&conn, root.id).unwrap();
        assert!(repo::find_group(&conn, root.id).is_err());
    }

    #[test]
    fn seeded_groups_cannot_be_renamed() {
        let conn = setup_test_db();
        // Simulate a seed row
        conn.execute(
            "INSERT INTO tag_groups (slug, title, kind, source) VALUES ('seed:test', 'Seed', 'group', 'seed')",
            [],
        )
        .unwrap();
        let id: i64 = conn
            .query_row("SELECT id FROM tag_groups WHERE slug = 'seed:test'", [], |r| r.get(0))
            .unwrap();

        let err = rename_user_group(&conn, id, "Hacked");
        assert!(err.is_err());
    }
}
