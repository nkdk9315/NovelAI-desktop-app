// Post-migration 020: `system_group_genre_defaults` no longer exists. System
// group "default-visible genres" are now stored in the unified
// `prompt_group_default_genres` table, identical to user-created groups.
//
// This module is kept as a thin compatibility shim over that table so the
// existing `system_group_settings` command surface (and `SystemGroupSettingsModal`
// on the frontend) continues to work without IPC contract churn. New code
// should prefer `repositories::prompt_group::{list_default_genres,
// set_default_genres, list_groups_for_default_genre}`.

use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::SystemGroupGenreDefaultDto;
use crate::repositories::prompt_group as pg_repo;

pub fn list_by_group(
    conn: &Connection,
    system_group_id: &str,
) -> Result<Vec<SystemGroupGenreDefaultDto>, AppError> {
    let ids = pg_repo::list_default_genres(conn, system_group_id)?;
    Ok(ids
        .into_iter()
        .map(|genre_id| SystemGroupGenreDefaultDto {
            genre_id,
            show_by_default: true,
        })
        .collect())
}

pub fn list_default_groups_for_genre(
    conn: &Connection,
    genre_id: &str,
) -> Result<Vec<String>, AppError> {
    pg_repo::list_groups_for_default_genre(conn, genre_id)
}

pub fn replace_for_group(
    conn: &mut Connection,
    system_group_id: &str,
    entries: &[SystemGroupGenreDefaultDto],
) -> Result<(), AppError> {
    let tx = conn.transaction()?;
    let genre_ids: Vec<String> = entries
        .iter()
        .filter(|e| e.show_by_default)
        .map(|e| e.genre_id.clone())
        .collect();
    pg_repo::set_default_genres(&tx, system_group_id, &genre_ids)?;
    tx.commit()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{create_test_genre, setup_test_db};

    #[test]
    fn test_replace_and_list() {
        let mut conn = setup_test_db();
        let g1 = create_test_genre(&conn);
        let g2 = create_test_genre(&conn);
        let sgid = "system-group-cat-0";
        // The unified table has an FK to prompt_groups, so the system group
        // row must exist first.
        crate::services::system_prompt::seed_system_prompt_groups(&conn).unwrap();

        replace_for_group(
            &mut conn,
            sgid,
            &[
                SystemGroupGenreDefaultDto {
                    genre_id: g1.id.clone(),
                    show_by_default: true,
                },
                SystemGroupGenreDefaultDto {
                    genre_id: g2.id.clone(),
                    show_by_default: false,
                },
            ],
        )
        .unwrap();

        let listed = list_by_group(&conn, sgid).unwrap();
        // Only the `true` entry is persisted in the unified model.
        assert_eq!(listed.len(), 1);
        assert_eq!(listed[0].genre_id, g1.id);

        let defaults = list_default_groups_for_genre(&conn, &g1.id).unwrap();
        assert_eq!(defaults, vec![sgid.to_string()]);

        let defaults2 = list_default_groups_for_genre(&conn, &g2.id).unwrap();
        assert!(defaults2.is_empty());
    }

    #[test]
    fn test_replace_clears_previous() {
        let mut conn = setup_test_db();
        let g1 = create_test_genre(&conn);
        let sgid = "system-group-cat-1";
        crate::services::system_prompt::seed_system_prompt_groups(&conn).unwrap();

        replace_for_group(
            &mut conn,
            sgid,
            &[SystemGroupGenreDefaultDto {
                genre_id: g1.id.clone(),
                show_by_default: true,
            }],
        )
        .unwrap();

        replace_for_group(&mut conn, sgid, &[]).unwrap();
        let listed = list_by_group(&conn, sgid).unwrap();
        assert!(listed.is_empty());
    }
}
