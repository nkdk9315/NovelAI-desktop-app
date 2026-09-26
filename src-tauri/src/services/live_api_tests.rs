//! Live API checks through the app's service layer (V4.5 / V5).
//!
//! Ignored by default. Run with:
//!   NOVELAI_API_KEY=... cargo test --lib live_api -- --ignored --nocapture
//!
//! Generations only run for Opus accounts within the free tier
//! (512x768, 23 steps) so no Anlas are spent.

use novelai_api::client::NovelAIClient;

use crate::models::dto::{
    CostEstimateRequest, CountTokensRequest, GenerateActionRequest, GenerateImageRequest,
};

fn make_request(project_id: &str, model: &str, transparent: bool) -> GenerateImageRequest {
    GenerateImageRequest {
        project_id: project_id.to_string(),
        prompt: "1girl, solo, red apple in hand, simple background".to_string(),
        negative_prompt: None,
        characters: None,
        vibes: None,
        width: 512,
        height: 768,
        steps: 23,
        scale: 5.0,
        cfg_rescale: 0.0,
        seed: Some(12345),
        sampler: "k_euler_ancestral".to_string(),
        noise_schedule: "karras".to_string(),
        model: model.to_string(),
        action: GenerateActionRequest::Generate,
        ui_snapshot: None,
        transparent_background: transparent,
 
        character_reference: None,
    }
}

#[tokio::test]
#[ignore]
async fn live_api_v45_and_v5() {
    let api_key = std::env::var("NOVELAI_API_KEY").expect("NOVELAI_API_KEY not set");
    let client = NovelAIClient::new(Some(&api_key), None).unwrap();
    let api_client = tokio::sync::Mutex::new(Some(client));

    // Token counting (T5 for V4.5, Qwen for V5)
    for model in ["nai-diffusion-4-5-full", "nai-diffusion-5-curated", "nai-diffusion-5-full"] {
        let res = crate::services::tokens::count_tokens(CountTokensRequest {
            texts: vec!["1girl, solo, {red apple}, masterpiece".to_string(), String::new()],
            model: Some(model.to_string()),
        })
        .await
        .unwrap();
        println!("tokens[{model}]: counts={:?} max={}", res.counts, res.max_tokens);
        assert!(res.counts[0] > 0);
        assert_eq!(res.counts[1], 0);
    }

    // Balance + V5 Opus usage
    let balance = crate::services::settings::get_anlas_balance(&api_client).await.unwrap();
    println!("balance: anlas={} tier={} opus_usage={:?}", balance.anlas, balance.tier, balance.opus_usage);

    let exhausted = balance.opus_usage.as_ref().is_some_and(|u| u.is_exhausted);
    let cases = [
        ("nai-diffusion-4-5-full", false),
        ("nai-diffusion-5-curated", false),
        ("nai-diffusion-5-full", true),
    ];
    for (model, transparent) in cases {
        let cost = crate::services::generation::estimate_cost(CostEstimateRequest {
            width: 512,
            height: 768,
            steps: 23,
            vibe_count: 0,
            has_character_reference: false,
            tier: balance.tier,
            model: Some(model.to_string()),
            opus_usage_exhausted: exhausted,
        })
        .unwrap();
        if cost.total_cost > 0 {
            println!("skip {model}: would cost {} Anlas", cost.total_cost);
            continue;
        }

        let dir = tempfile::tempdir().unwrap();
        std::fs::create_dir_all(dir.path().join("images")).unwrap();
        let conn = crate::test_utils::setup_test_db();
        let mut project = crate::test_utils::create_test_project(&conn);
        project.directory_path = dir.path().to_string_lossy().to_string();
        conn.execute(
            "UPDATE projects SET directory_path = ?1 WHERE id = ?2",
            rusqlite::params![project.directory_path, project.id],
        )
        .unwrap();
        let db = std::sync::Mutex::new(conn);

        let res = crate::services::generation::generate_image(
            &db,
            &api_client,
            make_request(&project.id, model, transparent),
        )
        .await
        .unwrap_or_else(|e| panic!("{model}: {e:?}"));

        let path = dir.path().join(&res.file_path);
        let img = image::open(&path).unwrap().to_rgba8();
        let alpha0 = img.pixels().filter(|p| p[3] == 0).count() as f64 * 100.0
            / (img.width() * img.height()) as f64;
        println!(
            "generated {model}: {} {}x{} seed={} alpha0={alpha0:.1}% consumed={:?}",
            res.file_path, img.width(), img.height(), res.seed, res.anlas_consumed
        );
        assert_eq!((img.width(), img.height()), (512, 768));
        if transparent {
            assert!(alpha0 > 0.0, "{model}: expected transparent pixels");
        }
        let out = std::path::Path::new("/tmp/novelai_app_live").join(format!("{model}.png"));
        std::fs::create_dir_all(out.parent().unwrap()).unwrap();
        std::fs::copy(&path, &out).unwrap();
    }

    let after = crate::services::settings::get_anlas_balance(&api_client).await.unwrap();
    println!("balance after: anlas={} opus_usage={:?}", after.anlas, after.opus_usage);
    assert_eq!(after.anlas, balance.anlas, "Anlas should not be consumed");
}

/// Empty main prompt + an empty character prompt must be accepted by the API.
///   NOVELAI_API_KEY=... cargo test --lib live_api_empty_prompts -- --ignored --nocapture
#[tokio::test]
#[ignore]
async fn live_api_empty_prompts() {
    let api_key = std::env::var("NOVELAI_API_KEY").expect("NOVELAI_API_KEY not set");
    let client = NovelAIClient::new(Some(&api_key), None).unwrap();
    let api_client = tokio::sync::Mutex::new(Some(client));
    let balance = crate::services::settings::get_anlas_balance(&api_client).await.unwrap();

    let model = "nai-diffusion-4-5-full";
    let cost = crate::services::generation::estimate_cost(CostEstimateRequest {
        width: 512,
        height: 768,
        steps: 23,
        vibe_count: 0,
        has_character_reference: false,
        tier: balance.tier,
        model: Some(model.to_string()),
        opus_usage_exhausted: balance.opus_usage.as_ref().is_some_and(|u| u.is_exhausted),
    })
    .unwrap();
    assert_eq!(cost.total_cost, 0, "refusing to spend Anlas in a live test");

    let dir = tempfile::tempdir().unwrap();
    std::fs::create_dir_all(dir.path().join("images")).unwrap();
    let conn = crate::test_utils::setup_test_db();
    let project = crate::test_utils::create_test_project(&conn);
    conn.execute(
        "UPDATE projects SET directory_path = ?1 WHERE id = ?2",
        rusqlite::params![dir.path().to_string_lossy().to_string(), project.id],
    )
    .unwrap();
    let db = std::sync::Mutex::new(conn);

    let mut req = make_request(&project.id, model, false);
    req.prompt = String::new();
    req.characters = Some(vec![crate::models::dto::CharacterRequest {
        prompt: String::new(),
        center_x: 0.5,
        center_y: 0.5,
        negative_prompt: String::new(),
    }]);
    let res = crate::services::generation::generate_image(&db, &api_client, req)
        .await
        .unwrap_or_else(|e| panic!("empty prompts rejected: {e:?}"));
    println!("empty prompts OK: {} seed={}", res.file_path, res.seed);
}
