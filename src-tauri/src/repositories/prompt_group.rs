use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::{PromptGroupRow, PromptGroupTagRow};

pub fn list(
    conn: &Connection,
    genre_id: Option<&str>,
    usage_type: Option<&str>,
    search: Option<&str>,
) -> Result<Vec<PromptGroupRow>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, genre_id, is_default_for_genre, is_system, usage_type, created_at, updated_at FROM prompt_groups WHERE (?1 IS NULL OR genre_id = ?1) AND (?2 IS NULL OR usage_type = ?2) AND (?3 IS NULL OR name LIKE '%' || ?3 || '%') ORDER BY created_at DESC",
    )?;
    let rows = stmt.query_map(rusqlite::params![genre_id, usage_type, search], |row| {
        Ok(PromptGroupRow {
            id: row.get(0)?,
            name: row.get(1)?,
            genre_id: row.get(2)?,
            is_default_for_genre: row.get(3)?,
            is_system: row.get(4)?,
            usage_type: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.into())
}

pub fn find_by_id(conn: &Connection, id: &str) -> Result<PromptGroupRow, AppError> {
    conn.query_row(
        "SELECT id, name, genre_id, is_default_for_genre, is_system, usage_type, created_at, updated_at FROM prompt_groups WHERE id = ?1",
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
        "INSERT INTO prompt_groups (id, name, genre_id, is_default_for_genre, is_system, usage_type, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![row.id, row.name, row.genre_id, row.is_default_for_genre, row.is_system, row.usage_type, row.created_at, row.updated_at],
    )?;
    Ok(())
}

pub fn update(conn: &Connection, row: &PromptGroupRow) -> Result<(), AppError> {
    conn.execute(
        "UPDATE prompt_groups SET name = ?2, genre_id = ?3, is_default_for_genre = ?4, usage_type = ?5, updated_at = ?6 WHERE id = ?1",
        rusqlite::params![row.id, row.name, row.genre_id, row.is_default_for_genre, row.usage_type, row.updated_at],
    )?;
    Ok(())
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM prompt_groups WHERE id = ?1", [id])?;
    Ok(())
}

pub fn clear_default_for_genre(
    conn: &Connection,
    genre_id: &str,
    except_id: &str,
) -> Result<(), AppError> {
    conn.execute(
        "UPDATE prompt_groups SET is_default_for_genre = 0 WHERE genre_id = ?1 AND id != ?2",
        rusqlite::params![genre_id, except_id],
    )?;
    Ok(())
}

pub fn find_tags_by_group(
    conn: &Connection,
    prompt_group_id: &str,
) -> Result<Vec<PromptGroupTagRow>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, prompt_group_id, tag, sort_order FROM prompt_group_tags WHERE prompt_group_id = ?1 ORDER BY sort_order ASC",
    )?;
    let rows = stmt.query_map([prompt_group_id], |row| {
        Ok(PromptGroupTagRow {
            id: row.get(0)?,
            prompt_group_id: row.get(1)?,
            tag: row.get(2)?,
            sort_order: row.get(3)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.into())
}

pub fn replace_tags(
    conn: &Connection,
    prompt_group_id: &str,
    tags: &[(String, String, i32)],
) -> Result<(), AppError> {
    conn.execute(
        "DELETE FROM prompt_group_tags WHERE prompt_group_id = ?1",
        [prompt_group_id],
    )?;
    for (id, tag, sort_order) in tags {
        conn.execute(
            "INSERT INTO prompt_group_tags (id, prompt_group_id, tag, sort_order) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![id, prompt_group_id, tag, sort_order],
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

        let filtered = list(&conn, Some(&g1.id), None, None).unwrap();
        assert_eq!(filtered.len(), 2);
    }

    #[test]
    fn test_list_filter_usage_type() {
        let conn = setup_test_db();
        let genre = create_test_genre(&conn);
        let mut pg = create_test_prompt_group(&conn, &genre.id);
        // Update to "positive" usage_type
        pg.usage_type = "positive".to_string();
        update(&conn, &pg).unwrap();

        let filtered = list(&conn, None, Some("positive"), None).unwrap();
        assert_eq!(filtered.len(), 1);
        assert_eq!(filtered[0].usage_type, "positive");
    }

    #[test]
    fn test_list_filter_search() {
        let conn = setup_test_db();
        let genre = create_test_genre(&conn);
        let mut pg = create_test_prompt_group(&conn, &genre.id);
        pg.name = "Unique Searchable Name".to_string();
        // Need to re-insert with the correct name, or update
        conn.execute(
            "UPDATE prompt_groups SET name = ?2 WHERE id = ?1",
            rusqlite::params![pg.id, pg.name],
        )
        .unwrap();

        let found = list(&conn, None, None, Some("Searchable")).unwrap();
        assert_eq!(found.len(), 1);

        let not_found = list(&conn, None, None, Some("NonExistent")).unwrap();
        assert!(not_found.is_empty());
    }

    #[test]
    fn test_list_filter_combined() {
        let conn = setup_test_db();
        let g1 = create_test_genre(&conn);
        let g2 = create_test_genre(&conn);
        let mut pg1 = create_test_prompt_group(&conn, &g1.id);
        pg1.usage_type = "positive".to_string();
        update(&conn, &pg1).unwrap();
        let mut pg2 = create_test_prompt_group(&conn, &g1.id);
        pg2.usage_type = "negative".to_string();
        update(&conn, &pg2).unwrap();
        create_test_prompt_group(&conn, &g2.id);

        let filtered = list(&conn, Some(&g1.id), Some("positive"), None).unwrap();
        assert_eq!(filtered.len(), 1);
        assert_eq!(filtered[0].id, pg1.id);
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
        pg.usage_type = "negative".to_string();
        pg.is_default_for_genre = 1;
        update(&conn, &pg).unwrap();

        let found = find_by_id(&conn, &pg.id).unwrap();
        assert_eq!(found.name, "Updated Name");
        assert_eq!(found.usage_type, "negative");
        assert_eq!(found.is_default_for_genre, 1);
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
        )];
        replace_tags(&conn, &pg.id, &tags).unwrap();

        delete(&conn, &pg.id).unwrap();
        assert!(find_by_id(&conn, &pg.id).is_err());
        // Tags should also be deleted (CASCADE)
        let remaining = find_tags_by_group(&conn, &pg.id).unwrap();
        assert!(remaining.is_empty());
    }

    #[test]
    fn test_clear_default_for_genre() {
        let conn = setup_test_db();
        let genre = create_test_genre(&conn);
        let mut pg1 = create_test_prompt_group(&conn, &genre.id);
        let mut pg2 = create_test_prompt_group(&conn, &genre.id);

        // Set both as default
        pg1.is_default_for_genre = 1;
        update(&conn, &pg1).unwrap();
        pg2.is_default_for_genre = 1;
        update(&conn, &pg2).unwrap();

        // Clear default except pg2
        clear_default_for_genre(&conn, &genre.id, &pg2.id).unwrap();

        let found1 = find_by_id(&conn, &pg1.id).unwrap();
        let found2 = find_by_id(&conn, &pg2.id).unwrap();
        assert_eq!(found1.is_default_for_genre, 0);
        assert_eq!(found2.is_default_for_genre, 1);
    }

    #[test]
    fn test_replace_tags() {
        let conn = setup_test_db();
        let genre = create_test_genre(&conn);
        let pg = create_test_prompt_group(&conn, &genre.id);

        // Insert initial tags
        let tags1 = vec![
            (uuid::Uuid::new_v4().to_string(), "tag_a".to_string(), 0),
            (uuid::Uuid::new_v4().to_string(), "tag_b".to_string(), 1),
        ];
        replace_tags(&conn, &pg.id, &tags1).unwrap();
        let found = find_tags_by_group(&conn, &pg.id).unwrap();
        assert_eq!(found.len(), 2);
        assert_eq!(found[0].tag, "tag_a");
        assert_eq!(found[1].tag, "tag_b");

        // Replace with new tags
        let tags2 = vec![
            (uuid::Uuid::new_v4().to_string(), "tag_x".to_string(), 0),
        ];
        replace_tags(&conn, &pg.id, &tags2).unwrap();
        let found = find_tags_by_group(&conn, &pg.id).unwrap();
        assert_eq!(found.len(), 1);
        assert_eq!(found[0].tag, "tag_x");
    }
}
