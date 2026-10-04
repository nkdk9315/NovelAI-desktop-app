// Exact-name lookups against the tag database (names and aliases), used to
// check tags written by an LLM. Lives apart from `tag` to stay within the
// 300-line limit.

use rusqlite::{Connection, OptionalExtension};

use crate::error::AppError;

/// Canonical name and CSV category of the tag whose name or alias equals
/// `key` (lowercase, underscore-separated). `None` when the tag is unknown.
pub fn find_canonical(
    conn: &Connection,
    key: &str,
) -> Result<Option<(String, Option<i64>)>, AppError> {
    let by_name = conn
        .query_row(
            "SELECT name, csv_category FROM tags WHERE name = ?1",
            [key],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()?;
    if by_name.is_some() {
        return Ok(by_name);
    }
    conn.query_row(
        "SELECT t.name, t.csv_category
         FROM tag_aliases a JOIN tags t ON t.id = a.tag_id
         WHERE a.alias = ?1
         LIMIT 1",
        [key],
        |row| Ok((row.get(0)?, row.get(1)?)),
    )
    .optional()
    .map_err(Into::into)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::setup_test_db;

    #[test]
    fn test_find_by_name_and_alias() {
        let conn = setup_test_db();
        conn.execute("INSERT INTO tags (id, name, csv_category) VALUES (1, 'long_hair', 0)", [])
            .unwrap();
        conn.execute("INSERT INTO tag_aliases (tag_id, alias) VALUES (1, 'longhair')", [])
            .unwrap();
        assert_eq!(
            find_canonical(&conn, "long_hair").unwrap(),
            Some(("long_hair".to_string(), Some(0)))
        );
        assert_eq!(
            find_canonical(&conn, "longhair").unwrap(),
            Some(("long_hair".to_string(), Some(0)))
        );
        assert_eq!(find_canonical(&conn, "no_such_tag").unwrap(), None);
    }
}
