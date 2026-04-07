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
    api_key: &str,
) -> Result<(), AppError> {
    let mut client = NovelAIClient::new(Some(api_key), None)?;
    client.set_track_balance(false);
    {
        let mut guard = api_client.lock().map_err(|e| {
            AppError::NotInitialized(format!("Failed to acquire lock: {}", e))
        })?;
        *guard = Some(client);
    }
    crate::repositories::settings::set(conn, "api_key", api_key)?;
    Ok(())
}

pub async fn get_anlas_balance(
    api_client: &Mutex<Option<NovelAIClient>>,
) -> Result<AnlasBalanceDto, AppError> {
    // Take client out of Mutex to avoid holding guard across .await
    let client = {
        let mut guard = api_client.lock().map_err(|e| {
            AppError::NotInitialized(format!("Failed to acquire lock: {}", e))
        })?;
        guard.take().ok_or_else(|| {
            AppError::NotInitialized("API client not initialized".to_string())
        })?
    };
    let balance = client.get_anlas_balance().await;
    // Put client back regardless of result
    {
        let mut guard = api_client.lock().map_err(|e| {
            AppError::NotInitialized(format!("Failed to acquire lock: {}", e))
        })?;
        *guard = Some(client);
    }
    let balance = balance?;
    Ok(AnlasBalanceDto {
        anlas: balance.total,
        tier: balance.tier,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::setup_test_db;

    #[test]
    fn test_get_all_settings() {
        let conn = setup_test_db();
        crate::repositories::settings::set(&conn, "theme", "dark").unwrap();
        let all = get_all_settings(&conn).unwrap();
        assert!(all.contains_key("theme"));
    }

    #[test]
    fn test_set_setting() {
        let conn = setup_test_db();
        set_setting(&conn, "locale", "ja").unwrap();
        let all = get_all_settings(&conn).unwrap();
        assert_eq!(all.get("locale"), Some(&"ja".to_string()));
    }
}
