use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::{CreateStylePresetRequest, StylePresetDto, StylePresetRow, UpdateStylePresetRequest};
use crate::repositories::style_preset as style_preset_repo;

pub fn list_style_presets(conn: &Connection) -> Result<Vec<StylePresetDto>, AppError> {
    let rows = style_preset_repo::list_all(conn)?;
    let mut result = Vec::new();
    for row in rows {
        let vibe_ids = style_preset_repo::find_vibe_ids_by_preset(conn, &row.id)?;
        result.push(row.into_dto(vibe_ids));
    }
    Ok(result)
}

pub fn create_style_preset(
    conn: &Connection,
    req: CreateStylePresetRequest,
) -> Result<StylePresetDto, AppError> {
    let id = uuid::Uuid::new_v4().to_string();
    let artist_tags_json = serde_json::to_string(&req.artist_tags)
        .map_err(|e| AppError::Validation(format!("Invalid artist_tags: {e}")))?;

    let row = StylePresetRow {
        id,
        name: req.name,
        artist_tags: artist_tags_json,
        created_at: chrono::Utc::now().to_rfc3339(),
    };
    style_preset_repo::insert(conn, &row)?;
    style_preset_repo::replace_vibe_ids(conn, &row.id, &req.vibe_ids)?;

    let vibe_ids = style_preset_repo::find_vibe_ids_by_preset(conn, &row.id)?;
    Ok(row.into_dto(vibe_ids))
}

pub fn update_style_preset(
    conn: &Connection,
    req: UpdateStylePresetRequest,
) -> Result<(), AppError> {
    let mut row = style_preset_repo::find_by_id(conn, &req.id)?;

    if let Some(name) = req.name {
        row.name = name;
    }
    if let Some(artist_tags) = req.artist_tags {
        row.artist_tags = serde_json::to_string(&artist_tags)
            .map_err(|e| AppError::Validation(format!("Invalid artist_tags: {e}")))?;
    }
    style_preset_repo::update(conn, &row)?;

    if let Some(vibe_ids) = req.vibe_ids {
        style_preset_repo::replace_vibe_ids(conn, &row.id, &vibe_ids)?;
    }

    Ok(())
}

pub fn delete_style_preset(conn: &Connection, id: &str) -> Result<(), AppError> {
    style_preset_repo::delete(conn, id)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{create_test_vibe, setup_test_db};

    #[test]
    fn test_create_with_vibes() {
        let conn = setup_test_db();
        let v1 = create_test_vibe(&conn);
        let v2 = create_test_vibe(&conn);

        let req = CreateStylePresetRequest {
            name: "My Preset".to_string(),
            artist_tags: vec!["artist_a".to_string(), "artist_b".to_string()],
            vibe_ids: vec![v1.id.clone(), v2.id.clone()],
        };
        let dto = create_style_preset(&conn, req).unwrap();

        assert_eq!(dto.name, "My Preset");
        assert_eq!(dto.artist_tags, vec!["artist_a", "artist_b"]);
        assert_eq!(dto.vibe_ids.len(), 2);
        assert!(dto.vibe_ids.contains(&v1.id));
        assert!(dto.vibe_ids.contains(&v2.id));
    }

    #[test]
    fn test_create_empty_vibes() {
        let conn = setup_test_db();

        let req = CreateStylePresetRequest {
            name: "No Vibes".to_string(),
            artist_tags: vec!["solo_artist".to_string()],
            vibe_ids: vec![],
        };
        let dto = create_style_preset(&conn, req).unwrap();

        assert_eq!(dto.name, "No Vibes");
        assert!(dto.vibe_ids.is_empty());
    }

    #[test]
    fn test_update_partial_name_only() {
        let conn = setup_test_db();
        let v1 = create_test_vibe(&conn);

        let create_req = CreateStylePresetRequest {
            name: "Original".to_string(),
            artist_tags: vec!["artist_x".to_string()],
            vibe_ids: vec![v1.id.clone()],
        };
        let dto = create_style_preset(&conn, create_req).unwrap();

        // Update name only
        let update_req = UpdateStylePresetRequest {
            id: dto.id.clone(),
            name: Some("Renamed".to_string()),
            artist_tags: None,
            vibe_ids: None,
        };
        update_style_preset(&conn, update_req).unwrap();

        let all = list_style_presets(&conn).unwrap();
        assert_eq!(all.len(), 1);
        assert_eq!(all[0].name, "Renamed");
        assert_eq!(all[0].artist_tags, vec!["artist_x"]);
        assert_eq!(all[0].vibe_ids, vec![v1.id.clone()]);
    }

    #[test]
    fn test_update_partial_vibe_ids_only() {
        let conn = setup_test_db();
        let v1 = create_test_vibe(&conn);
        let v2 = create_test_vibe(&conn);

        let create_req = CreateStylePresetRequest {
            name: "Preset".to_string(),
            artist_tags: vec!["artist_y".to_string()],
            vibe_ids: vec![v1.id.clone()],
        };
        let dto = create_style_preset(&conn, create_req).unwrap();

        // Update vibe_ids only
        let update_req = UpdateStylePresetRequest {
            id: dto.id.clone(),
            name: None,
            artist_tags: None,
            vibe_ids: Some(vec![v2.id.clone()]),
        };
        update_style_preset(&conn, update_req).unwrap();

        let all = list_style_presets(&conn).unwrap();
        assert_eq!(all[0].name, "Preset");
        assert_eq!(all[0].vibe_ids, vec![v2.id.clone()]);
    }

    #[test]
    fn test_delete() {
        let conn = setup_test_db();

        let req = CreateStylePresetRequest {
            name: "To Delete".to_string(),
            artist_tags: vec![],
            vibe_ids: vec![],
        };
        let dto = create_style_preset(&conn, req).unwrap();

        delete_style_preset(&conn, &dto.id).unwrap();

        let all = list_style_presets(&conn).unwrap();
        assert!(all.is_empty());
    }

    #[test]
    fn test_update_not_found() {
        let conn = setup_test_db();
        let req = UpdateStylePresetRequest {
            id: "nonexistent".to_string(),
            name: Some("X".to_string()),
            artist_tags: None,
            vibe_ids: None,
        };
        let err = update_style_preset(&conn, req).unwrap_err();
        assert!(matches!(err, AppError::NotFound(_)));
    }
}
