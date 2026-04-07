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
    conn: &Connection,
    api_client: &Mutex<Option<NovelAIClient>>,
    api_key_store: &Mutex<Option<String>>,
    api_key: &str,
) -> Result<(), AppError> {
    let mut client = NovelAIClient::new(Some(api_key), None)?;
    client.set_track_balance(false);
    {
        let mut guard = api_client.lock().unwrap();
        *guard = Some(client);
    }
    {
        let mut guard = api_key_store.lock().unwrap();
        *guard = Some(api_key.to_string());
    }
    crate::repositories::settings::set(conn, "api_key", api_key)?;
    Ok(())
}

pub async fn get_anlas_balance(
    api_key_store: &Mutex<Option<String>>,
) -> Result<AnlasBalanceDto, AppError> {
    let api_key = {
        let guard = api_key_store.lock().unwrap();
        guard.as_ref().ok_or_else(|| {
            AppError::NotInitialized("API client not initialized".to_string())
        })?.clone()
    };
    let client = NovelAIClient::new(Some(&api_key), None)?;
    let balance = client.get_anlas_balance().await?;
    Ok(AnlasBalanceDto {
        anlas: balance.total,
        tier: balance.tier,
    })
}
