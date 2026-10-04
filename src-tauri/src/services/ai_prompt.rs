// AI プロンプト作成: 依頼文の組み立てと 1 回きりの生成。
//
// 会話はしない。フォームの内容から依頼文を 1 つ作り、JSON を 1 つ受け取る。
// 同じ依頼文を「コピペモード」（API を使わずウェブの AI に貼る）でも使う。

use crate::error::AppError;
use crate::models::ai::{
    AiPromptDetail, AiPromptOptions, AiPromptRequestDto, AiPromptStyle, AiProviderRow,
};

pub const MAX_ITEMS: u32 = 40;

const FORMAT: &str = r#"{"name":"<short title for the whole set>","items":[{"name":"<short label>","tags":"<comma-separated tags>","text":"<English prose>"}]}"#;

fn validate(opts: &AiPromptOptions) -> Result<(), AppError> {
    if opts.theme.trim().is_empty() {
        return Err(AppError::Validation("theme is required".to_string()));
    }
    if opts.count < 1 || opts.count > MAX_ITEMS {
        return Err(AppError::Validation(format!("count must be 1..={MAX_ITEMS}")));
    }
    Ok(())
}

fn style_rule(style: AiPromptStyle, detail: AiPromptDetail) -> String {
    let (tags, sentences) = match detail {
        AiPromptDetail::Short => ("5-8", "1 sentence"),
        AiPromptDetail::Standard => ("10-15", "2 sentences"),
        AiPromptDetail::Detailed => ("18-25", "3-4 sentences"),
    };
    let tag_rule = format!(
        "\"tags\": {tags} Danbooru-style tags, lowercase English, comma-separated, most important first. Use only real, commonly used Danbooru tags."
    );
    match style {
        AiPromptStyle::Tags => format!("- {tag_rule} Leave \"text\" as \"\"."),
        AiPromptStyle::Natural => format!(
            "- \"text\": a plain English description of the image, {sentences}. Leave \"tags\" as \"\"."
        ),
        AiPromptStyle::Hybrid => format!(
            "- {tag_rule}\n- \"text\": {sentences} of plain English for what tags cannot express (who does what to whom, spatial relations, mood). Do not repeat the tags."
        ),
    }
}

/// System + user message for one request. Pure; also used by copy-paste mode.
pub fn build_request(opts: &AiPromptOptions) -> Result<AiPromptRequestDto, AppError> {
    validate(opts)?;
    let mut rules = vec![
        format!("- Produce exactly {} items, each clearly different from the others.", opts.count),
        "- \"name\" values: short labels in the language of the request.".to_string(),
        style_rule(opts.style, opts.detail),
        "- Describe the scene: location, time of day, weather, props, composition and camera, pose, expression, action.".to_string(),
    ];
    rules.push(if opts.include_outfit {
        "- Describe clothing that fits each item.".to_string()
    } else {
        "- Do not describe clothing; outfits are defined elsewhere.".to_string()
    });
    rules.push(if opts.include_appearance {
        "- Decide each character's appearance (hair color, hairstyle, eye color, build) and describe it.".to_string()
    } else {
        "- Do not describe hair, eyes, body type or character names; characters are defined elsewhere.".to_string()
    });
    rules.push(
        "- Never include art style, artist names, quality or medium words (masterpiece, best quality, highres, ...), and no negative prompts.".to_string(),
    );
    rules.push(if opts.adult {
        "- Adult content is allowed when the request asks for it; describe it plainly.".to_string()
    } else {
        "- Keep everything suitable for all ages.".to_string()
    });

    let system = format!(
        "You write prompts for an anime image generation model (NovelAI Diffusion). \
Return ONLY one JSON object: no markdown, no commentary.\n\nFormat:\n{FORMAT}\n\nRules:\n{}",
        rules.join("\n")
    );

    let mut user = format!("Request: {}", opts.theme.trim());
    let characters = opts.characters.trim();
    if !characters.is_empty() {
        user.push_str(&format!("\nCharacters: {characters}"));
    }
    user.push_str(&format!("\nItems: {}", opts.count));
    Ok(AiPromptRequestDto { system, user })
}

/// Send the request to the provider and return the raw answer text.
pub async fn request_raw(
    provider: &AiProviderRow,
    opts: &AiPromptOptions,
) -> Result<String, AppError> {
    let req = build_request(opts)?;
    crate::services::ai_client::chat(provider, &req.system, &req.user).await
}

#[cfg(test)]
mod tests {
    use super::*;

    fn opts() -> AiPromptOptions {
        AiPromptOptions {
            theme: " 放課後デート ".to_string(),
            characters: String::new(),
            count: 10,
            style: AiPromptStyle::Tags,
            detail: AiPromptDetail::Standard,
            adult: false,
            include_appearance: false,
            include_outfit: true,
        }
    }

    #[test]
    fn test_build_request_basics() {
        let req = build_request(&opts()).unwrap();
        assert!(req.system.contains("exactly 10 items"));
        assert!(req.system.contains("Leave \"text\" as \"\""));
        assert!(req.system.contains("Do not describe hair"));
        assert!(req.system.contains("suitable for all ages"));
        assert_eq!(req.user, "Request: 放課後デート\nItems: 10");
    }

    #[test]
    fn test_build_request_options() {
        let mut o = opts();
        o.style = AiPromptStyle::Hybrid;
        o.include_appearance = true;
        o.include_outfit = false;
        o.adult = true;
        o.characters = "女の子 2 人".to_string();
        let req = build_request(&o).unwrap();
        assert!(req.system.contains("Do not repeat the tags"));
        assert!(req.system.contains("Decide each character's appearance"));
        assert!(req.system.contains("Do not describe clothing"));
        assert!(req.system.contains("Adult content is allowed"));
        assert!(req.user.contains("Characters: 女の子 2 人"));

        o.style = AiPromptStyle::Natural;
        let req = build_request(&o).unwrap();
        assert!(req.system.contains("Leave \"tags\" as \"\""));
    }

    #[test]
    fn test_build_request_validation() {
        let mut o = opts();
        o.theme = "  ".to_string();
        assert!(matches!(build_request(&o), Err(AppError::Validation(_))));
        let mut o = opts();
        o.count = 0;
        assert!(matches!(build_request(&o), Err(AppError::Validation(_))));
        o.count = MAX_ITEMS + 1;
        assert!(matches!(build_request(&o), Err(AppError::Validation(_))));
    }
}
