use std::collections::HashMap;

use tauri::State;

use crate::models::dto::AnlasBalanceDto;
use crate::state::AppState;

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> Result<HashMap<String, String>, String> {
    let conn = state.db.lock().unwrap();
    crate::services::settings::get_all_settings(&conn).map_err(|e| e.into())
}

#[tauri::command]
pub fn set_setting(state: State<'_, AppState>, key: String, value: String) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    crate::services::settings::set_setting(&conn, &key, &value).map_err(|e| e.into())
}

#[tauri::command]
pub fn initialize_client(state: State<'_, AppState>, api_key: String) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    crate::services::settings::initialize_client(
        &conn,
        &state.api_client,
        &state.api_key,
        &api_key,
    )
    .map_err(|e| e.into())
}

#[tauri::command]
pub async fn get_anlas_balance(state: State<'_, AppState>) -> Result<AnlasBalanceDto, String> {
    crate::services::settings::get_anlas_balance(&state.api_key)
        .await
        .map_err(|e| e.into())
}
