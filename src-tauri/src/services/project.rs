use std::path::PathBuf;

use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::{CreateProjectRequest, ProjectDto, ProjectRow, UpdateProjectRequest};

pub fn list_projects(
    conn: &Connection,
    search: Option<&str>,
    project_type: Option<&str>,
) -> Result<Vec<ProjectDto>, AppError> {
    let rows = crate::repositories::project::list_filtered(conn, search, project_type)?;
    Ok(rows.into_iter().map(ProjectDto::from).collect())
}

/// Sanitize a project name for use as a directory name.
fn sanitize_dir_name(name: &str) -> String {
    name.chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '-' || c == '_' || c == ' ' {
                c
            } else {
                '_'
            }
        })
        .collect::<String>()
        .trim()
        .to_string()
}

/// Compute the default project directory path.
pub fn default_project_dir(
    base_dir: &std::path::Path,
    project_type: &str,
    name: &str,
) -> PathBuf {
    base_dir
        .join("projects")
        .join(project_type)
        .join(sanitize_dir_name(name))
}

pub fn create_project(
    conn: &Connection,
    req: CreateProjectRequest,
    app_data_dir: &std::path::Path,
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

    let directory_path = match req.directory_path {
        Some(ref p) if !p.is_empty() => p.clone(),
        _ => default_project_dir(app_data_dir, &req.project_type, &name)
            .to_string_lossy()
            .to_string(),
    };

    let dir = std::path::Path::new(&directory_path);
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
        directory_path,
        created_at: now.clone(),
        updated_at: now,
        thumbnail_path: req.thumbnail_path,
    };
    crate::repositories::project::insert(conn, &row)?;
    Ok(ProjectDto::from(row))
}

pub fn update_project_thumbnail(
    conn: &Connection,
    id: &str,
    thumbnail_path: Option<&str>,
) -> Result<ProjectDto, AppError> {
    crate::repositories::project::update_thumbnail(conn, id, thumbnail_path)?;
    let row = crate::repositories::project::find_by_id(conn, id)?;
    Ok(ProjectDto::from(row))
}

