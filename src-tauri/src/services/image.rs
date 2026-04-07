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

pub fn cleanup_unsaved_images(conn: &Connection, project_id: &str) -> Result<(), AppError> {
    let project = crate::repositories::project::find_by_id(conn, project_id)?;
    let paths = crate::repositories::image::delete_unsaved(conn, project_id)?;
    let base_dir = std::path::Path::new(&project.directory_path);
    for path in paths {
        let full_path = base_dir.join(&path);
        if full_path.exists() {
            let _ = std::fs::remove_file(&full_path);
        }
    }
    Ok(())
}
