use novelai_api::constants::MAX_TOKENS;
use novelai_api::tokenizer::get_t5_tokenizer;

use crate::error::AppError;
use crate::models::dto::{CountTokensRequest, CountTokensResponse};

pub async fn count_tokens(req: CountTokensRequest) -> Result<CountTokensResponse, AppError> {
    let tokenizer = get_t5_tokenizer(false)
        .await
        .map_err(|e| AppError::ApiClient(e.to_string()))?;

    let counts: Vec<usize> = req
        .texts
        .iter()
        .map(|t| if t.is_empty() { 0 } else { tokenizer.count_tokens(t) })
        .collect();

    Ok(CountTokensResponse {
        counts,
        max_tokens: MAX_TOKENS,
    })
}

pub fn max_tokens() -> usize {
    MAX_TOKENS
}
