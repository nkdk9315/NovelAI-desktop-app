use rusqlite::Connection;

use crate::error::AppError;
use std::path::Path;

use crate::models::dto::{CreateStylePresetRequest, StylePresetDto, StylePresetRow, UpdateStylePresetRequest};
use crate::repositories::style_preset as style_preset_repo;

pub fn list_style_presets(conn: &Connection) -> Result<Vec<StylePresetDto>, AppError> {
    let rows = style_preset_repo::list_all(conn)?;
    let mut result = Vec::new();
    for row in rows {
        let vibe_ids = style_preset_repo::find_vibe_refs_by_preset(conn, &row.id)?;
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
        thumbnail_path: None,
        is_favorite: false,
        model: req.model,
    };
    style_preset_repo::insert(conn, &row)?;
    style_preset_repo::replace_vibe_refs(conn, &row.id, &req.vibe_refs)?;

    let vibe_refs = style_preset_repo::find_vibe_refs_by_preset(conn, &row.id)?;
    Ok(row.into_dto(vibe_refs))
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

    if let Some(vibe_refs) = req.vibe_refs {
        style_preset_repo::replace_vibe_refs(conn, &row.id, &vibe_refs)?;
    }

    Ok(())
}

pub fn update_preset_thumbnail(
    conn: &Connection,
    app_data_dir: &Path,
    id: &str,
    source_path: &str,
) -> Result<StylePresetDto, AppError> {
    style_preset_repo::find_by_id(conn, id)?;
    let source = Path::new(source_path);
    if !source.exists() {
        return Err(AppError::Validation(format!("Thumbnail file not found: {source_path}")));
    }
    let thumbs_dir = app_data_dir.join("preset-thumbnails");
    std::fs::create_dir_all(&thumbs_dir)
        .map_err(|e| AppError::Io(format!("Failed to create preset-thumbnails dir: {e}")))?;
    let ext = source.extension().and_then(|e| e.to_str()).unwrap_or("png");
    crate::services::vibe::validate_image_extension(ext)?;
    let dest = thumbs_dir.join(format!("{id}.{ext}"));
    std::fs::copy(source, &dest)
        .map_err(|e| AppError::Io(format!("Failed to copy thumbnail: {e}")))?;
    let dest_str = dest.to_string_lossy().to_string();
    style_preset_repo::update_thumbnail(conn, id, Some(&dest_str))?;
    let row = style_preset_repo::find_by_id(conn, id)?;
    let vibe_ids = style_preset_repo::find_vibe_refs_by_preset(conn, id)?;
    Ok(row.into_dto(vibe_ids))
}

pub fn clear_preset_thumbnail(conn: &Connection, id: &str) -> Result<StylePresetDto, AppError> {
    let row = style_preset_repo::find_by_id(conn, id)?;
    if let Some(ref thumb_path) = row.thumbnail_path {
        let path = Path::new(thumb_path);
        if path.exists() {
            let _ = std::fs::remove_file(path);
        }
    }
    style_preset_repo::update_thumbnail(conn, id, None)?;
    let row = style_preset_repo::find_by_id(conn, id)?;
    let vibe_ids = style_preset_repo::find_vibe_refs_by_preset(conn, id)?;
    Ok(row.into_dto(vibe_ids))
}

pub fn toggle_preset_favorite(conn: &Connection, id: &str) -> Result<StylePresetDto, AppError> {
    style_preset_repo::toggle_favorite(conn, id)?;
    let row = style_preset_repo::find_by_id(conn, id)?;
    let vibe_refs = style_preset_repo::find_vibe_refs_by_preset(conn, id)?;
    Ok(row.into_dto(vibe_refs))
}

