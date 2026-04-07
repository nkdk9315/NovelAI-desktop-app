use std::collections::HashMap;

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
    api_client: &tokio::sync::Mutex<Option<NovelAIClient>>,
    api_key: &str,
) -> Result<(), AppError> {
    let mut client = NovelAIClient::new(Some(api_key), None)?;
    client.set_track_balance(false);
    // Use blocking_lock since this is called from a sync context with db lock held
    {
        let mut guard = api_client.blocking_lock();
        *guard = Some(client);
    }
    crate::repositories::settings::set(conn, "api_key", api_key)?;
    Ok(())
}

pub async fn get_anlas_balance(
    api_client: &tokio::sync::Mutex<Option<NovelAIClient>>,
) -> Result<AnlasBalanceDto, AppError> {
    let guard = api_client.lock().await;
    let client = guard
        .as_ref()
        .ok_or_else(|| AppError::NotInitialized("API client not initialized".to_string()))?;
    let balance = client.get_anlas_balance().await?;
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
