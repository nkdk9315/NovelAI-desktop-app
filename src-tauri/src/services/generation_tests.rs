use super::*;
use crate::models::dto::{CharacterRequest, GenerateActionRequest};

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
