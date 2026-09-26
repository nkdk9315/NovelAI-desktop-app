//! Director Tools (augment) and Upscale. Outputs are added to the project history.

use base64::Engine;
use novelai_api::client::NovelAIClient;
use novelai_api::constants::{AugmentReqType, MAX_DEFRY, MAX_PIXELS, UPSCALE_MAX_PIXELS};
use novelai_api::schemas::{AugmentParams, ImageInput, SaveTarget, UpscaleParams};
use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::{AugmentImageRequest, ImageToolResponse, UpscaleImageRequest};
use crate::services::image_output::{self, OutputMeta};

type Db = std::sync::Mutex<Connection>;
type Client = tokio::sync::Mutex<Option<NovelAIClient>>;

pub fn parse_req_type(req_type: &str) -> Result<AugmentReqType, AppError> {
    req_type
        .parse()
        .map_err(|_| AppError::Validation(format!("unknown augment tool: {req_type}")))
}

/// Validate the tool-specific options (prompt / defry) of an augment request.
pub fn validate_augment_request(req: &AugmentImageRequest) -> Result<AugmentReqType, AppError> {
    let req_type = parse_req_type(&req.req_type)?;
    if let Some(defry) = req.defry {
        if defry > MAX_DEFRY {
            return Err(AppError::Validation(format!("defry must be 0–{MAX_DEFRY}")));
        }
    }
    if req_type == AugmentReqType::Emotion
        && req.prompt.as_deref().is_none_or(|p| p.trim().is_empty())
    {
        return Err(AppError::Validation("emotion requires an emotion keyword".to_string()));
    }
    Ok(req_type)
}

fn image_dimensions(bytes: &[u8]) -> Result<(u32, u32), AppError> {
    let (w, h, _) = novelai_api::utils::image::get_image_dimensions(&ImageInput::Bytes(bytes.to_vec()))
        .map_err(|e| AppError::Validation(e.to_string()))?;
    Ok((w, h))
}

fn check_pixels(w: u32, h: u32, max: u64, what: &str) -> Result<(), AppError> {
    if (w as u64) * (h as u64) > max {
        return Err(AppError::Validation(format!(
            "image is too large for {what} ({w}x{h}, max {max} pixels)"
        )));
    }
    Ok(())
}

fn source_id(req: &crate::models::dto::ImageSourceRequest) -> Option<&str> {
    match req {
        crate::models::dto::ImageSourceRequest::History { image_id } => Some(image_id),
        crate::models::dto::ImageSourceRequest::Base64 { .. } => None,
    }
}

pub async fn augment_image(db: &Db, api_client: &Client, req: AugmentImageRequest) -> Result<ImageToolResponse, AppError> {
    let req_type = validate_augment_request(&req)?;
    let project_dir = image_output::project_dir(db, &req.project_id)?;
    let input = image_output::resolve_source(db, &req.source)?;
    let (width, height) = image_dimensions(&input)?;
    check_pixels(width, height, MAX_PIXELS, "Director Tools")?;

    let params = AugmentParams {
        req_type,
        image: ImageInput::Bytes(input),
        prompt: req.prompt.clone().filter(|p| !p.trim().is_empty()),
        defry: req.defry,
        save: SaveTarget::None,
    };
    let result = {
        let guard = api_client.lock().await;
        let client = guard
            .as_ref()
            .ok_or_else(|| AppError::NotInitialized("API client not initialized".to_string()))?;
        client.augment_image(&params).await.map_err(|e| AppError::ApiClient(e.to_string()))?
    };

    let (out_w, out_h) = image_dimensions(&result.image_data).unwrap_or((width, height));
    let snapshot = serde_json::json!({
        "action": { "type": "augment", "tool": req_type.as_str(), "prompt": req.prompt, "defry": req.defry },
        "source_image_id": source_id(&req.source),
    });
    store(db, &req.project_id, &project_dir, result.image_data, out_w, out_h, format!("augment:{}", req_type.as_str()), snapshot, result.anlas_remaining, result.anlas_consumed)
}

pub async fn upscale_image(db: &Db, api_client: &Client, req: UpscaleImageRequest) -> Result<ImageToolResponse, AppError> {
    let project_dir = image_output::project_dir(db, &req.project_id)?;
    let input = image_output::resolve_source(db, &req.source)?;
    let (width, height) = image_dimensions(&input)?;
    check_pixels(width, height, UPSCALE_MAX_PIXELS, "upscale")?;

    let params = UpscaleParams { image: ImageInput::Bytes(input), ..Default::default() };
    let result = {
        let guard = api_client.lock().await;
        let client = guard
            .as_ref()
            .ok_or_else(|| AppError::NotInitialized("API client not initialized".to_string()))?;
        client.upscale_image(&params).await.map_err(|e| AppError::ApiClient(e.to_string()))?
    };

    let snapshot = serde_json::json!({
        "action": { "type": "upscale", "scale": result.scale },
        "source_image_id": source_id(&req.source),
    });
    store(db, &req.project_id, &project_dir, result.image_data, result.output_width, result.output_height, "upscale".to_string(), snapshot, result.anlas_remaining, result.anlas_consumed)
}

#[allow(clippy::too_many_arguments)]
fn store(
    db: &Db,
    project_id: &str,
    project_dir: &str,
    bytes: Vec<u8>,
    width: u32,
    height: u32,
    model: String,
    prompt_snapshot: serde_json::Value,
    anlas_remaining: Option<u64>,
    anlas_consumed: Option<u64>,
) -> Result<ImageToolResponse, AppError> {
    let (_, ext) = image_output::detect_format(&bytes);
    let ext = if ext == "bin" { "png" } else { ext };
    let meta = OutputMeta { seed: 0, width, height, model, prompt_snapshot };
    let stored = image_output::persist_output_image(db, project_id, project_dir, &bytes, ext, meta)?;
    Ok(ImageToolResponse {
        id: stored.id,
        base64_image: base64::engine::general_purpose::STANDARD.encode(&bytes),
        file_path: stored.relative_path,
        width,
        height,
        anlas_remaining,
        anlas_consumed,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::dto::ImageSourceRequest;

    fn req(req_type: &str, prompt: Option<&str>, defry: Option<u32>) -> AugmentImageRequest {
        AugmentImageRequest {
            project_id: "p".into(),
            source: ImageSourceRequest::Base64 { data: String::new() },
            req_type: req_type.into(),
            prompt: prompt.map(Into::into),
            defry,
        }
    }

    #[test]
    fn accepts_all_official_tools() {
        for t in ["colorize", "declutter", "declutter-keep-bubbles", "sketch", "lineart", "bg-removal"] {
            assert!(validate_augment_request(&req(t, None, None)).is_ok(), "{t}");
        }
        assert!(validate_augment_request(&req("emotion", Some("happy"), Some(0))).is_ok());
    }

    #[test]
    fn rejects_unknown_tool_and_bad_options() {
        assert!(validate_augment_request(&req("pixel-snap", None, None)).is_err());
        assert!(validate_augment_request(&req("colorize", None, Some(6))).is_err());
        assert!(validate_augment_request(&req("emotion", None, None)).is_err());
        assert!(validate_augment_request(&req("emotion", Some("  "), None)).is_err());
    }

    #[test]
    fn pixel_limits() {
        assert!(check_pixels(1024, 1024, UPSCALE_MAX_PIXELS, "upscale").is_ok());
        assert!(check_pixels(1024, 1088, UPSCALE_MAX_PIXELS, "upscale").is_err());
    }
}
