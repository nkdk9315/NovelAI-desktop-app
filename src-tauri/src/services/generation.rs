use std::sync::Mutex;

use novelai_api::client::NovelAIClient;
use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::{CostEstimateRequest, CostResultDto, GenerateImageRequest, GenerateImageResponse};

pub async fn generate_image(
    _db: &Mutex<Connection>,
    _api_client: &Mutex<Option<NovelAIClient>>,
    _req: GenerateImageRequest,
) -> Result<GenerateImageResponse, AppError> {
    todo!()
}

pub fn estimate_cost(_req: CostEstimateRequest) -> Result<CostResultDto, AppError> {
    todo!()
}
