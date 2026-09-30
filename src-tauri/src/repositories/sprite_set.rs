use rusqlite::{Connection, Row};

use crate::error::AppError;
use crate::models::sprite::SpriteSetRow;

/// Column list, as a macro so queries are built with `concat!` (no runtime formatting).
macro_rules! columns {
    () => {
        "id, project_id, name, spec, sort_order, created_at, updated_at"
    };
}

fn map_row(row: &Row) -> rusqlite::Result<SpriteSetRow> {
    Ok(SpriteSetRow {
        id: row.get(0)?,
        project_id: row.get(1)?,
        name: row.get(2)?,
        spec: row.get(3)?,
        sort_order: row.get(4)?,
        created_at: row.get(5)?,
        updated_at: row.get(6)?,
    })
}

pub fn list_by_project(conn: &Connection, project_id: &str) -> Result<Vec<SpriteSetRow>, AppError> {
    let mut stmt = conn.prepare(concat!("SELECT ", columns!(), " FROM sprite_sets WHERE project_id = ?1 ORDER BY sort_order, created_at"))?;
    let rows = stmt.query_map([project_id], map_row)?.collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn find_by_id(conn: &Connection, id: &str) -> Result<SpriteSetRow, AppError> {
    conn.query_row(
        concat!("SELECT ", columns!(), " FROM sprite_sets WHERE id = ?1"),
        [id],
        map_row,
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("sprite set {id}")),
        _ => e.into(),
    })
}

pub fn next_sort_order(conn: &Connection, project_id: &str) -> Result<i64, AppError> {
    Ok(conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM sprite_sets WHERE project_id = ?1",
        [project_id],
        |r| r.get(0),
    )?)
}

pub fn insert(conn: &Connection, row: &SpriteSetRow) -> Result<(), AppError> {
    conn.execute(
        concat!("INSERT INTO sprite_sets (", columns!(), ") VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"),
        rusqlite::params![
            row.id,
            row.project_id,
            row.name,
            row.spec,
            row.sort_order,
            row.created_at,
            row.updated_at
        ],
    )?;
    Ok(())
}

pub fn update(conn: &Connection, id: &str, name: &str, spec: &str, updated_at: &str) -> Result<(), AppError> {
    let n = conn.execute(
        "UPDATE sprite_sets SET name = ?2, spec = ?3, updated_at = ?4 WHERE id = ?1",
        rusqlite::params![id, name, spec, updated_at],
    )?;
    if n == 0 {
        return Err(AppError::NotFound(format!("sprite set {id}")));
    }
    Ok(())
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
    let n = conn.execute("DELETE FROM sprite_sets WHERE id = ?1", [id])?;
    if n == 0 {
        return Err(AppError::NotFound(format!("sprite set {id}")));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{create_test_project, setup_test_db};

    fn row(project_id: &str, name: &str, order: i64) -> SpriteSetRow {
        SpriteSetRow {
            id: uuid::Uuid::new_v4().to_string(),
            project_id: project_id.to_string(),
            name: name.to_string(),
            spec: "{}".to_string(),
            sort_order: order,
            created_at: "2026-01-01T00:00:00Z".to_string(),
            updated_at: "2026-01-01T00:00:00Z".to_string(),
        }
    }

    #[test]
    fn insert_list_update_delete() {
        let conn = setup_test_db();
        let p = create_test_project(&conn);
        assert_eq!(next_sort_order(&conn, &p.id).unwrap(), 0);
        let b = row(&p.id, "B", 1);
        let a = row(&p.id, "A", 0);
        insert(&conn, &b).unwrap();
        insert(&conn, &a).unwrap();
        assert_eq!(next_sort_order(&conn, &p.id).unwrap(), 2);
        let names: Vec<_> = list_by_project(&conn, &p.id)
            .unwrap()
            .into_iter()
            .map(|r| r.name)
            .collect();
        assert_eq!(names, ["A", "B"]);

        update(&conn, &a.id, "A2", "{\"v\":1}", "2026-01-02T00:00:00Z").unwrap();
        let got = find_by_id(&conn, &a.id).unwrap();
        assert_eq!((got.name.as_str(), got.spec.as_str()), ("A2", "{\"v\":1}"));

        delete(&conn, &a.id).unwrap();
        assert!(matches!(find_by_id(&conn, &a.id), Err(AppError::NotFound(_))));
        assert!(matches!(delete(&conn, &a.id), Err(AppError::NotFound(_))));
    }

    #[test]
    fn deleting_the_project_deletes_its_sets() {
        let conn = setup_test_db();
        let p = create_test_project(&conn);
        insert(&conn, &row(&p.id, "A", 0)).unwrap();
        crate::repositories::project::delete(&conn, &p.id).unwrap();
        assert!(list_by_project(&conn, &p.id).unwrap().is_empty());
    }
}
