use tauri::State;

use crate::error::AppError;
use crate::models::ai::{
    AiPromptOptions, AiPromptRequestDto, AiPromptResultDto, AiPromptStyle, AiProviderDto,
    SaveAiProviderRequest,
};
use crate::state::AppState;

fn lock_db<'a>(
    state: &'a State<'_, AppState>,
) -> Result<std::sync::MutexGuard<'a, rusqlite::Connection>, AppError> {
    state
        .db
        .lock()
        .map_err(|e| AppError::Database(format!("db mutex poisoned: {e}")))
}

#[tauri::command]
pub fn list_ai_providers(state: State<'_, AppState>) -> Result<Vec<AiProviderDto>, String> {
    let conn = lock_db(&state)?;
    crate::services::ai_provider::list_providers(&conn).map_err(Into::into)
}

#[tauri::command]
pub fn save_ai_provider(
    state: State<'_, AppState>,
    req: SaveAiProviderRequest,
) -> Result<AiProviderDto, String> {
    let conn = lock_db(&state)?;
    crate::services::ai_provider::save_provider(&conn, req).map_err(Into::into)
}

#[tauri::command]
pub fn delete_ai_provider(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let conn = lock_db(&state)?;
    crate::services::ai_provider::delete_provider(&conn, &id).map_err(Into::into)
}

/// Request text for copy-paste mode (no API call).
#[tauri::command]
pub fn build_ai_prompt_request(options: AiPromptOptions) -> Result<AiPromptRequestDto, String> {
    crate::services::ai_prompt::build_request(&options).map_err(Into::into)
}

/// Parse an answer pasted by the user in copy-paste mode.
#[tauri::command]
pub fn parse_ai_prompt_response(
    state: State<'_, AppState>,
    raw: String,
    style: AiPromptStyle,
) -> Result<AiPromptResultDto, String> {
    let conn = lock_db(&state)?;
    crate::services::ai_prompt_parse::parse_response(&conn, &raw, style).map_err(Into::into)
}

#[tauri::command]
pub async fn generate_ai_prompts(
    state: State<'_, AppState>,
    provider_id: String,
    options: AiPromptOptions,
) -> Result<AiPromptResultDto, String> {
    // The DB guard is not Send: release it before awaiting the network call.
    let provider = {
        let conn = lock_db(&state)?;
        crate::services::ai_provider::get_provider_row(&conn, &provider_id)?
    };
    let raw = crate::services::ai_prompt::request_raw(&provider, &options).await?;
    let conn = lock_db(&state)?;
    crate::services::ai_prompt_parse::parse_response(&conn, &raw, options.style)
        .map_err(Into::into)
}
