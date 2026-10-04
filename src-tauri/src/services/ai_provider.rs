use rusqlite::Connection;

use crate::error::AppError;
use crate::models::ai::{AiProviderDto, AiProviderRow, SaveAiProviderRequest};
use crate::repositories::ai_provider as repo;

pub fn list_providers(conn: &Connection) -> Result<Vec<AiProviderDto>, AppError> {
    Ok(repo::list_all(conn)?.into_iter().map(Into::into).collect())
}

/// Trim and validate the endpoint. Accepts either the API root
/// (`.../v1`) or the full `.../chat/completions` URL.
fn normalize_base_url(raw: &str) -> Result<String, AppError> {
    let url = raw.trim().trim_end_matches('/');
    let url = url.strip_suffix("/chat/completions").unwrap_or(url);
    if !(url.starts_with("https://") || url.starts_with("http://")) {
        return Err(AppError::Validation(
            "base URL must start with http:// or https://".to_string(),
        ));
    }
    Ok(url.to_string())
}

pub fn save_provider(
    conn: &Connection,
    req: SaveAiProviderRequest,
) -> Result<AiProviderDto, AppError> {
    let name = req.name.trim().to_string();
    let model = req.model.trim().to_string();
    if name.is_empty() {
        return Err(AppError::Validation("provider name is required".to_string()));
    }
    if model.is_empty() {
        return Err(AppError::Validation("model is required".to_string()));
    }
    let base_url = normalize_base_url(&req.base_url)?;
    let api_key = req.api_key.map(|k| k.trim().to_string());
    let now = chrono::Utc::now().to_rfc3339();

    let row = match req.id {
        Some(id) => {
            let mut row = repo::find_by_id(conn, &id)?;
            row.name = name;
            row.base_url = base_url;
            row.model = model;
            row.json_mode = req.json_mode;
            if let Some(key) = api_key {
                row.api_key = key;
            }
            row.updated_at = now;
            repo::update(conn, &row)?;
            row
        }
        None => {
            let row = AiProviderRow {
                id: uuid::Uuid::new_v4().to_string(),
                name,
                base_url,
                api_key: api_key.unwrap_or_default(),
                model,
                json_mode: req.json_mode,
                sort_order: repo::next_sort_order(conn)?,
                created_at: now.clone(),
                updated_at: now,
            };
            repo::insert(conn, &row)?;
            row
        }
    };
    Ok(row.into())
}

pub fn delete_provider(conn: &Connection, id: &str) -> Result<(), AppError> {
    repo::delete(conn, id)
}

pub fn get_provider_row(conn: &Connection, id: &str) -> Result<AiProviderRow, AppError> {
    repo::find_by_id(conn, id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::setup_test_db;

    fn req(id: Option<String>, api_key: Option<&str>) -> SaveAiProviderRequest {
        SaveAiProviderRequest {
            id,
            name: " Local ".to_string(),
            base_url: "http://localhost:11434/v1/chat/completions/".to_string(),
            model: "m".to_string(),
            json_mode: true,
            api_key: api_key.map(str::to_string),
        }
    }

    #[test]
    fn test_create_normalizes_and_hides_key() {
        let conn = setup_test_db();
        let dto = save_provider(&conn, req(None, Some("k"))).unwrap();
        assert_eq!(dto.name, "Local");
        assert_eq!(dto.base_url, "http://localhost:11434/v1");
        assert!(dto.has_api_key);
        assert_eq!(get_provider_row(&conn, &dto.id).unwrap().api_key, "k");
    }

    #[test]
    fn test_update_keeps_key_unless_given() {
        let conn = setup_test_db();
        let dto = save_provider(&conn, req(None, Some("k"))).unwrap();
        save_provider(&conn, req(Some(dto.id.clone()), None)).unwrap();
        assert_eq!(get_provider_row(&conn, &dto.id).unwrap().api_key, "k");
        let cleared = save_provider(&conn, req(Some(dto.id.clone()), Some(""))).unwrap();
        assert!(!cleared.has_api_key);
    }

    #[test]
    fn test_rejects_bad_url_and_empty_model() {
        let conn = setup_test_db();
        let mut bad = req(None, None);
        bad.base_url = "ftp://example.com".to_string();
        assert!(matches!(save_provider(&conn, bad), Err(AppError::Validation(_))));
        let mut bad = req(None, None);
        bad.model = "  ".to_string();
        assert!(matches!(save_provider(&conn, bad), Err(AppError::Validation(_))));
    }
}
