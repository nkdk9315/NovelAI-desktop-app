use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::{CreateGenreRequest, GenreDto};

pub fn list_genres(conn: &Connection) -> Result<Vec<GenreDto>, AppError> {
    let rows = crate::repositories::genre::list_all(conn)?;
    Ok(rows.into_iter().map(GenreDto::from).collect())
}

pub fn create_genre(
    _conn: &Connection,
    _req: CreateGenreRequest,
) -> Result<GenreDto, AppError> {
    todo!()
}

pub fn delete_genre(_conn: &Connection, _id: &str) -> Result<(), AppError> {
    todo!()
}
