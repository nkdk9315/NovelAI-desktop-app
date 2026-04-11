use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::{PromptGroupRow, PromptGroupTagRow};

pub fn list(
    conn: &Connection,
    genre_id: Option<&str>,
    search: Option<&str>,
) -> Result<Vec<PromptGroupRow>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, genre_id, is_default_for_genre, is_system, usage_type, created_at, updated_at, thumbnail_path, is_default, category FROM prompt_groups WHERE (?1 IS NULL OR genre_id = ?1) AND (?2 IS NULL OR name LIKE '%' || ?2 || '%') ORDER BY created_at DESC",
    )?;
    let rows = stmt.query_map(rusqlite::params![genre_id, search], |row| {
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
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.into())
}

pub fn find_by_id(conn: &Connection, id: &str) -> Result<PromptGroupRow, AppError> {
    conn.query_row(
        "SELECT id, name, genre_id, is_default_for_genre, is_system, usage_type, created_at, updated_at, thumbnail_path, is_default, category FROM prompt_groups WHERE id = ?1",
        [id],
        |row| {
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
            })
        },
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("prompt_group {id}")),
        _ => e.into(),
    })
}

pub fn insert(conn: &Connection, row: &PromptGroupRow) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO prompt_groups (id, name, genre_id, is_default_for_genre, is_system, usage_type, created_at, updated_at, thumbnail_path, is_default, category) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        rusqlite::params![row.id, row.name, row.genre_id, row.is_default_for_genre, row.is_system, row.usage_type, row.created_at, row.updated_at, row.thumbnail_path, row.is_default, row.category],
    )?;
    Ok(())
}

pub fn update(conn: &Connection, row: &PromptGroupRow) -> Result<(), AppError> {
    conn.execute(
        "UPDATE prompt_groups SET name = ?2, genre_id = ?3, is_default = ?4, thumbnail_path = ?5, updated_at = ?6 WHERE id = ?1",
        rusqlite::params![row.id, row.name, row.genre_id, row.is_default, row.thumbnail_path, row.updated_at],
    )?;
    Ok(())
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM prompt_groups WHERE id = ?1", [id])?;
    Ok(())
}

pub fn find_tags_by_group(
    conn: &Connection,
    prompt_group_id: &str,
) -> Result<Vec<PromptGroupTagRow>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, tag, sort_order, default_strength, thumbnail_path FROM prompt_group_tags WHERE prompt_group_id = ?1 ORDER BY sort_order ASC",
    )?;
    let rows = stmt.query_map([prompt_group_id], |row| {
        Ok(PromptGroupTagRow {
            id: row.get(0)?,
            tag: row.get(1)?,
            sort_order: row.get(2)?,
            default_strength: row.get(3)?,
            thumbnail_path: row.get(4)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.into())
}

/// Tag tuple: (id, tag, sort_order, default_strength, thumbnail_path)
pub fn replace_tags(
    conn: &Connection,
    prompt_group_id: &str,
    tags: &[(String, String, i32, i32, Option<String>)],
) -> Result<(), AppError> {
    conn.execute(
        "DELETE FROM prompt_group_tags WHERE prompt_group_id = ?1",
        [prompt_group_id],
    )?;
    for (id, tag, sort_order, default_strength, thumbnail_path) in tags {
        conn.execute(
            "INSERT INTO prompt_group_tags (id, prompt_group_id, tag, sort_order, default_strength, thumbnail_path) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![id, prompt_group_id, tag, sort_order, default_strength, thumbnail_path],
        )?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{create_test_genre, create_test_prompt_group, setup_test_db};

    #[test]
    fn test_list_filter_genre_id() {
        let conn = setup_test_db();
        let g1 = create_test_genre(&conn);
        let g2 = create_test_genre(&conn);
        create_test_prompt_group(&conn, &g1.id);
        create_test_prompt_group(&conn, &g1.id);
        create_test_prompt_group(&conn, &g2.id);

        let filtered = list(&conn, Some(&g1.id), None).unwrap();
        assert_eq!(filtered.len(), 2);
    }

    #[test]
    fn test_list_filter_search() {
        let conn = setup_test_db();
        let genre = create_test_genre(&conn);
        let mut pg = create_test_prompt_group(&conn, &genre.id);
        pg.name = "Unique Searchable Name".to_string();
        conn.execute(
            "UPDATE prompt_groups SET name = ?2 WHERE id = ?1",
            rusqlite::params![pg.id, pg.name],
        )
        .unwrap();

        let found = list(&conn, None, Some("Searchable")).unwrap();
        assert_eq!(found.len(), 1);

        let not_found = list(&conn, None, Some("NonExistent")).unwrap();
        assert!(not_found.is_empty());
    }

    #[test]
    fn test_insert_and_find_by_id() {
        let conn = setup_test_db();
        let genre = create_test_genre(&conn);
        let pg = create_test_prompt_group(&conn, &genre.id);

        let found = find_by_id(&conn, &pg.id).unwrap();
        assert_eq!(found.name, pg.name);
        assert_eq!(found.genre_id, Some(genre.id));
        assert_eq!(found.is_system, 0);
    }

    #[test]
    fn test_update() {
        let conn = setup_test_db();
        let genre = create_test_genre(&conn);
        let mut pg = create_test_prompt_group(&conn, &genre.id);

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
        let genre = create_test_genre(&conn);
        let pg = create_test_prompt_group(&conn, &genre.id);

        // Add tags to verify CASCADE
        let tags = vec![(
            uuid::Uuid::new_v4().to_string(),
            "tag1".to_string(),
            0,
            0,
            None,
        )];
        replace_tags(&conn, &pg.id, &tags).unwrap();

        delete(&conn, &pg.id).unwrap();
        assert!(find_by_id(&conn, &pg.id).is_err());
        // Tags should also be deleted (CASCADE)
        let remaining = find_tags_by_group(&conn, &pg.id).unwrap();
        assert!(remaining.is_empty());
    }

    #[test]
    fn test_replace_tags() {
        let conn = setup_test_db();
        let genre = create_test_genre(&conn);
        let pg = create_test_prompt_group(&conn, &genre.id);

        // Insert initial tags with default_strength
        let tags1 = vec![
            (uuid::Uuid::new_v4().to_string(), "tag_a".to_string(), 0, 3, None),
            (uuid::Uuid::new_v4().to_string(), "tag_b".to_string(), 1, -2, Some("/tmp/thumb.png".to_string())),
        ];
        replace_tags(&conn, &pg.id, &tags1).unwrap();
        let found = find_tags_by_group(&conn, &pg.id).unwrap();
        assert_eq!(found.len(), 2);
        assert_eq!(found[0].tag, "tag_a");
        assert_eq!(found[0].default_strength, 3);
        assert!(found[0].thumbnail_path.is_none());
        assert_eq!(found[1].tag, "tag_b");
        assert_eq!(found[1].default_strength, -2);
        assert_eq!(found[1].thumbnail_path.as_deref(), Some("/tmp/thumb.png"));

        // Replace with new tags
        let tags2 = vec![
            (uuid::Uuid::new_v4().to_string(), "tag_x".to_string(), 0, 0, None),
        ];
        replace_tags(&conn, &pg.id, &tags2).unwrap();
        let found = find_tags_by_group(&conn, &pg.id).unwrap();
        assert_eq!(found.len(), 1);
        assert_eq!(found[0].tag, "tag_x");
        assert_eq!(found[0].default_strength, 0);
    }
}
