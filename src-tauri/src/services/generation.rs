use novelai_api::client::NovelAIClient;
use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::{
    CostEstimateRequest, CostResultDto, GenerateImageRequest, GenerateImageResponse,
};
use crate::services::generation_snapshot::PromptSnapshotInput;

pub const MAX_CHARACTERS: usize = novelai_api::constants::MAX_CHARACTERS;

/// Maximum number of characters for the given model (V5: 32, V4 / V4.5: 6).
fn max_characters_for(model: &str) -> usize {
    model
        .parse::<novelai_api::constants::Model>()
        .map(|m| m.max_characters())
        .unwrap_or(MAX_CHARACTERS)
}

fn is_v5_model(model: &str) -> bool {
    model
        .parse::<novelai_api::constants::Model>()
        .is_ok_and(|m| m.is_v5())
}

pub fn validate_generate_request(req: &GenerateImageRequest) -> Result<(), AppError> {
    if let Some(ref chars) = req.characters {
        let max = max_characters_for(&req.model);
        if chars.len() > max {
            return Err(AppError::Validation(format!(
                "too many characters: {} (max {})",
                chars.len(),
                max
            )));
        }
    }
    let v5 = is_v5_model(&req.model);
    if v5 && req.vibes.as_ref().is_some_and(|v| !v.is_empty()) {
        return Err(AppError::Validation(format!(
            "Vibe Transfer is not supported by {}",
            req.model
        )));
    }
    if !v5 && req.transparent_background {
        return Err(AppError::Validation(
            "transparent background is only supported by V5 models".to_string(),
        ));
    }
    if let Some(ref cr) = req.character_reference {
        if v5 {
            return Err(AppError::Validation(format!(
                "Character Reference is not supported by {}",
                req.model
            )));
        }
        if req.vibes.as_ref().is_some_and(|v| !v.is_empty()) {
            return Err(AppError::Validation(
                "Character Reference cannot be combined with Vibe Transfer".to_string(),
            ));
        }
        parse_char_ref_mode(&cr.mode)?;
        for (name, v) in [("strength", cr.strength), ("fidelity", cr.fidelity)] {
            if !(0.0..=1.0).contains(&v) {
                return Err(AppError::Validation(format!(
                    "character reference {name} must be between 0 and 1"
                )));
            }
        }
    }
    Ok(())
}

pub fn parse_char_ref_mode(mode: &str) -> Result<novelai_api::schemas::CharRefMode, AppError> {
    use novelai_api::schemas::CharRefMode;
    match mode {
        "character" => Ok(CharRefMode::Character),
        "character&style" => Ok(CharRefMode::CharacterAndStyle),
        "style" => Ok(CharRefMode::Style),
        _ => Err(AppError::Validation(format!("invalid character reference mode: {mode}"))),
    }
}

pub async fn generate_image(
    db: &std::sync::Mutex<Connection>,
    api_client: &tokio::sync::Mutex<Option<NovelAIClient>>,
    req: GenerateImageRequest,
) -> Result<GenerateImageResponse, AppError> {
    validate_generate_request(&req)?;

    use base64::Engine;
    use novelai_api::schemas::{
        CharacterConfig, CharacterReferenceConfig, GenerateAction, GenerateParams, ImageInput,
        VibeConfig, VibeItem,
    };
    use std::path::PathBuf;

    let project_dir = crate::services::image_output::project_dir(db, &req.project_id)?;

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

    // Capture snapshot data before action matching moves fields
    let snapshot_input = PromptSnapshotInput::from_request(&req);

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
        .transparent_background(req.transparent_background)
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
    if let Some(cr) = req.character_reference {
        builder = builder.character_reference(CharacterReferenceConfig {
            image: ImageInput::Base64(cr.image_base64),
            strength: cr.strength,
            fidelity: cr.fidelity,
            mode: parse_char_ref_mode(&cr.mode)?,
        });
    }
    if let Some(vibes) = req.vibes {
        // Resolve vibe file paths and info_extracted from vibe files
        let conn = db.lock().map_err(|e| AppError::Database(e.to_string()))?;
        let expected_key = novelai_api::constants::model_key_from_str(&req.model);
        let configs: Vec<VibeConfig> = vibes
            .into_iter()
            .map(|v| {
                let vibe_row = crate::repositories::vibe::find_by_id(&conn, &v.vibe_id)?;
                // Validate model match
                if let Some(key) = expected_key {
                    if vibe_row.model != key {
                        return Err(AppError::Validation(format!(
                            "Vibe '{}' model ({}) does not match generation model ({})",
                            vibe_row.name, vibe_row.model, key
                        )));
                    }
                }
                // Read info_extracted from the vibe file (baked at encode time)
                let vibe_data =
                    novelai_api::utils::vibe::load_vibe_file(&vibe_row.file_path)
                        .map_err(|e| AppError::ApiClient(e.to_string()))?;
                let (_, info_extracted) =
                    novelai_api::utils::vibe::extract_encoding(&vibe_data, &req.model)
                        .map_err(|e| AppError::ApiClient(e.to_string()))?;
                Ok(VibeConfig {
                    item: VibeItem::FilePath(PathBuf::from(vibe_row.file_path)),
                    strength: v.strength,
                    info_extracted,
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

    let base64_image =
        base64::engine::general_purpose::STANDARD.encode(&result.image_data);
    let meta = crate::services::image_output::OutputMeta {
        seed: result.seed as i64,
        width: req.width,
        height: req.height,
        model: req.model,
        prompt_snapshot: snapshot_input.build(result.seed),
    };
    let stored = crate::services::image_output::persist_output_image(
        db,
        &req.project_id,
        &project_dir,
        &result.image_data,
        result.image_format.as_str(),
        meta,
    )?;

    Ok(GenerateImageResponse {
        id: stored.id,
        base64_image,
        seed: result.seed as i64,
        file_path: stored.relative_path,
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
        is_v5: req.model.as_deref().is_some_and(is_v5_model),
        opus_usage_exhausted: req.opus_usage_exhausted,
    };
    let result = novelai_api::anlas::calculate_generation_cost(&params)
        .map_err(|e| AppError::Validation(e.to_string()))?;
    Ok(CostResultDto {
        total_cost: result.total_cost,
        is_opus_free: result.is_opus_free,
    })
}

#[cfg(test)]
#[path = "generation_tests.rs"]
mod tests;
