// Minimal client for OpenAI-compatible `chat/completions` endpoints.
//
// One request, one answer: no streaming, no history. Hosted services, API
// aggregators and local servers (Ollama, LM Studio, ...) all speak this
// shape, so a provider is just base URL + key + model.

use std::time::Duration;

use serde_json::{json, Value};

use crate::error::AppError;
use crate::models::ai::AiProviderRow;

const TIMEOUT: Duration = Duration::from_secs(180);
const ERROR_BODY_CHARS: usize = 300;

fn net_err(e: reqwest::Error) -> AppError {
    // `without_url` keeps a key passed as a query parameter out of the message.
    AppError::ApiClient(format!("AI request failed: {}", e.without_url()))
}

pub fn request_body(provider: &AiProviderRow, system: &str, user: &str) -> Value {
    let mut body = json!({
        "model": provider.model,
        "messages": [
            { "role": "system", "content": system },
            { "role": "user", "content": user },
        ],
        "stream": false,
    });
    if provider.json_mode {
        body["response_format"] = json!({ "type": "json_object" });
    }
    body
}

/// Text of the first choice. Content is usually a string; some servers return
/// a list of `{type: "text", text}` parts instead.
pub fn extract_content(response: &Value) -> Option<String> {
    let content = response.get("choices")?.get(0)?.get("message")?.get("content")?;
    let text = match content {
        Value::String(s) => s.clone(),
        Value::Array(parts) => parts
            .iter()
            .filter_map(|p| p.get("text").and_then(Value::as_str))
            .collect::<Vec<_>>()
            .join(""),
        _ => return None,
    };
    if text.trim().is_empty() {
        None
    } else {
        Some(text)
    }
}

pub async fn chat(provider: &AiProviderRow, system: &str, user: &str) -> Result<String, AppError> {
    let client = reqwest::Client::builder()
        .timeout(TIMEOUT)
        .build()
        .map_err(net_err)?;
    let url = format!("{}/chat/completions", provider.base_url);
    let mut req = client.post(&url).json(&request_body(provider, system, user));
    if !provider.api_key.is_empty() {
        req = req.bearer_auth(&provider.api_key);
    }
    let resp = req.send().await.map_err(net_err)?;
    let status = resp.status();
    let text = resp.text().await.map_err(net_err)?;
    if !status.is_success() {
        let snippet: String = text.chars().take(ERROR_BODY_CHARS).collect();
        return Err(AppError::ApiClient(format!("AI provider returned {status}: {snippet}")));
    }
    let value: Value = serde_json::from_str(&text)
        .map_err(|_| AppError::ApiClient("AI provider returned a non-JSON response".to_string()))?;
    extract_content(&value)
        .ok_or_else(|| AppError::ApiClient("AI provider returned an empty answer".to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn provider(json_mode: bool) -> AiProviderRow {
        AiProviderRow {
            id: "p".to_string(),
            name: "p".to_string(),
            base_url: "http://localhost:1234/v1".to_string(),
            api_key: String::new(),
            model: "m".to_string(),
            json_mode,
            sort_order: 0,
            created_at: String::new(),
            updated_at: String::new(),
        }
    }

    #[test]
    fn test_request_body_json_mode() {
        let on = request_body(&provider(true), "s", "u");
        assert_eq!(on["response_format"]["type"], "json_object");
        assert_eq!(on["messages"][1]["content"], "u");
        let off = request_body(&provider(false), "s", "u");
        assert!(off.get("response_format").is_none());
    }

    #[test]
    fn test_extract_content_string_and_parts() {
        let s = json!({ "choices": [{ "message": { "content": "hello" } }] });
        assert_eq!(extract_content(&s).as_deref(), Some("hello"));
        let parts = json!({ "choices": [{ "message": { "content": [
            { "type": "text", "text": "a" }, { "type": "text", "text": "b" }
        ] } }] });
        assert_eq!(extract_content(&parts).as_deref(), Some("ab"));
        let empty = json!({ "choices": [{ "message": { "content": "  " } }] });
        assert_eq!(extract_content(&empty), None);
        assert_eq!(extract_content(&json!({ "error": "x" })), None);
    }
}