pub fn update_project(
    conn: &Connection,
    req: UpdateProjectRequest,
) -> Result<ProjectDto, AppError> {
    crate::repositories::project::find_by_id(conn, &req.id)?;

    if let Some(ref name) = req.name {
        let trimmed = name.trim();
        if trimmed.is_empty() {
            return Err(AppError::Validation("project name is required".to_string()));
        }
        crate::repositories::project::update_name(conn, &req.id, trimmed)?;
    }

    if let Some(ref thumb) = req.thumbnail_path {
        crate::repositories::project::update_thumbnail(conn, &req.id, thumb.as_deref())?;
    }

    let row = crate::repositories::project::find_by_id(conn, &req.id)?;
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
    fn test_create_project_custom_dir() {
        let conn = setup_test_db();
        let tmp = tempfile::TempDir::new().unwrap();
        let dir = tmp.path().join("test-project");

        let req = CreateProjectRequest {
            name: "My Project".to_string(),
            project_type: "simple".to_string(),
            directory_path: Some(dir.to_str().unwrap().to_string()),
            thumbnail_path: None,
        };
        let dto = create_project(&conn, req, tmp.path()).unwrap();
        assert_eq!(dto.name, "My Project");
        assert_eq!(dto.thumbnail_path, None);
        assert!(dir.exists());
        assert!(dir.join("images").exists());
    }

    #[test]
    fn test_create_project_default_dir() {
        let conn = setup_test_db();
        let tmp = tempfile::TempDir::new().unwrap();

        let req = CreateProjectRequest {
            name: "My Art".to_string(),
            project_type: "simple".to_string(),
            directory_path: None,
            thumbnail_path: None,
        };
        let dto = create_project(&conn, req, tmp.path()).unwrap();
        let expected = tmp.path().join("projects/simple/My Art");
        assert_eq!(dto.directory_path, expected.to_str().unwrap());
        assert!(expected.join("images").exists());
    }

    #[test]
    fn test_create_project_empty_name() {
        let conn = setup_test_db();
        let tmp = tempfile::TempDir::new().unwrap();
        let req = CreateProjectRequest {
            name: "  ".to_string(),
            project_type: "simple".to_string(),
            directory_path: Some("/tmp/x".to_string()),
            thumbnail_path: None,
        };
        assert!(create_project(&conn, req, tmp.path()).is_err());
    }

    #[test]
    fn test_create_project_invalid_type() {
        let conn = setup_test_db();
        let tmp = tempfile::TempDir::new().unwrap();
        let req = CreateProjectRequest {
            name: "Test".to_string(),
            project_type: "invalid".to_string(),
            directory_path: Some("/tmp/x".to_string()),
            thumbnail_path: None,
        };
        assert!(create_project(&conn, req, tmp.path()).is_err());
    }

    #[test]
    fn test_create_project_with_thumbnail() {
        let conn = setup_test_db();
        let tmp = tempfile::TempDir::new().unwrap();
        let dir = tmp.path().join("thumb-project");

        let req = CreateProjectRequest {
            name: "Thumb Project".to_string(),
            project_type: "simple".to_string(),
            directory_path: Some(dir.to_str().unwrap().to_string()),
            thumbnail_path: Some("/tmp/thumb.png".to_string()),
        };
        let dto = create_project(&conn, req, tmp.path()).unwrap();
        assert_eq!(dto.thumbnail_path, Some("/tmp/thumb.png".to_string()));
    }

    #[test]
    fn test_sanitize_dir_name() {
        assert_eq!(sanitize_dir_name("hello world"), "hello world");
        assert_eq!(sanitize_dir_name("a/b\\c:d"), "a_b_c_d");
        assert_eq!(sanitize_dir_name("  spaces  "), "spaces");
        assert_eq!(sanitize_dir_name("../escape"), "___escape");
        assert_eq!(sanitize_dir_name("../../etc/passwd"), "______etc_passwd");
    }

    #[test]
    fn test_list_projects_with_filter() {
        let conn = setup_test_db();
        let tmp = tempfile::TempDir::new().unwrap();

        for (name, ptype) in [("Alpha", "simple"), ("Beta", "manga"), ("Gamma", "simple")] {
            let dir = tmp.path().join(name);
            let req = CreateProjectRequest {
                name: name.to_string(),
                project_type: ptype.to_string(),
                directory_path: Some(dir.to_str().unwrap().to_string()),
                thumbnail_path: None,
            };
            create_project(&conn, req, tmp.path()).unwrap();
        }

        let all = list_projects(&conn, None, None).unwrap();
        assert_eq!(all.len(), 3);

        let simple = list_projects(&conn, None, Some("simple")).unwrap();
        assert_eq!(simple.len(), 2);

        let search = list_projects(&conn, Some("Alpha"), None).unwrap();
        assert_eq!(search.len(), 1);
        assert_eq!(search[0].name, "Alpha");
    }

    #[test]
    fn test_update_thumbnail() {
        let conn = setup_test_db();
        let project = crate::test_utils::create_test_project(&conn);

        let dto = update_project_thumbnail(&conn, &project.id, Some("/tmp/t.png")).unwrap();
        assert_eq!(dto.thumbnail_path, Some("/tmp/t.png".to_string()));

        let dto = update_project_thumbnail(&conn, &project.id, None).unwrap();
        assert_eq!(dto.thumbnail_path, None);
    }

    #[test]
    fn test_open_project_cleans_unsaved() {
        let conn = setup_test_db();
        let project = crate::test_utils::create_test_project(&conn);
        let saved = create_test_image(&conn, &project.id, 1);
        create_test_image(&conn, &project.id, 0);

        let dto = open_project(&conn, &project.id).unwrap();
        assert_eq!(dto.id, project.id);

        let remaining =
            crate::repositories::image::list_by_project(&conn, &project.id, None).unwrap();
        assert_eq!(remaining.len(), 1);
        assert_eq!(remaining[0].id, saved.id);
    }

    #[test]
    fn test_update_project_name_only() {
        let conn = setup_test_db();
        let project = crate::test_utils::create_test_project(&conn);
        let req = UpdateProjectRequest {
            id: project.id.clone(),
            name: Some("Updated Name".to_string()),
            thumbnail_path: None,
        };
        let dto = update_project(&conn, req).unwrap();
        assert_eq!(dto.name, "Updated Name");
        assert_eq!(dto.thumbnail_path, None); // unchanged
    }

    #[test]
    fn test_update_project_thumbnail_only() {
        let conn = setup_test_db();
        let project = crate::test_utils::create_test_project(&conn);
        let req = UpdateProjectRequest {
            id: project.id.clone(),
            name: None,
            thumbnail_path: Some(Some("/tmp/new.png".to_string())),
        };
        let dto = update_project(&conn, req).unwrap();
        assert_eq!(dto.name, "Test Project"); // unchanged
        assert_eq!(dto.thumbnail_path, Some("/tmp/new.png".to_string()));
    }

    #[test]
    fn test_update_project_both() {
        let conn = setup_test_db();
        let project = crate::test_utils::create_test_project(&conn);
        let req = UpdateProjectRequest {
            id: project.id.clone(),
            name: Some("New Name".to_string()),
            thumbnail_path: Some(Some("/tmp/t.png".to_string())),
        };
        let dto = update_project(&conn, req).unwrap();
        assert_eq!(dto.name, "New Name");
        assert_eq!(dto.thumbnail_path, Some("/tmp/t.png".to_string()));
    }

    #[test]
    fn test_update_project_clear_thumbnail() {
        let conn = setup_test_db();
        let project = crate::test_utils::create_test_project(&conn);
        // First set a thumbnail
        let req = UpdateProjectRequest {
            id: project.id.clone(),
            name: None,
            thumbnail_path: Some(Some("/tmp/t.png".to_string())),
        };
        update_project(&conn, req).unwrap();
        // Then clear it
        let req = UpdateProjectRequest {
            id: project.id.clone(),
            name: None,
            thumbnail_path: Some(None),
        };
        let dto = update_project(&conn, req).unwrap();
        assert_eq!(dto.thumbnail_path, None);
    }

    #[test]
    fn test_update_project_empty_name() {
        let conn = setup_test_db();
        let project = crate::test_utils::create_test_project(&conn);
        let req = UpdateProjectRequest {
            id: project.id.clone(),
            name: Some("  ".to_string()),
            thumbnail_path: None,
        };
        assert!(update_project(&conn, req).is_err());
    }

    #[test]
    fn test_update_project_not_found() {
        let conn = setup_test_db();
        let req = UpdateProjectRequest {
            id: "nonexistent".to_string(),
            name: Some("Name".to_string()),
            thumbnail_path: None,
        };
        assert!(update_project(&conn, req).is_err());
    }

    #[test]
    fn test_delete_project() {
        let conn = setup_test_db();
        let project = crate::test_utils::create_test_project(&conn);
        delete_project(&conn, &project.id).unwrap();

        let list = list_projects(&conn, None, None).unwrap();
        assert!(list.is_empty());
    }
}
