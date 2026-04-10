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
