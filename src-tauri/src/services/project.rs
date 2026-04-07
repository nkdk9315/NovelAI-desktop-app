use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::{CreateProjectRequest, ProjectDto, ProjectRow};

pub fn list_projects(conn: &Connection) -> Result<Vec<ProjectDto>, AppError> {
    let rows = crate::repositories::project::list_all(conn)?;
    Ok(rows.into_iter().map(ProjectDto::from).collect())
}

pub fn create_project(
    conn: &Connection,
    req: CreateProjectRequest,
) -> Result<ProjectDto, AppError> {
    let name = req.name.trim().to_string();
    if name.is_empty() {
        return Err(AppError::Validation("project name is required".to_string()));
    }
    let valid_types = ["simple", "manga", "cg"];
    if !valid_types.contains(&req.project_type.as_str()) {
        return Err(AppError::Validation(format!(
            "invalid project_type: {}",
            req.project_type
        )));
    }

    let dir = std::path::Path::new(&req.directory_path);
    if !dir.exists() {
        std::fs::create_dir_all(dir)?;
    }
    let images_dir = dir.join("images");
    if !images_dir.exists() {
        std::fs::create_dir_all(&images_dir)?;
    }

    let now = chrono::Utc::now().to_rfc3339();
    let row = ProjectRow {
        id: uuid::Uuid::new_v4().to_string(),
        name,
        project_type: req.project_type,
        directory_path: req.directory_path,
        created_at: now.clone(),
        updated_at: now,
    };
    crate::repositories::project::insert(conn, &row)?;
    Ok(ProjectDto::from(row))
}

pub fn open_project(conn: &Connection, id: &str) -> Result<ProjectDto, AppError> {
    crate::services::image::cleanup_unsaved_images(conn, id)?;
    let row = crate::repositories::project::find_by_id(conn, id)?;
    Ok(ProjectDto::from(row))
}

pub fn delete_project(conn: &Connection, id: &str) -> Result<(), AppError> {
    crate::repositories::project::delete(conn, id)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{create_test_image, setup_test_db};

    #[test]
    fn test_create_project() {
        let conn = setup_test_db();
        let tmp = tempfile::TempDir::new().unwrap();
        let dir = tmp.path().join("test-project");

        let req = CreateProjectRequest {
            name: "My Project".to_string(),
            project_type: "simple".to_string(),
            directory_path: dir.to_str().unwrap().to_string(),
        };
        let dto = create_project(&conn, req).unwrap();
        assert_eq!(dto.name, "My Project");
        assert!(dir.exists());
        assert!(dir.join("images").exists());
    }

    #[test]
    fn test_create_project_empty_name() {
        let conn = setup_test_db();
        let req = CreateProjectRequest {
            name: "  ".to_string(),
            project_type: "simple".to_string(),
            directory_path: "/tmp/x".to_string(),
        };
        assert!(create_project(&conn, req).is_err());
    }

    #[test]
    fn test_create_project_invalid_type() {
        let conn = setup_test_db();
        let req = CreateProjectRequest {
            name: "Test".to_string(),
            project_type: "invalid".to_string(),
            directory_path: "/tmp/x".to_string(),
        };
        assert!(create_project(&conn, req).is_err());
    }

    #[test]
    fn test_open_project_cleans_unsaved() {
        let conn = setup_test_db();
        let project = crate::test_utils::create_test_project(&conn);
        let saved = create_test_image(&conn, &project.id, 1);
        create_test_image(&conn, &project.id, 0);

        let dto = open_project(&conn, &project.id).unwrap();
        assert_eq!(dto.id, project.id);

        // Unsaved images should be cleaned from DB
        let remaining =
            crate::repositories::image::list_by_project(&conn, &project.id, None).unwrap();
        assert_eq!(remaining.len(), 1);
        assert_eq!(remaining[0].id, saved.id);
    }

    #[test]
    fn test_delete_project() {
        let conn = setup_test_db();
        let project = crate::test_utils::create_test_project(&conn);
        delete_project(&conn, &project.id).unwrap();

        let list = list_projects(&conn).unwrap();
        assert!(list.is_empty());
    }
}
