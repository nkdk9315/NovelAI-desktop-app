use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::ProjectRow;

pub fn find_by_id(conn: &Connection, id: &str) -> Result<ProjectRow, AppError> {
    conn.query_row(
        "SELECT id, name, project_type, directory_path, created_at, updated_at, thumbnail_path FROM projects WHERE id = ?1",
        [id],
        |row| {
            Ok(ProjectRow {
                id: row.get(0)?,
                name: row.get(1)?,
                project_type: row.get(2)?,
                directory_path: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                thumbnail_path: row.get(6)?,
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
        "INSERT INTO projects (id, name, project_type, directory_path, created_at, updated_at, thumbnail_path) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![row.id, row.name, row.project_type, row.directory_path, row.created_at, row.updated_at, row.thumbnail_path],
    )?;
    Ok(())
}

pub fn list_filtered(
    conn: &Connection,
    search: Option<&str>,
    project_type: Option<&str>,
) -> Result<Vec<ProjectRow>, AppError> {
    let mut sql = String::from(
        "SELECT id, name, project_type, directory_path, created_at, updated_at, thumbnail_path FROM projects WHERE 1=1",
    );
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(s) = search {
        if !s.is_empty() {
            sql.push_str(" AND name LIKE ?");
            params.push(Box::new(format!("%{s}%")));
        }
    }
    if let Some(pt) = project_type {
        if !pt.is_empty() {
            sql.push_str(" AND project_type = ?");
            params.push(Box::new(pt.to_string()));
        }
    }
    sql.push_str(" ORDER BY created_at DESC");

    let mut stmt = conn.prepare(&sql)?;
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let rows = stmt.query_map(param_refs.as_slice(), |row| {
        Ok(ProjectRow {
            id: row.get(0)?,
            name: row.get(1)?,
            project_type: row.get(2)?,
            directory_path: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
            thumbnail_path: row.get(6)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.into())
}

pub fn update_thumbnail(
    conn: &Connection,
    id: &str,
    thumbnail_path: Option<&str>,
) -> Result<(), AppError> {
    let updated = conn.execute(
        "UPDATE projects SET thumbnail_path = ?1, updated_at = ?2 WHERE id = ?3",
        rusqlite::params![thumbnail_path, chrono::Utc::now().to_rfc3339(), id],
    )?;
    if updated == 0 {
        return Err(AppError::NotFound(format!("project {id}")));
    }
    Ok(())
}

pub fn update_name(conn: &Connection, id: &str, name: &str) -> Result<(), AppError> {
    let updated = conn.execute(
        "UPDATE projects SET name = ?1, updated_at = ?2 WHERE id = ?3",
        rusqlite::params![name, chrono::Utc::now().to_rfc3339(), id],
    )?;
    if updated == 0 {
        return Err(AppError::NotFound(format!("project {id}")));
    }
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
            thumbnail_path: None,
        };
        let p2 = ProjectRow {
            id: "p2".to_string(),
            name: "Project B".to_string(),
            project_type: "manga".to_string(),
            directory_path: "/tmp/b".to_string(),
            created_at: "2026-01-03T00:00:00Z".to_string(),
            updated_at: "2026-01-03T00:00:00Z".to_string(),
            thumbnail_path: None,
        };
        insert(&conn, &p1).unwrap();
        insert(&conn, &p2).unwrap();
        let list = list_filtered(&conn, None, None).unwrap();
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
    fn test_insert_with_thumbnail() {
        let conn = setup_test_db();
        let row = ProjectRow {
            id: "pt1".to_string(),
            name: "Thumb Project".to_string(),
            project_type: "simple".to_string(),
            directory_path: "/tmp/tp".to_string(),
            created_at: "2026-01-01T00:00:00Z".to_string(),
            updated_at: "2026-01-01T00:00:00Z".to_string(),
            thumbnail_path: Some("/tmp/thumb.png".to_string()),
        };
        insert(&conn, &row).unwrap();
        let found = find_by_id(&conn, "pt1").unwrap();
        assert_eq!(found.thumbnail_path, Some("/tmp/thumb.png".to_string()));
    }

    #[test]
    fn test_update_thumbnail() {
        let conn = setup_test_db();
        let project = create_test_project(&conn);
        assert_eq!(project.thumbnail_path, None);

        update_thumbnail(&conn, &project.id, Some("/tmp/new.png")).unwrap();
        let found = find_by_id(&conn, &project.id).unwrap();
        assert_eq!(found.thumbnail_path, Some("/tmp/new.png".to_string()));

        // Clear thumbnail
        update_thumbnail(&conn, &project.id, None).unwrap();
        let found = find_by_id(&conn, &project.id).unwrap();
        assert_eq!(found.thumbnail_path, None);
    }

    #[test]
    fn test_update_thumbnail_not_found() {
        let conn = setup_test_db();
        let result = update_thumbnail(&conn, "nonexistent", Some("/tmp/x.png"));
        assert!(result.is_err());
    }

    #[test]
    fn test_list_filtered_by_name() {
        let conn = setup_test_db();
        let p1 = ProjectRow {
            id: "f1".to_string(),
            name: "Alice Art".to_string(),
            project_type: "simple".to_string(),
            directory_path: "/tmp/f1".to_string(),
            created_at: "2026-01-01T00:00:00Z".to_string(),
            updated_at: "2026-01-01T00:00:00Z".to_string(),
            thumbnail_path: None,
        };
        let p2 = ProjectRow {
            id: "f2".to_string(),
            name: "Bob Manga".to_string(),
            project_type: "manga".to_string(),
            directory_path: "/tmp/f2".to_string(),
            created_at: "2026-01-02T00:00:00Z".to_string(),
            updated_at: "2026-01-02T00:00:00Z".to_string(),
            thumbnail_path: None,
        };
        insert(&conn, &p1).unwrap();
        insert(&conn, &p2).unwrap();

        let results = list_filtered(&conn, Some("Alice"), None).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].id, "f1");

        let results = list_filtered(&conn, Some("art"), None).unwrap();
        assert_eq!(results.len(), 1); // case-insensitive LIKE in SQLite
    }

    #[test]
    fn test_list_filtered_by_type() {
        let conn = setup_test_db();
        let p1 = ProjectRow {
            id: "ft1".to_string(),
            name: "Simple One".to_string(),
            project_type: "simple".to_string(),
            directory_path: "/tmp/ft1".to_string(),
            created_at: "2026-01-01T00:00:00Z".to_string(),
            updated_at: "2026-01-01T00:00:00Z".to_string(),
            thumbnail_path: None,
        };
        let p2 = ProjectRow {
            id: "ft2".to_string(),
            name: "Manga One".to_string(),
            project_type: "manga".to_string(),
            directory_path: "/tmp/ft2".to_string(),
            created_at: "2026-01-02T00:00:00Z".to_string(),
            updated_at: "2026-01-02T00:00:00Z".to_string(),
            thumbnail_path: None,
        };
        insert(&conn, &p1).unwrap();
        insert(&conn, &p2).unwrap();

        let results = list_filtered(&conn, None, Some("manga")).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].id, "ft2");
    }

    #[test]
    fn test_list_filtered_combined() {
        let conn = setup_test_db();
        let rows = vec![
            ProjectRow { id: "c1".into(), name: "Cat Simple".into(), project_type: "simple".into(), directory_path: "/tmp/c1".into(), created_at: "2026-01-01T00:00:00Z".into(), updated_at: "2026-01-01T00:00:00Z".into(), thumbnail_path: None },
            ProjectRow { id: "c2".into(), name: "Cat Manga".into(), project_type: "manga".into(), directory_path: "/tmp/c2".into(), created_at: "2026-01-02T00:00:00Z".into(), updated_at: "2026-01-02T00:00:00Z".into(), thumbnail_path: None },
            ProjectRow { id: "c3".into(), name: "Dog Simple".into(), project_type: "simple".into(), directory_path: "/tmp/c3".into(), created_at: "2026-01-03T00:00:00Z".into(), updated_at: "2026-01-03T00:00:00Z".into(), thumbnail_path: None },
        ];
        for r in &rows { insert(&conn, r).unwrap(); }

        let results = list_filtered(&conn, Some("Cat"), Some("simple")).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].id, "c1");

        // No filter returns all
        let results = list_filtered(&conn, None, None).unwrap();
        assert_eq!(results.len(), 3);
    }

    #[test]
    fn test_update_name() {
        let conn = setup_test_db();
        let project = create_test_project(&conn);
        update_name(&conn, &project.id, "New Name").unwrap();
        let found = find_by_id(&conn, &project.id).unwrap();
        assert_eq!(found.name, "New Name");
        assert_ne!(found.updated_at, project.updated_at);
    }

    #[test]
    fn test_update_name_not_found() {
        let conn = setup_test_db();
        let result = update_name(&conn, "nonexistent", "Name");
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
