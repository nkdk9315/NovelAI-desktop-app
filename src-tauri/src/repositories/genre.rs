use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::GenreRow;

pub fn list_all(conn: &Connection) -> Result<Vec<GenreRow>, AppError> {
    let mut stmt = conn.prepare("SELECT id, name, is_system, sort_order, created_at FROM genres ORDER BY sort_order ASC")?;
    let rows = stmt.query_map([], |row| {
        Ok(GenreRow {
            id: row.get(0)?,
            name: row.get(1)?,
            is_system: row.get(2)?,
            sort_order: row.get(3)?,
            created_at: row.get(4)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.into())
}

pub fn find_by_id(conn: &Connection, id: &str) -> Result<GenreRow, AppError> {
    conn.query_row(
        "SELECT id, name, is_system, sort_order, created_at FROM genres WHERE id = ?1",
        [id],
        |row| {
            Ok(GenreRow {
                id: row.get(0)?,
                name: row.get(1)?,
                is_system: row.get(2)?,
                sort_order: row.get(3)?,
                created_at: row.get(4)?,
            })
        },
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("genre {id}")),
        _ => e.into(),
    })
}

pub fn insert(conn: &Connection, row: &GenreRow) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO genres (id, name, is_system, sort_order, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![row.id, row.name, row.is_system, row.sort_order, row.created_at],
    )?;
    Ok(())
}

pub fn get_max_sort_order(conn: &Connection) -> Result<i32, AppError> {
    Ok(conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), -1) FROM genres",
            [],
            |row| row.get(0),
        )
        .unwrap_or(-1))
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM genres WHERE id = ?1", [id])?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{create_test_genre, setup_test_db};

    #[test]
    fn test_list_all_sorted() {
        let conn = setup_test_db();
        let genres = list_all(&conn).unwrap();
        // Migration seeds 3 system genres with sort_order 0, 1, 2
        assert_eq!(genres.len(), 3);
        assert_eq!(genres[0].name, "男");
        assert_eq!(genres[1].name, "女");
        assert_eq!(genres[2].name, "その他");
        // Verify sort_order is ascending
        assert!(genres[0].sort_order <= genres[1].sort_order);
        assert!(genres[1].sort_order <= genres[2].sort_order);
    }

    #[test]
    fn test_insert() {
        let conn = setup_test_db();
        let genre = create_test_genre(&conn);

        let found = find_by_id(&conn, &genre.id).unwrap();
        assert_eq!(found.name, genre.name);
        assert_eq!(found.is_system, 0);

        let all = list_all(&conn).unwrap();
        assert_eq!(all.len(), 4); // 3 system + 1 user
    }

    #[test]
    fn test_delete_sets_null() {
        let conn = setup_test_db();
        let genre = create_test_genre(&conn);

        // Create a prompt group linked to this genre
        let pg_id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO prompt_groups (id, name, genre_id, is_default_for_genre, is_system, usage_type, created_at, updated_at) VALUES (?1, ?2, ?3, 0, 0, 'both', datetime('now'), datetime('now'))",
            rusqlite::params![pg_id, "Test PG", genre.id],
        ).unwrap();

        // Delete the genre
        delete(&conn, &genre.id).unwrap();

        // Prompt group should still exist but genre_id should be NULL
        let row: Option<String> = conn
            .query_row(
                "SELECT genre_id FROM prompt_groups WHERE id = ?1",
                [&pg_id],
                |row| row.get(0),
            )
            .unwrap();
        assert!(row.is_none());
    }
}
