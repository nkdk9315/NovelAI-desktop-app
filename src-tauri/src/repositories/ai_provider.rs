use rusqlite::{params, Connection, Row};

use crate::error::AppError;
use crate::models::ai::AiProviderRow;

fn map_row(row: &Row<'_>) -> rusqlite::Result<AiProviderRow> {
    Ok(AiProviderRow {
        id: row.get(0)?,
        name: row.get(1)?,
        base_url: row.get(2)?,
        api_key: row.get(3)?,
        model: row.get(4)?,
        json_mode: row.get::<_, i32>(5)? != 0,
        sort_order: row.get(6)?,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

pub fn list_all(conn: &Connection) -> Result<Vec<AiProviderRow>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, base_url, api_key, model, json_mode, sort_order, created_at, updated_at
         FROM ai_providers ORDER BY sort_order ASC, created_at ASC",
    )?;
    let rows = stmt.query_map([], map_row)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

pub fn find_by_id(conn: &Connection, id: &str) -> Result<AiProviderRow, AppError> {
    conn.query_row(
        "SELECT id, name, base_url, api_key, model, json_mode, sort_order, created_at, updated_at
         FROM ai_providers WHERE id = ?1",
        [id],
        map_row,
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("ai provider {id}")),
        _ => e.into(),
    })
}

pub fn insert(conn: &Connection, row: &AiProviderRow) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO ai_providers (id, name, base_url, api_key, model, json_mode, sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            row.id, row.name, row.base_url, row.api_key, row.model,
            i32::from(row.json_mode), row.sort_order, row.created_at, row.updated_at
        ],
    )?;
    Ok(())
}

pub fn update(conn: &Connection, row: &AiProviderRow) -> Result<(), AppError> {
    conn.execute(
        "UPDATE ai_providers
         SET name = ?2, base_url = ?3, api_key = ?4, model = ?5, json_mode = ?6, updated_at = ?7
         WHERE id = ?1",
        params![
            row.id, row.name, row.base_url, row.api_key, row.model,
            i32::from(row.json_mode), row.updated_at
        ],
    )?;
    Ok(())
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM ai_providers WHERE id = ?1", [id])?;
    Ok(())
}

pub fn next_sort_order(conn: &Connection) -> Result<i32, AppError> {
    let max: i32 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) FROM ai_providers",
        [],
        |row| row.get(0),
    )?;
    Ok(max + 1)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::setup_test_db;

    fn sample(id: &str, sort_order: i32) -> AiProviderRow {
        AiProviderRow {
            id: id.to_string(),
            name: format!("provider {id}"),
            base_url: "http://localhost:11434/v1".to_string(),
            api_key: "secret".to_string(),
            model: "some-model".to_string(),
            json_mode: true,
            sort_order,
            created_at: "2026-01-01T00:00:00Z".to_string(),
            updated_at: "2026-01-01T00:00:00Z".to_string(),
        }
    }

    #[test]
    fn test_insert_and_list_in_sort_order() {
        let conn = setup_test_db();
        insert(&conn, &sample("b", 1)).unwrap();
        insert(&conn, &sample("a", 0)).unwrap();
        let ids: Vec<String> = list_all(&conn).unwrap().into_iter().map(|r| r.id).collect();
        assert_eq!(ids, vec!["a", "b"]);
        assert_eq!(next_sort_order(&conn).unwrap(), 2);
    }

    #[test]
    fn test_update_and_delete() {
        let conn = setup_test_db();
        insert(&conn, &sample("a", 0)).unwrap();
        let mut row = find_by_id(&conn, "a").unwrap();
        row.model = "other".to_string();
        row.json_mode = false;
        update(&conn, &row).unwrap();
        let got = find_by_id(&conn, "a").unwrap();
        assert_eq!(got.model, "other");
        assert!(!got.json_mode);
        delete(&conn, "a").unwrap();
        assert!(matches!(find_by_id(&conn, "a"), Err(AppError::NotFound(_))));
    }
}
