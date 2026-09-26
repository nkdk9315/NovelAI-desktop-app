use novelai_api::constants::{Model, MAX_TOKENS};
use novelai_api::tokenizer::count_prompt_tokens;

use crate::error::AppError;
use crate::models::dto::{CountTokensRequest, CountTokensResponse};

/// Default model when the request does not specify one (V4.5 full, T5 tokenizer).
const DEFAULT_MODEL: &str = novelai_api::constants::DEFAULT_MODEL;

pub async fn count_tokens(req: CountTokensRequest) -> Result<CountTokensResponse, AppError> {
    let model_name = req.model.as_deref().unwrap_or(DEFAULT_MODEL);
    let model: Model = model_name
        .parse()
        .map_err(|_| AppError::Validation(format!("invalid model: {}", model_name)))?;

    // V5 uses the Qwen tokenizer, V4 / V4.5 use T5
    let mut counts = Vec::with_capacity(req.texts.len());
    for t in &req.texts {
        if t.is_empty() {
            counts.push(0);
            continue;
        }
        let n = count_prompt_tokens(t, model.as_str())
            .await
            .map_err(|e| AppError::ApiClient(e.to_string()))?;
        counts.push(n);
    }

    Ok(CountTokensResponse {
        counts,
        max_tokens: model.max_tokens(),
    })
}

pub fn max_tokens() -> usize {
    MAX_TOKENS
}
