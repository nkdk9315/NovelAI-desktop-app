use novelai_api::client::NovelAIClient;
use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::{
    CostEstimateRequest, CostResultDto, GenerateImageRequest, GenerateImageResponse,
};

pub async fn generate_image(
    db: &std::sync::Mutex<Connection>,
    api_client: &tokio::sync::Mutex<Option<NovelAIClient>>,
    req: GenerateImageRequest,
) -> Result<GenerateImageResponse, AppError> {
    use base64::Engine;
    use novelai_api::schemas::{
        CharacterConfig, GenerateAction, GenerateParams, ImageInput, SaveTarget, VibeConfig,
        VibeItem,
    };
    use std::path::PathBuf;

    // Get project directory
    let project_dir = {
        let conn = db.lock().map_err(|e| AppError::Database(e.to_string()))?;
        let project = crate::repositories::project::find_by_id(&conn, &req.project_id)?;
        project.directory_path
    };

    // Parse enums from strings
    let model: novelai_api::constants::Model = req
        .model
        .parse()
        .map_err(|_| AppError::Validation(format!("invalid model: {}", req.model)))?;
    let sampler: novelai_api::constants::Sampler = req
        .sampler
        .parse()
        .map_err(|_| AppError::Validation(format!("invalid sampler: {}", req.sampler)))?;
    let noise_schedule: novelai_api::constants::NoiseSchedule = req
        .noise_schedule
        .parse()
        .map_err(|_| {
            AppError::Validation(format!("invalid noise_schedule: {}", req.noise_schedule))
        })?;

    // Map action
    let action = match req.action {
        crate::models::dto::GenerateActionRequest::Generate => GenerateAction::Generate,
        crate::models::dto::GenerateActionRequest::Img2Img {
            source_image_base64,
            strength,
            noise,
        } => GenerateAction::Img2Img {
            source_image: ImageInput::Base64(source_image_base64),
            strength,
            noise,
        },
        crate::models::dto::GenerateActionRequest::Infill {
            source_image_base64,
            mask_base64,
            mask_strength,
            color_correct,
        } => GenerateAction::Infill {
            source_image: ImageInput::Base64(source_image_base64),
            mask: ImageInput::Base64(mask_base64),
            mask_strength,
            color_correct,
            hybrid_strength: None,
            hybrid_noise: None,
        },
    };

    // Build params
    let mut builder = GenerateParams::builder(&req.prompt)
        .model(model)
        .width(req.width)
        .height(req.height)
        .steps(req.steps)
        .scale(req.scale)
        .cfg_rescale(req.cfg_rescale)
        .sampler(sampler)
        .noise_schedule(noise_schedule)
        .action(action);

    if let Some(seed) = req.seed {
        builder = builder.seed(seed);
    }
    if let Some(neg) = req.negative_prompt {
        builder = builder.negative_prompt(neg);
    }
    if let Some(chars) = req.characters {
        let configs: Vec<CharacterConfig> = chars
            .into_iter()
            .map(|c| CharacterConfig {
                prompt: c.prompt,
                center_x: c.center_x,
                center_y: c.center_y,
                negative_prompt: c.negative_prompt,
            })
            .collect();
        builder = builder.characters(configs);
    }
    if let Some(vibes) = req.vibes {
        // Resolve vibe file paths from DB
        let conn = db.lock().map_err(|e| AppError::Database(e.to_string()))?;
        let configs: Vec<VibeConfig> = vibes
            .into_iter()
            .map(|v| {
                let vibe_row = crate::repositories::vibe::find_by_id(&conn, &v.vibe_id)?;
                Ok(VibeConfig {
                    item: VibeItem::FilePath(PathBuf::from(vibe_row.file_path)),
                    strength: v.strength,
                    info_extracted: v.info_extracted,
                })
            })
            .collect::<Result<Vec<_>, AppError>>()?;
        builder = builder.vibes(configs);
    }

    // Set save target to None — we'll save manually for more control
    let params = builder.build().map_err(|e| AppError::ApiClient(e.to_string()))?;

    // Generate using the API client
    let result = {
        let client_guard = api_client.lock().await;
        let client = client_guard
            .as_ref()
            .ok_or_else(|| AppError::NotInitialized("API client not initialized".to_string()))?;
        client
            .generate(&params)
            .await
            .map_err(|e| AppError::ApiClient(e.to_string()))?
    };

    // Save file
    let image_id = uuid::Uuid::new_v4().to_string();
    let relative_path = format!("images/{}.png", image_id);
    let full_path = std::path::Path::new(&project_dir).join(&relative_path);
    std::fs::write(&full_path, &result.image_data)?;

    // Base64 encode for frontend
    let base64_image =
        base64::engine::general_purpose::STANDARD.encode(&result.image_data);

    // Build prompt snapshot
    let prompt_snapshot = serde_json::json!({
        "prompt": req.prompt,
        "width": req.width,
        "height": req.height,
        "steps": req.steps,
        "scale": req.scale,
        "cfg_rescale": req.cfg_rescale,
        "sampler": req.sampler,
        "noise_schedule": req.noise_schedule,
        "model": req.model,
        "seed": result.seed,
    });

    // Insert DB record
    let now = chrono::Utc::now().to_rfc3339();
    let row = crate::models::dto::GeneratedImageRow {
        id: image_id.clone(),
        project_id: req.project_id,
        file_path: relative_path.clone(),
        seed: result.seed as i64,
        prompt_snapshot: prompt_snapshot.to_string(),
        width: req.width as i32,
        height: req.height as i32,
        model: req.model,
        is_saved: 0,
        created_at: now,
    };
    {
        let conn = db.lock().map_err(|e| AppError::Database(e.to_string()))?;
        crate::repositories::image::insert(&conn, &row)?;
    }

    Ok(GenerateImageResponse {
        id: image_id,
        base64_image,
        seed: result.seed as i64,
        file_path: relative_path,
        anlas_remaining: result.anlas_remaining,
        anlas_consumed: result.anlas_consumed,
    })
}

