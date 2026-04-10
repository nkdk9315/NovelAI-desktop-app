use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::{ProjectVibeDto, VibeDto};

pub fn add_vibe_to_project(
    conn: &Connection,
    project_id: &str,
    vibe_id: &str,
) -> Result<(), AppError> {
    // Verify both exist
    crate::repositories::project::find_by_id(conn, project_id)?;
    crate::repositories::vibe::find_by_id(conn, vibe_id)?;
    crate::repositories::project_vibe::add_to_project(conn, project_id, vibe_id)
}

pub fn remove_vibe_from_project(
    conn: &Connection,
    project_id: &str,
    vibe_id: &str,
) -> Result<(), AppError> {
    crate::repositories::project_vibe::remove_from_project(conn, project_id, vibe_id)
}

pub fn set_vibe_visibility(
    conn: &Connection,
    project_id: &str,
    vibe_id: &str,
    is_visible: bool,
) -> Result<(), AppError> {
    crate::repositories::project_vibe::set_visibility(conn, project_id, vibe_id, is_visible)
}

/// List vibes for a project (visible only), returning full VibeDto.
pub fn list_project_vibes(
    conn: &Connection,
    project_id: &str,
) -> Result<Vec<VibeDto>, AppError> {
    let rows = crate::repositories::project_vibe::list_with_vibe_details(conn, project_id, true)?;
    Ok(rows.into_iter().map(|(row, _)| VibeDto::from(row)).collect())
}

/// List all vibes for a project (including hidden), returning ProjectVibeDto with visibility info.
pub fn list_project_vibes_all(
    conn: &Connection,
    project_id: &str,
) -> Result<Vec<ProjectVibeDto>, AppError> {
    let rows = crate::repositories::project_vibe::list_with_vibe_details(conn, project_id, false)?;
    Ok(rows
        .into_iter()
        .map(|(row, is_visible)| ProjectVibeDto {
            vibe_id: row.id,
            vibe_name: row.name,
            thumbnail_path: row.thumbnail_path,
            file_path: row.file_path,
            model: row.model,
            is_visible,
            added_at: row.created_at,
        })
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{create_test_project, create_test_vibe, setup_test_db};

    #[test]
    fn test_add_and_list_project_vibes() {
        let conn = setup_test_db();
        let project = create_test_project(&conn);
        let vibe = create_test_vibe(&conn);

        add_vibe_to_project(&conn, &project.id, &vibe.id).unwrap();

        let visible = list_project_vibes(&conn, &project.id).unwrap();
        assert_eq!(visible.len(), 1);
        assert_eq!(visible[0].id, vibe.id);

        let all = list_project_vibes_all(&conn, &project.id).unwrap();
        assert_eq!(all.len(), 1);
        assert!(all[0].is_visible);
    }

    #[test]
    fn test_add_nonexistent_vibe_fails() {
        let conn = setup_test_db();
        let project = create_test_project(&conn);
        let err = add_vibe_to_project(&conn, &project.id, "nonexistent").unwrap_err();
        assert!(matches!(err, AppError::NotFound(_)));
    }

    #[test]
    fn test_visibility_toggle() {
        let conn = setup_test_db();
        let project = create_test_project(&conn);
        let vibe = create_test_vibe(&conn);

        add_vibe_to_project(&conn, &project.id, &vibe.id).unwrap();

        set_vibe_visibility(&conn, &project.id, &vibe.id, false).unwrap();
        let visible = list_project_vibes(&conn, &project.id).unwrap();
        assert!(visible.is_empty());

        let all = list_project_vibes_all(&conn, &project.id).unwrap();
        assert_eq!(all.len(), 1);
        assert!(!all[0].is_visible);
    }

    #[test]
    fn test_remove_from_project() {
        let conn = setup_test_db();
        let project = create_test_project(&conn);
        let vibe = create_test_vibe(&conn);

        add_vibe_to_project(&conn, &project.id, &vibe.id).unwrap();
        remove_vibe_from_project(&conn, &project.id, &vibe.id).unwrap();

        let all = list_project_vibes_all(&conn, &project.id).unwrap();
        assert!(all.is_empty());
    }
}
