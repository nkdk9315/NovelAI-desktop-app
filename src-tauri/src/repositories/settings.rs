use std::collections::HashMap;

use rusqlite::Connection;

use crate::error::AppError;

pub fn get_all(conn: &Connection) -> Result<HashMap<String, String>, AppError> {
    let mut stmt = conn.prepare("SELECT key, value FROM settings")?;
    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    })?;
    let mut map = HashMap::new();
    for row in rows {
        let (k, v) = row?;
        map.insert(k, v);
    }
    Ok(map)
}

pub fn get_by_key(conn: &Connection, key: &str) -> Result<Option<String>, AppError> {
    let result = conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        [key],
        |row| row.get(0),
    );
    match result {
        Ok(val) => Ok(Some(val)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.into()),
    }
}

pub fn set(conn: &Connection, key: &str, value: &str) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        rusqlite::params![key, value],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::setup_test_db;

    #[test]
    fn test_set_and_get_by_key() {
        let conn = setup_test_db();
        set(&conn, "theme", "dark").unwrap();
        let val = get_by_key(&conn, "theme").unwrap();
        assert_eq!(val, Some("dark".to_string()));
    }

    #[test]
    fn test_set_upsert() {
        let conn = setup_test_db();
        set(&conn, "theme", "dark").unwrap();
        set(&conn, "theme", "light").unwrap();
        let val = get_by_key(&conn, "theme").unwrap();
        assert_eq!(val, Some("light".to_string()));
    }

    #[test]
    fn test_get_all() {
        let conn = setup_test_db();
        set(&conn, "theme", "dark").unwrap();
        set(&conn, "locale", "ja").unwrap();
        let all = get_all(&conn).unwrap();
        assert_eq!(all.get("theme"), Some(&"dark".to_string()));
        assert_eq!(all.get("locale"), Some(&"ja".to_string()));
    }

    #[test]
    fn test_get_by_key_not_found() {
        let conn = setup_test_db();
        let val = get_by_key(&conn, "nonexistent").unwrap();
        assert_eq!(val, None);
    }
}