pub fn estimate_cost(req: CostEstimateRequest) -> Result<CostResultDto, AppError> {
    use novelai_api::anlas::{GenerationCostParams, GenerationMode, SmeaMode};

    let params = GenerationCostParams {
        width: req.width,
        height: req.height,
        steps: req.steps,
        smea: SmeaMode::Off,
        mode: GenerationMode::Txt2Img,
        strength: 1.0,
        n_samples: 1,
        char_ref_count: if req.has_character_reference { 1 } else { 0 },
        tier: req.tier,
        vibe_count: req.vibe_count,
        vibe_unencoded_count: 0,
        mask_width: None,
        mask_height: None,
    };
    let result = novelai_api::anlas::calculate_generation_cost(&params)
        .map_err(|e| AppError::Validation(e.to_string()))?;
    Ok(CostResultDto {
        total_cost: result.total_cost,
        is_opus_free: result.is_opus_free,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_req(
        width: u32,
        height: u32,
        steps: u32,
        vibe_count: u64,
        has_character_reference: bool,
        tier: u32,
    ) -> CostEstimateRequest {
        CostEstimateRequest {
            width,
            height,
            steps,
            vibe_count,
            has_character_reference,
            tier,
        }
    }

    #[test]
    fn test_txt2img_basic() {
        let result = estimate_cost(make_req(832, 1216, 23, 0, false, 0)).unwrap();
        assert_eq!(result.total_cost, 17);
        assert!(!result.is_opus_free);
    }

    #[test]
    fn test_opus_free() {
        let result = estimate_cost(make_req(1024, 1024, 28, 0, false, 3)).unwrap();
        assert_eq!(result.total_cost, 0);
        assert!(result.is_opus_free);
    }

    #[test]
    fn test_with_vibes() {
        let result = estimate_cost(make_req(832, 1216, 23, 5, false, 0)).unwrap();
        // 17 (base) + max(0, 5-4)*2 = 19
        assert_eq!(result.total_cost, 19);
        assert!(!result.is_opus_free);
    }

    #[test]
    fn test_with_char_ref() {
        let result = estimate_cost(make_req(832, 1216, 23, 0, true, 0)).unwrap();
        // 17 (base) + 5*1*1 = 22
        assert_eq!(result.total_cost, 22);
        assert!(!result.is_opus_free);
    }
}
