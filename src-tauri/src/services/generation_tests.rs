use super::*;
use crate::models::dto::{
    CharacterReferenceRequest, CharacterRequest, GenerateActionRequest, VibeReference,
};

fn make_generate_req(char_count: usize) -> GenerateImageRequest {
    GenerateImageRequest {
        project_id: "test".to_string(),
        prompt: "test".to_string(),
        negative_prompt: None,
        characters: if char_count == 0 {
            None
        } else {
            Some(
                (0..char_count)
                    .map(|_| CharacterRequest {
                        prompt: "char".to_string(),
                        center_x: 0.5,
                        center_y: 0.5,
                        negative_prompt: String::new(),
                    })
                    .collect(),
            )
        },
        vibes: None,
        width: 832,
        height: 1216,
        steps: 28,
        scale: 5.0,
        cfg_rescale: 0.0,
        seed: None,
        sampler: "k_euler".to_string(),
        noise_schedule: "native".to_string(),
        model: "nai-diffusion-4-5-full".to_string(),
        action: GenerateActionRequest::Generate,
        ui_snapshot: None,
        transparent_background: false,
 
        character_reference: None,
    }
}

#[test]
fn test_max_characters_exceeded() {
    let req = make_generate_req(7);
    let result = validate_generate_request(&req);
    assert!(matches!(result, Err(AppError::Validation(_))));
}

#[test]
fn test_zero_characters_ok() {
    let req = make_generate_req(0);
    assert!(validate_generate_request(&req).is_ok());
}

#[test]
fn test_six_characters_ok() {
    let req = make_generate_req(6);
    assert!(validate_generate_request(&req).is_ok());
}

#[test]
fn test_v5_allows_more_characters() {
    let mut req = make_generate_req(32);
    req.model = "nai-diffusion-5-full".to_string();
    assert!(validate_generate_request(&req).is_ok());
    req.characters.as_mut().unwrap().push(CharacterRequest {
        prompt: "char".to_string(),
        center_x: 0.5,
        center_y: 0.5,
        negative_prompt: String::new(),
    });
    assert!(matches!(validate_generate_request(&req), Err(AppError::Validation(_))));
}

#[test]
fn test_v5_rejects_vibes() {
    let mut req = make_generate_req(0);
    req.model = "nai-diffusion-5-curated".to_string();
    req.vibes = Some(vec![crate::models::dto::VibeReference {
        vibe_id: "v1".to_string(),
        strength: 0.6,
    }]);
    assert!(matches!(validate_generate_request(&req), Err(AppError::Validation(_))));
}

#[test]
fn test_transparent_background_v5_only() {
    let mut req = make_generate_req(0);
    req.transparent_background = true;
    assert!(matches!(validate_generate_request(&req), Err(AppError::Validation(_))));
    req.model = "nai-diffusion-5-full".to_string();
    assert!(validate_generate_request(&req).is_ok());
}

#[test]
fn test_prompt_snapshot_includes_characters() {
    let req = make_generate_req(2);
    let input = PromptSnapshotInput::from_request(&req);
    let snapshot = input.build(42);
    let chars = snapshot.get("characters").unwrap();
    assert!(chars.is_array());
    assert_eq!(chars.as_array().unwrap().len(), 2);
    assert_eq!(chars[0]["prompt"], "char");
    assert_eq!(chars[0]["centerX"], 0.5);
    assert_eq!(chars[0]["centerY"], 0.5);
}

#[test]
fn test_prompt_snapshot_no_characters() {
    let req = make_generate_req(0);
    let input = PromptSnapshotInput::from_request(&req);
    let snapshot = input.build(42);
    assert!(snapshot.get("characters").unwrap().is_null());
}

#[test]
fn test_prompt_snapshot_preserves_ui_snapshot() {
    let mut req = make_generate_req(0);
    req.negative_prompt = Some("low quality".to_string());
    req.ui_snapshot = Some(serde_json::json!({
        "version": 1,
        "selectedVibes": [{"vibeId": "v1", "strength": 0.7, "enabled": true}],
        "sidebarPresets": [],
    }));
    let input = PromptSnapshotInput::from_request(&req);
    let snapshot = input.build(42);
    assert_eq!(snapshot["negative_prompt"], "low quality");
    assert_eq!(snapshot["ui_snapshot"]["version"], 1);
    assert_eq!(snapshot["ui_snapshot"]["selectedVibes"][0]["vibeId"], "v1");
}

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
        model: None,
        opus_usage_exhausted: false,
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

#[test]
fn test_v5_cost_multiplier() {
    let mut req = make_req(832, 1216, 23, 0, false, 0);
    req.model = Some("nai-diffusion-5-full".to_string());
    let result = estimate_cost(req).unwrap();
    // V4 base 17 (ceil of 16.x) * 1.5 -> ceil
    let v4 = estimate_cost(make_req(832, 1216, 23, 0, false, 0)).unwrap();
    assert!(result.total_cost > v4.total_cost);
    assert!(!result.is_opus_free);
}

#[test]
fn test_v5_opus_free_until_usage_exhausted() {
    let mut req = make_req(1024, 1024, 28, 0, false, 3);
    req.model = Some("nai-diffusion-5-full".to_string());
    let result = estimate_cost(req).unwrap();
    assert!(result.is_opus_free);
    assert_eq!(result.total_cost, 0);

    let mut req = make_req(1024, 1024, 28, 0, false, 3);
    req.model = Some("nai-diffusion-5-full".to_string());
    req.opus_usage_exhausted = true;
    let result = estimate_cost(req).unwrap();
    assert!(!result.is_opus_free);
    assert!(result.total_cost > 0);
}

fn char_ref(mode: &str, strength: f64) -> Option<CharacterReferenceRequest> {
    Some(CharacterReferenceRequest {
        image_base64: "AAAA".to_string(),
        strength,
        fidelity: 1.0,
        mode: mode.to_string(),
    })
}

#[test]
fn test_char_ref_valid_on_v45() {
    let mut req = make_generate_req(0);
    req.character_reference = char_ref("character&style", 1.0);
    assert!(validate_generate_request(&req).is_ok());
}

#[test]
fn test_char_ref_rejected_on_v5() {
    let mut req = make_generate_req(0);
    req.model = "nai-diffusion-5-full".to_string();
    req.character_reference = char_ref("character", 1.0);
    assert!(matches!(validate_generate_request(&req), Err(AppError::Validation(_))));
}

#[test]
fn test_char_ref_rejected_with_vibes() {
    let mut req = make_generate_req(0);
    req.character_reference = char_ref("style", 0.5);
    req.vibes = Some(vec![VibeReference { vibe_id: "v".to_string(), strength: 0.7 }]);
    assert!(matches!(validate_generate_request(&req), Err(AppError::Validation(_))));
}

#[test]
fn test_char_ref_invalid_mode_or_strength() {
    let mut req = make_generate_req(0);
    req.character_reference = char_ref("face", 1.0);
    assert!(validate_generate_request(&req).is_err());
    req.character_reference = char_ref("character", 1.5);
    assert!(validate_generate_request(&req).is_err());
}

#[test]
fn test_snapshot_records_action_without_image_data() {
    use crate::services::generation_snapshot::action_summary;
    let v = action_summary(&GenerateActionRequest::Infill {
        source_image_base64: "IMAGE".to_string(),
        mask_base64: "MASK".to_string(),
        mask_strength: 0.8,
        color_correct: true,
    });
    assert_eq!(v["type"], "infill");
    assert_eq!(v["strength"], 0.8);
    let s = v.to_string();
    assert!(!s.contains("IMAGE") && !s.contains("MASK"));
}
