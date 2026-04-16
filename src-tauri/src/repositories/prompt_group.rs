use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::{PromptGroupRow, PromptGroupTagRow};

fn map_row(row: &rusqlite::Row) -> rusqlite::Result<PromptGroupRow> {
    Ok(PromptGroupRow {
        id: row.get(0)?,
        name: row.get(1)?,
        genre_id: row.get(2)?,
        is_default_for_genre: row.get(3)?,
        is_system: row.get(4)?,
        usage_type: row.get(5)?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
        thumbnail_path: row.get(8)?,
        is_default: row.get(9)?,
        category: row.get(10)?,
        default_strength: row.get(11)?,
        random_mode: row.get(12)?,
        random_count: row.get(13)?,
        random_source: row.get(14)?,
        wildcard_token: row.get(15)?,
    })
}

pub fn list(
    conn: &Connection,
    search: Option<&str>,
) -> Result<Vec<PromptGroupRow>, AppError> {
    let mut stmt = conn.prepare(
        concat!("SELECT ", "id, name, genre_id, is_default_for_genre, is_system, usage_type, created_at, updated_at, thumbnail_path, is_default, category, default_strength, random_mode, random_count, random_source, wildcard_token", " FROM prompt_groups WHERE (?1 IS NULL OR name LIKE '%' || ?1 || '%') ORDER BY created_at DESC"),
    )?;
    let rows = stmt.query_map(rusqlite::params![search], map_row)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

pub fn find_by_id(conn: &Connection, id: &str) -> Result<PromptGroupRow, AppError> {
    conn.query_row(
        concat!("SELECT ", "id, name, genre_id, is_default_for_genre, is_system, usage_type, created_at, updated_at, thumbnail_path, is_default, category, default_strength, random_mode, random_count, random_source, wildcard_token", " FROM prompt_groups WHERE id = ?1"),
        [id], map_row,
    ).map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("prompt_group {id}")),
        _ => e.into(),
    })
}

pub fn insert(conn: &Connection, row: &PromptGroupRow) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO prompt_groups (id, name, genre_id, is_default_for_genre, is_system, usage_type, created_at, updated_at, thumbnail_path, is_default, category, default_strength, random_mode, random_count, random_source, wildcard_token) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
        rusqlite::params![row.id, row.name, row.genre_id, row.is_default_for_genre, row.is_system, row.usage_type, row.created_at, row.updated_at, row.thumbnail_path, row.is_default, row.category, row.default_strength, row.random_mode, row.random_count, row.random_source, row.wildcard_token],
    )?;
    Ok(())
}

pub fn update(conn: &Connection, row: &PromptGroupRow) -> Result<(), AppError> {
    conn.execute(
        "UPDATE prompt_groups SET name = ?2, is_default = ?3, thumbnail_path = ?4, updated_at = ?5, default_strength = ?6, random_mode = ?7, random_count = ?8, random_source = ?9, wildcard_token = ?10 WHERE id = ?1",
        rusqlite::params![row.id, row.name, row.is_default, row.thumbnail_path, row.updated_at, row.default_strength, row.random_mode, row.random_count, row.random_source, row.wildcard_token],
    )?;
    Ok(())
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM prompt_groups WHERE id = ?1", [id])?;
    Ok(())
}

pub fn list_default_genres(
    conn: &Connection,
    prompt_group_id: &str,
) -> Result<Vec<String>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT genre_id FROM prompt_group_default_genres WHERE prompt_group_id = ?1 ORDER BY genre_id",
    )?;
    let rows = stmt.query_map([prompt_group_id], |r| r.get::<_, String>(0))?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

pub fn set_default_genres(
    conn: &Connection,
    prompt_group_id: &str,
    genre_ids: &[String],
) -> Result<(), AppError> {
    conn.execute(
        "DELETE FROM prompt_group_default_genres WHERE prompt_group_id = ?1",
        [prompt_group_id],
    )?;
    for gid in genre_ids {
        conn.execute(
            "INSERT OR IGNORE INTO prompt_group_default_genres (prompt_group_id, genre_id) VALUES (?1, ?2)",
            rusqlite::params![prompt_group_id, gid],
        )?;
    }
    Ok(())
}

pub fn list_groups_for_default_genre(
    conn: &Connection,
    genre_id: &str,
) -> Result<Vec<String>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT prompt_group_id FROM prompt_group_default_genres WHERE genre_id = ?1 ORDER BY prompt_group_id",
    )?;
    let rows = stmt.query_map([genre_id], |r| r.get::<_, String>(0))?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

