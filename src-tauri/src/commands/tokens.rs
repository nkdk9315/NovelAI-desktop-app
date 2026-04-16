use crate::models::dto::{CountTokensRequest, CountTokensResponse};

#[tauri::command]
pub async fn count_tokens(req: CountTokensRequest) -> Result<CountTokensResponse, String> {
    crate::services::tokens::count_tokens(req)
        .await
        .map_err(|e| e.into())
}

#[tauri::command]
pub fn get_max_prompt_tokens() -> usize {
    crate::services::tokens::max_tokens()
}
