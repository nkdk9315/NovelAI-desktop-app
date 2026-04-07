use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
#[serde(tag = "kind", content = "message")]
pub enum AppError {
    #[error("not found: {0}")]
    NotFound(String),
    #[error("validation: {0}")]
    Validation(String),
    #[error("database: {0}")]
    Database(String),
    #[error("api client: {0}")]
    ApiClient(String),
    #[error("io: {0}")]
    Io(String),
    #[error("not initialized: {0}")]
    NotInitialized(String),
}

impl From<rusqlite::Error> for AppError {
    fn from(e: rusqlite::Error) -> Self {
        AppError::Database(e.to_string())
    }
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        AppError::Io(e.to_string())
    }
}

impl From<novelai_api::error::NovelAIError> for AppError {
    fn from(e: novelai_api::error::NovelAIError) -> Self {
        AppError::ApiClient(e.to_string())
    }
}

impl From<AppError> for String {
    fn from(e: AppError) -> Self {
        serde_json::to_string(&e).unwrap_or_else(|_| e.to_string())
    }
}
