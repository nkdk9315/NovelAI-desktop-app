use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::GeneratedImageDto;

pub fn save_image(_conn: &Connection, _image_id: &str) -> Result<(), AppError> {
    todo!()
}

pub fn save_all_images(_conn: &Connection, _project_id: &str) -> Result<(), AppError> {
    todo!()
}

pub fn delete_image(_conn: &Connection, _image_id: &str) -> Result<(), AppError> {
    todo!()
}

pub fn get_project_images(
    _conn: &Connection,
    _project_id: &str,
    _saved_only: Option<bool>,
) -> Result<Vec<GeneratedImageDto>, AppError> {
    todo!()
}

pub fn cleanup_unsaved_images(_conn: &Connection, _project_id: &str) -> Result<(), AppError> {
    todo!()
}
