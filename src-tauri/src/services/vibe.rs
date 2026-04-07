use std::path::Path;

use novelai_api::client::NovelAIClient;
use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::{AddVibeRequest, EncodeVibeRequest, VibeDto};

pub fn list_vibes(conn: &Connection) -> Result<Vec<VibeDto>, AppError> {
    let rows = crate::repositories::vibe::list_all(conn)?;
    Ok(rows.into_iter().map(VibeDto::from).collect())
}

pub fn add_vibe(
    _conn: &Connection,
    _app_data_dir: &Path,
    _req: AddVibeRequest,
) -> Result<VibeDto, AppError> {
    todo!()
}

pub fn delete_vibe(_conn: &Connection, _id: &str) -> Result<(), AppError> {
    todo!()
}

pub async fn encode_vibe(
    _db: &std::sync::Mutex<Connection>,
    _api_client: &tokio::sync::Mutex<Option<NovelAIClient>>,
    _app_data_dir: &Path,
    _req: EncodeVibeRequest,
) -> Result<VibeDto, AppError> {
    todo!()
}
