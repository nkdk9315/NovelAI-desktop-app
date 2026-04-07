use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::{CreateStylePresetRequest, StylePresetDto, UpdateStylePresetRequest};

pub fn list_style_presets(conn: &Connection) -> Result<Vec<StylePresetDto>, AppError> {
    let rows = crate::repositories::style_preset::list_all(conn)?;
    let mut result = Vec::new();
    for row in rows {
        let vibe_ids = crate::repositories::style_preset::find_vibe_ids_by_preset(conn, &row.id)?;
        result.push(row.into_dto(vibe_ids));
    }
    Ok(result)
}

pub fn create_style_preset(
    _conn: &Connection,
    _req: CreateStylePresetRequest,
) -> Result<StylePresetDto, AppError> {
    todo!()
}

pub fn update_style_preset(
    _conn: &Connection,
    _req: UpdateStylePresetRequest,
) -> Result<(), AppError> {
    todo!()
}

pub fn delete_style_preset(_conn: &Connection, _id: &str) -> Result<(), AppError> {
    todo!()
}
