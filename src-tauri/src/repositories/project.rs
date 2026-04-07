use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::ProjectRow;

pub fn list_all(conn: &Connection) -> Result<Vec<ProjectRow>, AppError> {
    let mut stmt = conn.prepare("SELECT id, name, project_type, directory_path, created_at, updated_at FROM projects ORDER BY created_at DESC")?;
    let rows = stmt.query_map([], |row| {
        Ok(ProjectRow {
            id: row.get(0)?,
            name: row.get(1)?,
            project_type: row.get(2)?,
            directory_path: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.into())
}

pub fn find_by_id(conn: &Connection, id: &str) -> Result<ProjectRow, AppError> {
    conn.query_row(
        "SELECT id, name, project_type, directory_path, created_at, updated_at FROM projects WHERE id = ?1",
        [id],
        |row| {
            Ok(ProjectRow {
                id: row.get(0)?,
                name: row.get(1)?,
                project_type: row.get(2)?,
                directory_path: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        },
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("project {id}")),
        _ => e.into(),
    })
}

pub fn insert(conn: &Connection, row: &ProjectRow) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO projects (id, name, project_type, directory_path, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![row.id, row.name, row.project_type, row.directory_path, row.created_at, row.updated_at],
    )?;
    Ok(())
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM projects WHERE id = ?1", [id])?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{create_test_image, create_test_project, setup_test_db};

    #[test]
    fn test_insert_and_list_all() {
        let conn = setup_test_db();
        let p1 = ProjectRow {
            id: "p1".to_string(),
            name: "Project A".to_string(),
            project_type: "simple".to_string(),
            directory_path: "/tmp/a".to_string(),
            created_at: "2026-01-02T00:00:00Z".to_string(),
            updated_at: "2026-01-02T00:00:00Z".to_string(),
        };
        let p2 = ProjectRow {
            id: "p2".to_string(),
            name: "Project B".to_string(),
            project_type: "manga".to_string(),
            directory_path: "/tmp/b".to_string(),
            created_at: "2026-01-03T00:00:00Z".to_string(),
            updated_at: "2026-01-03T00:00:00Z".to_string(),
        };
        insert(&conn, &p1).unwrap();
        insert(&conn, &p2).unwrap();
        let list = list_all(&conn).unwrap();
        assert_eq!(list.len(), 2);
        // DESC order: p2 first
        assert_eq!(list[0].id, "p2");
        assert_eq!(list[1].id, "p1");
    }

    #[test]
    fn test_find_by_id() {
        let conn = setup_test_db();
        let project = create_test_project(&conn);
        let found = find_by_id(&conn, &project.id).unwrap();
        assert_eq!(found.name, "Test Project");
    }

    #[test]
    fn test_find_by_id_not_found() {
        let conn = setup_test_db();
        let result = find_by_id(&conn, "nonexistent");
        assert!(result.is_err());
    }

    #[test]
    fn test_delete_cascades_images() {
        let conn = setup_test_db();
        let project = create_test_project(&conn);
        create_test_image(&conn, &project.id, 0);
        create_test_image(&conn, &project.id, 1);

        let images = crate::repositories::image::list_by_project(&conn, &project.id, None).unwrap();
        assert_eq!(images.len(), 2);

        delete(&conn, &project.id).unwrap();

        let images = crate::repositories::image::list_by_project(&conn, &project.id, None).unwrap();
        assert_eq!(images.len(), 0);
    }
}