pub fn delete_style_preset(conn: &Connection, id: &str) -> Result<(), AppError> {
    style_preset_repo::delete(conn, id)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::dto::{ArtistTag, PresetVibeRef};
    use crate::test_utils::{create_test_vibe, setup_test_db};

    #[test]
    fn test_create_with_vibes() {
        let conn = setup_test_db();
        let v1 = create_test_vibe(&conn);
        let v2 = create_test_vibe(&conn);

        let req = CreateStylePresetRequest {
            name: "My Preset".to_string(),
            artist_tags: vec![ArtistTag { name: "artist_a".to_string(), strength: 0.0 }, ArtistTag { name: "artist_b".to_string(), strength: 0.0 }],
            vibe_refs: vec![PresetVibeRef { vibe_id: v1.id.clone(), strength: 0.7 }, PresetVibeRef { vibe_id: v2.id.clone(), strength: 0.5 }],
            model: "nai-diffusion-4-5-full".to_string(),
        };
        let dto = create_style_preset(&conn, req).unwrap();

        assert_eq!(dto.name, "My Preset");
        assert_eq!(dto.artist_tags.len(), 2);
        assert_eq!(dto.artist_tags[0].name, "artist_a");
        assert_eq!(dto.artist_tags[1].name, "artist_b");
        assert_eq!(dto.vibe_refs.len(), 2);
    }

    #[test]
    fn test_create_empty_vibes() {
        let conn = setup_test_db();

        let req = CreateStylePresetRequest {
            name: "No Vibes".to_string(),
            artist_tags: vec![ArtistTag { name: "solo_artist".to_string(), strength: 0.0 }],
            vibe_refs: vec![],
            model: "nai-diffusion-4-5-full".to_string(),
        };
        let dto = create_style_preset(&conn, req).unwrap();

        assert_eq!(dto.name, "No Vibes");
        assert!(dto.vibe_refs.is_empty());
    }

    #[test]
    fn test_update_partial_name_only() {
        let conn = setup_test_db();
        let v1 = create_test_vibe(&conn);

        let create_req = CreateStylePresetRequest {
            name: "Original".to_string(),
            artist_tags: vec![ArtistTag { name: "artist_x".to_string(), strength: 0.0 }],
            vibe_refs: vec![PresetVibeRef { vibe_id: v1.id.clone(), strength: 0.7 }],
            model: "nai-diffusion-4-5-full".to_string(),
        };
        let dto = create_style_preset(&conn, create_req).unwrap();

        // Update name only
        let update_req = UpdateStylePresetRequest {
            id: dto.id.clone(),
            name: Some("Renamed".to_string()),
            artist_tags: None,
            vibe_refs: None,
        };
        update_style_preset(&conn, update_req).unwrap();

        let all = list_style_presets(&conn).unwrap();
        assert_eq!(all.len(), 1);
        assert_eq!(all[0].name, "Renamed");
        assert_eq!(all[0].artist_tags[0].name, "artist_x");
        assert_eq!(all[0].vibe_refs.len(), 1);
        assert_eq!(all[0].vibe_refs[0].vibe_id, v1.id);
    }

    #[test]
    fn test_update_partial_vibe_refs_only() {
        let conn = setup_test_db();
        let v1 = create_test_vibe(&conn);
        let v2 = create_test_vibe(&conn);

        let create_req = CreateStylePresetRequest {
            name: "Preset".to_string(),
            artist_tags: vec![ArtistTag { name: "artist_y".to_string(), strength: 0.0 }],
            vibe_refs: vec![PresetVibeRef { vibe_id: v1.id.clone(), strength: 0.7 }],
            model: "nai-diffusion-4-5-full".to_string(),
        };
        let dto = create_style_preset(&conn, create_req).unwrap();

        // Update vibe_refs only
        let update_req = UpdateStylePresetRequest {
            id: dto.id.clone(),
            name: None,
            artist_tags: None,
            vibe_refs: Some(vec![PresetVibeRef { vibe_id: v2.id.clone(), strength: 0.5 }]),
        };
        update_style_preset(&conn, update_req).unwrap();

        let all = list_style_presets(&conn).unwrap();
        assert_eq!(all[0].name, "Preset");
        assert_eq!(all[0].vibe_refs.len(), 1);
        assert_eq!(all[0].vibe_refs[0].vibe_id, v2.id);
    }

    #[test]
    fn test_delete() {
        let conn = setup_test_db();

        let req = CreateStylePresetRequest {
            name: "To Delete".to_string(),
            artist_tags: vec![],
            vibe_refs: vec![],
            model: "nai-diffusion-4-5-full".to_string(),
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
            vibe_refs: None,
        };
        let err = update_style_preset(&conn, req).unwrap_err();
        assert!(matches!(err, AppError::NotFound(_)));
    }
}
