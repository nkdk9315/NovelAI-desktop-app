use rusqlite::Connection;

use crate::error::AppError;

pub fn add_to_project(
    conn: &Connection,
    project_id: &str,
    vibe_id: &str,
) -> Result<(), AppError> {
    conn.execute(
        "INSERT OR IGNORE INTO project_vibes (project_id, vibe_id) VALUES (?1, ?2)",
        rusqlite::params![project_id, vibe_id],
    )?;
    Ok(())
}

pub fn remove_from_project(
    conn: &Connection,
    project_id: &str,
    vibe_id: &str,
) -> Result<(), AppError> {
    conn.execute(
        "DELETE FROM project_vibes WHERE project_id = ?1 AND vibe_id = ?2",
        rusqlite::params![project_id, vibe_id],
    )?;
    Ok(())
}

pub fn set_visibility(
    conn: &Connection,
    project_id: &str,
    vibe_id: &str,
    is_visible: bool,
) -> Result<(), AppError> {
    let updated = conn.execute(
        "UPDATE project_vibes SET is_visible = ?1 WHERE project_id = ?2 AND vibe_id = ?3",
        rusqlite::params![is_visible as i32, project_id, vibe_id],
    )?;
    if updated == 0 {
        return Err(AppError::NotFound(format!(
            "project_vibe {project_id}/{vibe_id}"
        )));
    }
    Ok(())
}

/// Returns vibe IDs for a project. If `visible_only` is true, only visible vibes are returned.
#[allow(dead_code)]
pub fn list_by_project(
    conn: &Connection,
    project_id: &str,
    visible_only: bool,
) -> Result<Vec<(String, bool)>, AppError> {
    let sql = if visible_only {
        "SELECT vibe_id, is_visible FROM project_vibes WHERE project_id = ?1 AND is_visible = 1 ORDER BY added_at ASC"
    } else {
        "SELECT vibe_id, is_visible FROM project_vibes WHERE project_id = ?1 ORDER BY added_at ASC"
    };
    let mut stmt = conn.prepare(sql)?;
    let rows = stmt.query_map([project_id], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, i32>(1)? != 0))
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.into())
}

/// Returns full vibe data joined with project_vibes in a single query.
pub fn list_with_vibe_details(
    conn: &Connection,
    project_id: &str,
    visible_only: bool,
) -> Result<Vec<(crate::models::dto::VibeRow, bool)>, AppError> {
    let sql = if visible_only {
        "SELECT v.id, v.name, v.file_path, v.model, v.created_at, v.thumbnail_path, v.is_favorite, pv.is_visible \
         FROM project_vibes pv JOIN vibes v ON pv.vibe_id = v.id \
         WHERE pv.project_id = ?1 AND pv.is_visible = 1 ORDER BY pv.added_at ASC"
    } else {
        "SELECT v.id, v.name, v.file_path, v.model, v.created_at, v.thumbnail_path, v.is_favorite, pv.is_visible \
         FROM project_vibes pv JOIN vibes v ON pv.vibe_id = v.id \
         WHERE pv.project_id = ?1 ORDER BY pv.added_at ASC"
    };
    let mut stmt = conn.prepare(sql)?;
    let rows = stmt.query_map([project_id], |row| {
        Ok((
            crate::models::dto::VibeRow {
                id: row.get(0)?,
                name: row.get(1)?,
                file_path: row.get(2)?,
                model: row.get(3)?,
                created_at: row.get(4)?,
                thumbnail_path: row.get(5)?,
                is_favorite: row.get::<_, i32>(6)? != 0,
            },
            row.get::<_, i32>(7)? != 0,
        ))
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.into())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{create_test_project, create_test_vibe, setup_test_db};

    #[test]
    fn test_add_and_list_by_project() {
        let conn = setup_test_db();
        let project = create_test_project(&conn);
        let v1 = create_test_vibe(&conn);
        let v2 = create_test_vibe(&conn);

        add_to_project(&conn, &project.id, &v1.id).unwrap();
        add_to_project(&conn, &project.id, &v2.id).unwrap();

        let all = list_by_project(&conn, &project.id, false).unwrap();
        assert_eq!(all.len(), 2);
        assert!(all.iter().all(|(_, visible)| *visible));
    }

    #[test]
    fn test_add_duplicate_is_ignored() {
        let conn = setup_test_db();
        let project = create_test_project(&conn);
        let vibe = create_test_vibe(&conn);

        add_to_project(&conn, &project.id, &vibe.id).unwrap();
        add_to_project(&conn, &project.id, &vibe.id).unwrap(); // no error

        let all = list_by_project(&conn, &project.id, false).unwrap();
        assert_eq!(all.len(), 1);
    }

    #[test]
    fn test_remove_from_project() {
        let conn = setup_test_db();
        let project = create_test_project(&conn);
        let vibe = create_test_vibe(&conn);

        add_to_project(&conn, &project.id, &vibe.id).unwrap();
        remove_from_project(&conn, &project.id, &vibe.id).unwrap();

        let all = list_by_project(&conn, &project.id, false).unwrap();
        assert!(all.is_empty());
    }

    #[test]
    fn test_set_visibility() {
        let conn = setup_test_db();
        let project = create_test_project(&conn);
        let vibe = create_test_vibe(&conn);

        add_to_project(&conn, &project.id, &vibe.id).unwrap();

        // Hide
        set_visibility(&conn, &project.id, &vibe.id, false).unwrap();
        let visible = list_by_project(&conn, &project.id, true).unwrap();
        assert!(visible.is_empty());
        let all = list_by_project(&conn, &project.id, false).unwrap();
        assert_eq!(all.len(), 1);
        assert!(!all[0].1);

        // Show again
        set_visibility(&conn, &project.id, &vibe.id, true).unwrap();
        let visible = list_by_project(&conn, &project.id, true).unwrap();
        assert_eq!(visible.len(), 1);
    }

    #[test]
    fn test_set_visibility_not_found() {
        let conn = setup_test_db();
        let err = set_visibility(&conn, "no-project", "no-vibe", false).unwrap_err();
        assert!(matches!(err, AppError::NotFound(_)));
    }

    #[test]
    fn test_cascade_on_project_delete() {
        let conn = setup_test_db();
        let project = create_test_project(&conn);
        let vibe = create_test_vibe(&conn);

        add_to_project(&conn, &project.id, &vibe.id).unwrap();

        // Delete project
        crate::repositories::project::delete(&conn, &project.id).unwrap();

        let all = list_by_project(&conn, &project.id, false).unwrap();
        assert!(all.is_empty());
    }

    #[test]
    fn test_cascade_on_vibe_delete() {
        let conn = setup_test_db();
        let project = create_test_project(&conn);
        let vibe = create_test_vibe(&conn);

        add_to_project(&conn, &project.id, &vibe.id).unwrap();

        // Delete vibe
        crate::repositories::vibe::delete(&conn, &vibe.id).unwrap();

        let all = list_by_project(&conn, &project.id, false).unwrap();
        assert!(all.is_empty());
    }
}
