use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::{CreateGenreRequest, GenreDto, GenreRow, UpdateGenreRequest};
use crate::repositories::genre as genre_repo;

pub fn list_genres(conn: &Connection) -> Result<Vec<GenreDto>, AppError> {
    let rows = genre_repo::list_all(conn)?;
    Ok(rows.into_iter().map(GenreDto::from).collect())
}

pub fn create_genre(conn: &Connection, req: CreateGenreRequest) -> Result<GenreDto, AppError> {
    let max_sort = genre_repo::get_max_sort_order(conn)?;

    let row = GenreRow {
        id: uuid::Uuid::new_v4().to_string(),
        name: req.name,
        is_system: 0,
        sort_order: max_sort + 1,
        created_at: chrono::Utc::now().to_rfc3339(),
        icon: req.icon.unwrap_or_else(|| "user".to_string()),
        color: req.color.unwrap_or_else(|| "#888888".to_string()),
    };
    genre_repo::insert(conn, &row)?;
    Ok(GenreDto::from(row))
}

pub fn update_genre(conn: &Connection, req: UpdateGenreRequest) -> Result<GenreDto, AppError> {
    let mut existing = genre_repo::find_by_id(conn, &req.id)?;

    if let Some(name) = req.name {
        existing.name = name;
    }
    if let Some(icon) = req.icon {
        existing.icon = icon;
    }
    if let Some(color) = req.color {
        existing.color = color;
    }

    genre_repo::update(conn, &existing)?;
    Ok(GenreDto::from(existing))
}

pub fn delete_genre(conn: &Connection, id: &str) -> Result<(), AppError> {
    let genre = genre_repo::find_by_id(conn, id)?;
    if genre.is_system != 0 {
        return Err(AppError::Validation(
            "system genre cannot be deleted".to_string(),
        ));
    }
    genre_repo::delete(conn, id)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::setup_test_db;

    #[test]
    fn test_create_auto_sort_order() {
        let conn = setup_test_db();
        let g1 = create_genre(
            &conn,
            CreateGenreRequest {
                name: "Custom A".to_string(),
                icon: Some("cat".to_string()),
                color: Some("#ff0000".to_string()),
            },
        )
        .unwrap();
        assert_eq!(g1.sort_order, 3);
        assert_eq!(g1.icon, "cat");
        assert_eq!(g1.color, "#ff0000");

        let g2 = create_genre(
            &conn,
            CreateGenreRequest {
                name: "Custom B".to_string(),
                icon: None,
                color: None,
            },
        )
        .unwrap();
        assert_eq!(g2.sort_order, 4);
        assert_eq!(g2.icon, "user"); // default
        assert_eq!(g2.color, "#888888"); // default
        assert!(!g1.is_system);
    }

    #[test]
    fn test_update_genre() {
        let conn = setup_test_db();
        let genre = create_genre(
            &conn,
            CreateGenreRequest {
                name: "Original".to_string(),
                icon: None,
                color: None,
            },
        )
        .unwrap();

        let updated = update_genre(
            &conn,
            UpdateGenreRequest {
                id: genre.id.clone(),
                name: Some("Updated".to_string()),
                icon: Some("dog".to_string()),
                color: Some("#00ff00".to_string()),
            },
        )
        .unwrap();

        assert_eq!(updated.name, "Updated");
        assert_eq!(updated.icon, "dog");
        assert_eq!(updated.color, "#00ff00");
    }

    #[test]
    fn test_delete_system_genre_rejected() {
        let conn = setup_test_db();
        let result = delete_genre(&conn, "genre-male");
        assert!(result.is_err());
        match result.unwrap_err() {
            AppError::Validation(msg) => assert!(msg.contains("system")),
            other => panic!("expected Validation, got {:?}", other),
        }
    }

    #[test]
    fn test_delete_user_genre() {
        let conn = setup_test_db();
        let genre = create_genre(
            &conn,
            CreateGenreRequest {
                name: "Deletable".to_string(),
                icon: None,
                color: None,
            },
        )
        .unwrap();

        delete_genre(&conn, &genre.id).unwrap();
        assert!(genre_repo::find_by_id(&conn, &genre.id).is_err());
    }
}
