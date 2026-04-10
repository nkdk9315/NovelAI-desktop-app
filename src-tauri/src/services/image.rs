use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::GeneratedImageDto;

pub fn save_image(conn: &Connection, image_id: &str) -> Result<(), AppError> {
    crate::repositories::image::update_is_saved(conn, image_id)
}

pub fn save_all_images(conn: &Connection, project_id: &str) -> Result<(), AppError> {
    crate::repositories::image::update_all_is_saved(conn, project_id)
}

pub fn delete_image(conn: &Connection, image_id: &str) -> Result<(), AppError> {
    let image = crate::repositories::image::find_by_id(conn, image_id)?;
    let project = crate::repositories::project::find_by_id(conn, &image.project_id)?;
    let full_path = std::path::Path::new(&project.directory_path).join(&image.file_path);
    if full_path.exists() {
        let _ = std::fs::remove_file(&full_path);
    }
    crate::repositories::image::delete(conn, image_id)
}

pub fn get_project_images(
    conn: &Connection,
    project_id: &str,
    saved_only: Option<bool>,
) -> Result<Vec<GeneratedImageDto>, AppError> {
    let rows = crate::repositories::image::list_by_project(conn, project_id, saved_only)?;
    Ok(rows.into_iter().map(Into::into).collect())
}

pub fn cleanup_unsaved_images(conn: &Connection, project_id: &str) -> Result<(), AppError> {
    let project = crate::repositories::project::find_by_id(conn, project_id)?;
    let paths = crate::repositories::image::delete_unsaved(conn, project_id)?;
    let base_dir = std::path::Path::new(&project.directory_path);
    for path in paths {
        let full_path = base_dir.join(&path);
        if full_path.exists() {
            let _ = std::fs::remove_file(&full_path);
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::dto::ProjectRow;
    use crate::test_utils::{create_test_image, setup_test_db};

    fn create_project_with_dir(conn: &Connection, dir: &std::path::Path) -> ProjectRow {
        let row = ProjectRow {
            id: uuid::Uuid::new_v4().to_string(),
            name: "Test Project".to_string(),
            project_type: "simple".to_string(),
            directory_path: dir.to_str().unwrap().to_string(),
            created_at: "2026-01-01T00:00:00Z".to_string(),
            updated_at: "2026-01-01T00:00:00Z".to_string(),
            thumbnail_path: None,
        };
        crate::repositories::project::insert(conn, &row).unwrap();
        row
    }

    #[test]
    fn test_save_image() {
        let conn = setup_test_db();
        let project = crate::test_utils::create_test_project(&conn);
        let img = create_test_image(&conn, &project.id, 0);
        assert_eq!(crate::repositories::image::find_by_id(&conn, &img.id).unwrap().is_saved, 0);

        save_image(&conn, &img.id).unwrap();
        assert_eq!(crate::repositories::image::find_by_id(&conn, &img.id).unwrap().is_saved, 1);
    }

    #[test]
    fn test_save_all_images() {
        let conn = setup_test_db();
        let project = crate::test_utils::create_test_project(&conn);
        create_test_image(&conn, &project.id, 0);
        create_test_image(&conn, &project.id, 0);

        save_all_images(&conn, &project.id).unwrap();

        let all = crate::repositories::image::list_by_project(&conn, &project.id, Some(true)).unwrap();
        assert_eq!(all.len(), 2);
    }

    #[test]
    fn test_delete_image() {
        let conn = setup_test_db();
        let tmp = tempfile::TempDir::new().unwrap();
        let project = create_project_with_dir(&conn, tmp.path());
        let img = create_test_image(&conn, &project.id, 0);

        // Create the dummy file
        let images_dir = tmp.path().join("images");
        std::fs::create_dir_all(&images_dir).unwrap();
        let file_path = tmp.path().join(&img.file_path);
        std::fs::write(&file_path, b"fake png").unwrap();
        assert!(file_path.exists());

        delete_image(&conn, &img.id).unwrap();

        // DB record gone
        assert!(crate::repositories::image::find_by_id(&conn, &img.id).is_err());
        // File deleted
        assert!(!file_path.exists());
    }

    #[test]
    fn test_delete_image_missing_file() {
        let conn = setup_test_db();
        let tmp = tempfile::TempDir::new().unwrap();
        let project = create_project_with_dir(&conn, tmp.path());
        let img = create_test_image(&conn, &project.id, 0);

        // Don't create the file — should not error
        delete_image(&conn, &img.id).unwrap();
        assert!(crate::repositories::image::find_by_id(&conn, &img.id).is_err());
    }

    #[test]
    fn test_get_project_images() {
        let conn = setup_test_db();
        let project = crate::test_utils::create_test_project(&conn);
        create_test_image(&conn, &project.id, 0);
        create_test_image(&conn, &project.id, 1);

        let all = get_project_images(&conn, &project.id, None).unwrap();
        assert_eq!(all.len(), 2);
        // Verify it returns GeneratedImageDto (is_saved is bool)
        assert!(all.iter().any(|img| img.is_saved));
        assert!(all.iter().any(|img| !img.is_saved));

        let saved = get_project_images(&conn, &project.id, Some(true)).unwrap();
        assert_eq!(saved.len(), 1);
        assert!(saved[0].is_saved);
    }
}