pub fn find_tags_by_group(
    conn: &Connection,
    prompt_group_id: &str,
) -> Result<Vec<PromptGroupTagRow>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, tag, sort_order, default_strength, thumbnail_path FROM prompt_group_tags WHERE prompt_group_id = ?1 ORDER BY sort_order ASC",
    )?;
    let rows = stmt.query_map([prompt_group_id], |row| {
        Ok(PromptGroupTagRow {
            id: row.get(0)?,
            name: row.get(1)?,
            tag: row.get(2)?,
            sort_order: row.get(3)?,
            default_strength: row.get(4)?,
            thumbnail_path: row.get(5)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

/// Tag tuple: (id, name, tag, sort_order, default_strength, thumbnail_path)
#[allow(clippy::type_complexity)]
pub fn replace_tags(
    conn: &Connection,
    prompt_group_id: &str,
    tags: &[(String, String, String, i32, i32, Option<String>)],
) -> Result<(), AppError> {
    conn.execute(
        "DELETE FROM prompt_group_tags WHERE prompt_group_id = ?1",
        [prompt_group_id],
    )?;
    for (id, name, tag, sort_order, default_strength, thumbnail_path) in tags {
        conn.execute(
            "INSERT INTO prompt_group_tags (id, prompt_group_id, name, tag, sort_order, default_strength, thumbnail_path) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![id, prompt_group_id, name, tag, sort_order, default_strength, thumbnail_path],
        )?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{create_test_genre, create_test_prompt_group, setup_test_db};

    #[test]
    fn test_list_filter_search() {
        let conn = setup_test_db();
        let mut pg = create_test_prompt_group(&conn);
        pg.name = "Unique Searchable Name".to_string();
        conn.execute(
            "UPDATE prompt_groups SET name = ?2 WHERE id = ?1",
            rusqlite::params![pg.id, pg.name],
        )
        .unwrap();

        let found = list(&conn, Some("Searchable")).unwrap();
        assert_eq!(found.len(), 1);

        let not_found = list(&conn, Some("NonExistent")).unwrap();
        assert!(not_found.is_empty());
    }

    #[test]
    fn test_list_returns_all() {
        let conn = setup_test_db();
        create_test_prompt_group(&conn);
        create_test_prompt_group(&conn);
        create_test_prompt_group(&conn);
        let all = list(&conn, None).unwrap();
        assert_eq!(all.len(), 3);
    }

    #[test]
    fn test_insert_and_find_by_id() {
        let conn = setup_test_db();
        let pg = create_test_prompt_group(&conn);

        let found = find_by_id(&conn, &pg.id).unwrap();
        assert_eq!(found.name, pg.name);
        assert!(found.genre_id.is_none());
        assert_eq!(found.is_system, 0);
    }

    #[test]
    fn test_update() {
        let conn = setup_test_db();
        let mut pg = create_test_prompt_group(&conn);

        pg.name = "Updated Name".to_string();
        pg.is_default = 1;
        pg.updated_at = "2026-06-01T00:00:00Z".to_string();
        update(&conn, &pg).unwrap();

        let found = find_by_id(&conn, &pg.id).unwrap();
        assert_eq!(found.name, "Updated Name");
        assert_eq!(found.is_default, 1);
    }

    #[test]
    fn test_delete() {
        let conn = setup_test_db();
        let pg = create_test_prompt_group(&conn);

        let tags = vec![(
            uuid::Uuid::new_v4().to_string(),
            "".to_string(),
            "tag1".to_string(),
            0,
            0,
            None,
        )];
        replace_tags(&conn, &pg.id, &tags).unwrap();

        delete(&conn, &pg.id).unwrap();
        assert!(find_by_id(&conn, &pg.id).is_err());
        let remaining = find_tags_by_group(&conn, &pg.id).unwrap();
        assert!(remaining.is_empty());
    }

    #[test]
    fn test_replace_tags() {
        let conn = setup_test_db();
        let pg = create_test_prompt_group(&conn);

        let tags1 = vec![
            (uuid::Uuid::new_v4().to_string(), "Entry A".to_string(), "tag_a".to_string(), 0, 3, None),
            (uuid::Uuid::new_v4().to_string(), "Entry B".to_string(), "tag_b".to_string(), 1, -2, Some("/tmp/thumb.png".to_string())),
        ];
        replace_tags(&conn, &pg.id, &tags1).unwrap();
        let found = find_tags_by_group(&conn, &pg.id).unwrap();
        assert_eq!(found.len(), 2);
        assert_eq!(found[0].tag, "tag_a");
        assert_eq!(found[0].default_strength, 3);
        assert_eq!(found[1].thumbnail_path.as_deref(), Some("/tmp/thumb.png"));

        let tags2 = vec![
            (uuid::Uuid::new_v4().to_string(), "Entry X".to_string(), "tag_x".to_string(), 0, 0, None),
        ];
        replace_tags(&conn, &pg.id, &tags2).unwrap();
        let found = find_tags_by_group(&conn, &pg.id).unwrap();
        assert_eq!(found.len(), 1);
        assert_eq!(found[0].tag, "tag_x");
    }

    #[test]
    fn test_default_genres_round_trip() {
        let conn = setup_test_db();
        let pg = create_test_prompt_group(&conn);
        let g1 = create_test_genre(&conn);
        let g2 = create_test_genre(&conn);

        set_default_genres(&conn, &pg.id, &[g1.id.clone(), g2.id.clone()]).unwrap();
        let listed = list_default_genres(&conn, &pg.id).unwrap();
        assert_eq!(listed.len(), 2);
        assert!(listed.contains(&g1.id));
        assert!(listed.contains(&g2.id));

        // Replacing with a smaller set removes the old ones.
        set_default_genres(&conn, &pg.id, std::slice::from_ref(&g1.id)).unwrap();
        let listed = list_default_genres(&conn, &pg.id).unwrap();
        assert_eq!(listed, vec![g1.id.clone()]);

        // Reverse lookup: find groups that default-show under a genre.
        let groups = list_groups_for_default_genre(&conn, &g1.id).unwrap();
        assert_eq!(groups, vec![pg.id.clone()]);
    }

}
