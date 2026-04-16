// Thin service layer over `repositories::tag`. SQL-dialect concerns (FTS5
// escaping, LIKE patterns) live in the repo; this layer only owns the
// product-level decision of *which* repo query to use based on input shape.

use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::{CountByIdDto, TagDto, TagGroupDto, TagWithGroupsDto};
use crate::repositories::tag as repo;

pub fn search(
    conn: &Connection,
    query: &str,
    group_id: Option<i64>,
    limit: usize,
) -> Result<Vec<TagDto>, AppError> {
    let trimmed = query.trim();
    if trimmed.is_empty() {
        return Ok(Vec::new());
    }
    // FTS5 trigram tokenizer requires >= 3 chars to form a trigram; fall
    // back to LIKE for 1-2 char queries so the user gets live results from
    // the very first keystroke.
    let rows = if trimmed.chars().count() < 3 {
        repo::search_like(conn, trimmed, group_id, limit)?
    } else {
        repo::search(conn, trimmed, group_id, limit)?
    };
    Ok(rows.into_iter().map(Into::into).collect())
}

pub fn search_with_groups(
    conn: &Connection,
    query: &str,
    limit: usize,
) -> Result<Vec<TagWithGroupsDto>, AppError> {
    let tags = search(conn, query, None, limit)?;
    let mut out = Vec::with_capacity(tags.len());
    for tag in tags {
        let groups = repo::list_parent_groups(conn, tag.id)?
            .into_iter()
            .map(Into::into)
            .collect();
        out.push(TagWithGroupsDto { tag, groups });
    }
    Ok(out)
}

pub fn list_roots(conn: &Connection) -> Result<Vec<TagGroupDto>, AppError> {
    Ok(repo::list_roots(conn)?.into_iter().map(Into::into).collect())
}

pub fn get_group(conn: &Connection, group_id: i64) -> Result<TagGroupDto, AppError> {
    Ok(repo::find_group(conn, group_id)?.into())
}

pub fn list_children(conn: &Connection, parent_id: i64) -> Result<Vec<TagGroupDto>, AppError> {
    Ok(repo::list_children(conn, parent_id)?
        .into_iter()
        .map(Into::into)
        .collect())
}

pub fn list_favorite_roots(conn: &Connection) -> Result<Vec<TagGroupDto>, AppError> {
    Ok(repo::list_favorite_roots(conn)?
        .into_iter()
        .map(Into::into)
        .collect())
}

pub fn list_favorite_children(
    conn: &Connection,
    parent_id: i64,
) -> Result<Vec<TagGroupDto>, AppError> {
    Ok(repo::list_favorite_children(conn, parent_id)?
        .into_iter()
        .map(Into::into)
        .collect())
}

pub fn toggle_favorite(conn: &Connection, group_id: i64) -> Result<bool, AppError> {
    repo::toggle_favorite(conn, group_id)
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

pub fn count_tag_members_per_group(conn: &Connection) -> Result<Vec<CountByIdDto>, AppError> {
    Ok(repo::count_tag_members_per_group(conn)?
        .into_iter()
        .map(|(id, count)| CountByIdDto { id, count })
        .collect())
}

pub fn count_favorite_descendants_per_group(
    conn: &Connection,
) -> Result<Vec<CountByIdDto>, AppError> {
    Ok(repo::count_favorite_descendants_per_group(conn)?
        .into_iter()
        .map(|(id, count)| CountByIdDto { id, count })
        .collect())
}

pub fn list_orphan_tags_by_category(
    conn: &Connection,
    csv_category: i64,
    letter_bucket: Option<&str>,
    limit: usize,
) -> Result<Vec<TagDto>, AppError> {
    Ok(
        repo::list_orphan_tags_by_category(conn, csv_category, letter_bucket, limit)?
            .into_iter()
            .map(Into::into)
            .collect(),
    )
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
    fn favorite_toggle_round_trip() {
        let conn = setup_test_db();
        let group = create_user_group(&conn, None, "Fav Test").unwrap();
        assert!(!group.is_favorite);

        let now_fav = toggle_favorite(&conn, group.id).unwrap();
        assert!(now_fav);

        let reloaded = get_group(&conn, group.id).unwrap();
        assert!(reloaded.is_favorite);

        let now_unfav = toggle_favorite(&conn, group.id).unwrap();
        assert!(!now_unfav);
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
