use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::GeneratedImageRow;

pub fn list_by_project(
    conn: &Connection,
    project_id: &str,
    saved_only: Option<bool>,
) -> Result<Vec<GeneratedImageRow>, AppError> {
    let sql = match saved_only {
        Some(true) => "SELECT id, project_id, file_path, seed, prompt_snapshot, width, height, model, is_saved, created_at FROM generated_images WHERE project_id = ?1 AND is_saved = 1 ORDER BY created_at DESC",
        _ => "SELECT id, project_id, file_path, seed, prompt_snapshot, width, height, model, is_saved, created_at FROM generated_images WHERE project_id = ?1 ORDER BY created_at DESC",
    };
    let mut stmt = conn.prepare(sql)?;
    let rows = stmt.query_map([project_id], |row| {
        Ok(GeneratedImageRow {
            id: row.get(0)?,
            project_id: row.get(1)?,
            file_path: row.get(2)?,
            seed: row.get(3)?,
            prompt_snapshot: row.get(4)?,
            width: row.get(5)?,
            height: row.get(6)?,
            model: row.get(7)?,
            is_saved: row.get(8)?,
            created_at: row.get(9)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.into())
}

pub fn find_by_id(conn: &Connection, id: &str) -> Result<GeneratedImageRow, AppError> {
    conn.query_row(
        "SELECT id, project_id, file_path, seed, prompt_snapshot, width, height, model, is_saved, created_at FROM generated_images WHERE id = ?1",
        [id],
        |row| {
            Ok(GeneratedImageRow {
                id: row.get(0)?,
                project_id: row.get(1)?,
                file_path: row.get(2)?,
                seed: row.get(3)?,
                prompt_snapshot: row.get(4)?,
                width: row.get(5)?,
                height: row.get(6)?,
                model: row.get(7)?,
                is_saved: row.get(8)?,
                created_at: row.get(9)?,
            })
        },
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("image {id}")),
        _ => e.into(),
    })
}

pub fn insert(conn: &Connection, row: &GeneratedImageRow) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO generated_images (id, project_id, file_path, seed, prompt_snapshot, width, height, model, is_saved, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![row.id, row.project_id, row.file_path, row.seed, row.prompt_snapshot, row.width, row.height, row.model, row.is_saved, row.created_at],
    )?;
    Ok(())
}

pub fn update_is_saved(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute("UPDATE generated_images SET is_saved = 1 WHERE id = ?1", [id])?;
    Ok(())
}

pub fn update_all_is_saved(conn: &Connection, project_id: &str) -> Result<(), AppError> {
    conn.execute("UPDATE generated_images SET is_saved = 1 WHERE project_id = ?1", [project_id])?;
    Ok(())
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM generated_images WHERE id = ?1", [id])?;
    Ok(())
}

pub fn delete_unsaved(conn: &Connection, project_id: &str) -> Result<Vec<String>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT file_path FROM generated_images WHERE project_id = ?1 AND is_saved = 0",
    )?;
    let paths: Vec<String> = stmt
        .query_map([project_id], |row| row.get(0))?
        .collect::<Result<Vec<_>, _>>()?;
    conn.execute(
        "DELETE FROM generated_images WHERE project_id = ?1 AND is_saved = 0",
        [project_id],
    )?;
    Ok(paths)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{create_test_image, create_test_project, setup_test_db};

    #[test]
    fn test_insert_and_list_by_project() {
        let conn = setup_test_db();
        let project = create_test_project(&conn);
        create_test_image(&conn, &project.id, 0);
        create_test_image(&conn, &project.id, 1);

        let images = list_by_project(&conn, &project.id, None).unwrap();
        assert_eq!(images.len(), 2);
    }

    #[test]
    fn test_list_by_project_saved_only() {
        let conn = setup_test_db();
        let project = create_test_project(&conn);
        create_test_image(&conn, &project.id, 0);
        create_test_image(&conn, &project.id, 1);

        let saved = list_by_project(&conn, &project.id, Some(true)).unwrap();
        assert_eq!(saved.len(), 1);
        assert_eq!(saved[0].is_saved, 1);
    }

    #[test]
    fn test_update_is_saved() {
        let conn = setup_test_db();
        let project = create_test_project(&conn);
        let img = create_test_image(&conn, &project.id, 0);
        assert_eq!(find_by_id(&conn, &img.id).unwrap().is_saved, 0);

        update_is_saved(&conn, &img.id).unwrap();
        assert_eq!(find_by_id(&conn, &img.id).unwrap().is_saved, 1);
    }

    #[test]
    fn test_update_all_is_saved() {
        let conn = setup_test_db();
        let project = create_test_project(&conn);
        create_test_image(&conn, &project.id, 0);
        create_test_image(&conn, &project.id, 0);

        update_all_is_saved(&conn, &project.id).unwrap();

        let all = list_by_project(&conn, &project.id, Some(true)).unwrap();
        assert_eq!(all.len(), 2);
    }

    #[test]
    fn test_delete() {
        let conn = setup_test_db();
        let project = create_test_project(&conn);
        let img = create_test_image(&conn, &project.id, 0);

        delete(&conn, &img.id).unwrap();
        assert!(find_by_id(&conn, &img.id).is_err());
    }

    #[test]
    fn test_delete_unsaved() {
        let conn = setup_test_db();
        let project = create_test_project(&conn);
        let unsaved = create_test_image(&conn, &project.id, 0);
        let saved = create_test_image(&conn, &project.id, 1);

        let paths = delete_unsaved(&conn, &project.id).unwrap();
        assert_eq!(paths.len(), 1);
        assert_eq!(paths[0], unsaved.file_path);

        // Saved image remains
        assert!(find_by_id(&conn, &saved.id).is_ok());
        // Unsaved image deleted
        assert!(find_by_id(&conn, &unsaved.id).is_err());
    }
}
