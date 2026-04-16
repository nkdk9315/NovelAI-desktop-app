use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::SystemGroupGenreDefaultDto;
use crate::repositories::system_group_settings as repo;

fn validate_system_group_id(id: &str) -> Result<(), AppError> {
    // Accept both the built-in system prompt groups and tag-database favorite
    // groups. Both have stable ids so settings persist independently of
    // sidebar membership.
    if id.starts_with("system-group-cat-") || id.starts_with("tagdb-") {
        return Ok(());
    }
    Err(AppError::Validation(format!(
        "not a system/tagdb prompt group id: {id}"
    )))
}

pub fn get_defaults(
    conn: &Connection,
    system_group_id: &str,
) -> Result<Vec<SystemGroupGenreDefaultDto>, AppError> {
    validate_system_group_id(system_group_id)?;
    repo::list_by_group(conn, system_group_id)
}

pub fn set_defaults(
    conn: &mut Connection,
    system_group_id: &str,
    entries: Vec<SystemGroupGenreDefaultDto>,
) -> Result<(), AppError> {
    validate_system_group_id(system_group_id)?;
    repo::replace_for_group(conn, system_group_id, &entries)
}

pub fn list_default_groups_for_genre(
    conn: &Connection,
    genre_id: &str,
) -> Result<Vec<String>, AppError> {
    repo::list_default_groups_for_genre(conn, genre_id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{create_test_genre, setup_test_db};

    #[test]
    fn test_validates_prefix() {
        let mut conn = setup_test_db();
        let err = set_defaults(&mut conn, "not-a-system-group", vec![]);
        assert!(matches!(err, Err(AppError::Validation(_))));
    }

    #[test]
    fn test_set_and_get() {
        let mut conn = setup_test_db();
        // system_group_genre_defaults was retired in migration 020; the
        // unified table FKs against prompt_groups, so the system rows must
        // exist before we can persist defaults.
        crate::services::system_prompt::seed_system_prompt_groups(&conn).unwrap();
        let g = create_test_genre(&conn);
        set_defaults(
            &mut conn,
            "system-group-cat-0",
            vec![SystemGroupGenreDefaultDto {
                genre_id: g.id.clone(),
                show_by_default: true,
            }],
        )
        .unwrap();

        let listed = get_defaults(&conn, "system-group-cat-0").unwrap();
        assert_eq!(listed.len(), 1);
        assert!(listed[0].show_by_default);

        let defaults = list_default_groups_for_genre(&conn, &g.id).unwrap();
        assert_eq!(defaults, vec!["system-group-cat-0".to_string()]);
    }
}
