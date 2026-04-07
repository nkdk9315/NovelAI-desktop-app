use std::collections::HashMap;
use std::sync::Mutex;

use novelai_api::client::NovelAIClient;
use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::AnlasBalanceDto;

pub fn get_all_settings(conn: &Connection) -> Result<HashMap<String, String>, AppError> {
    crate::repositories::settings::get_all(conn)
}

pub fn set_setting(conn: &Connection, key: &str, value: &str) -> Result<(), AppError> {
    crate::repositories::settings::set(conn, key, value)
}

pub fn initialize_client(
    _conn: &Connection,
    _api_client: &Mutex<Option<NovelAIClient>>,
    _api_key: &str,
) -> Result<(), AppError> {
    todo!()
}

pub async fn get_anlas_balance(
    _api_client: &Mutex<Option<NovelAIClient>>,
) -> Result<AnlasBalanceDto, AppError> {
    todo!()
}
