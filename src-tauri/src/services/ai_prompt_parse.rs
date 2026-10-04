// AI プロンプト作成: 返答の取り込み。
//
// 多様なモデルを相手にするので寛容に読む: 前置きやコードフェンス、思考タグを
// 無視し、途中で切れた配列は読めた分まで採用する（再リクエストを避ける）。
// タグはタグ DB と照合し、画風・品質・アーティストはここで取り除く。

use rusqlite::Connection;
use serde_json::Value;

use crate::error::AppError;
use crate::models::ai::{AiPromptItemDto, AiPromptResultDto, AiPromptStyle};
use crate::repositories::tag_lookup;

const SNIPPET_CHARS: usize = 200;
const MAX_REPAIR_TRIES: usize = 200;
/// Danbooru CSV categories that are never scene content.
const CATEGORY_ARTIST: i64 = 1;
const CATEGORY_META: i64 = 5;

const QUALITY_TAGS: &[&str] = &[
    "masterpiece", "best_quality", "high_quality", "amazing_quality", "great_quality",
    "good_quality", "normal_quality", "low_quality", "worst_quality", "very_aesthetic",
    "aesthetic", "highres", "absurdres", "ultra-detailed", "ultra_detailed", "8k", "4k",
    "newest", "very_awa",
];

fn strip_think(raw: &str) -> String {
    let mut out = raw.to_string();
    while let (Some(start), Some(end)) = (out.find("<think>"), out.find("</think>")) {
        if end < start {
            break;
        }
        out.replace_range(start..end + "</think>".len(), "");
    }
    out
}

fn parse_first_value(s: &str) -> Option<Value> {
    serde_json::Deserializer::from_str(s).into_iter::<Value>().next()?.ok()
}

/// Cut a truncated answer back to its last complete item and close it.
fn repair_truncated(s: &str) -> Option<Value> {
    let ends: Vec<usize> = s.match_indices('}').map(|(i, _)| i).collect();
    for &end in ends.iter().rev().take(MAX_REPAIR_TRIES) {
        for suffix in ["]}", "]"] {
            let candidate = format!("{}{suffix}", &s[..=end]);
            if let Ok(v) = serde_json::from_str::<Value>(&candidate) {
                return Some(v);
            }
        }
    }
    None
}

fn extract_json(raw: &str) -> Option<Value> {
    let text = strip_think(raw);
    let start = text.find(['{', '['])?;
    let body = &text[start..];
    parse_first_value(body).or_else(|| repair_truncated(body))
}

fn str_field<'a>(obj: &'a Value, keys: &[&str]) -> &'a str {
    keys.iter()
        .find_map(|k| obj.get(*k).and_then(Value::as_str))
        .unwrap_or("")
        .trim()
}

fn raw_tags(item: &Value) -> Vec<String> {
    let parts: Vec<String> = match item.get("tags") {
        Some(Value::String(s)) => s.split(',').map(str::to_string).collect(),
        Some(Value::Array(a)) => a.iter().filter_map(Value::as_str).map(str::to_string).collect(),
        _ => Vec::new(),
    };
    parts
        .iter()
        .map(|t| t.trim().trim_matches('"').trim())
        .filter(|t| !t.is_empty())
        .map(str::to_string)
        .collect()
}

fn tag_key(tag: &str) -> String {
    tag.to_lowercase().replace(' ', "_")
}

#[derive(Default)]
struct CheckedTags {
    kept: Vec<String>,
    unknown: Vec<String>,
    removed: Vec<String>,
}

fn check_tags(conn: &Connection, tags: Vec<String>) -> Result<CheckedTags, AppError> {
    let mut out = CheckedTags::default();
    let mut seen = std::collections::HashSet::new();
    for tag in tags {
        let key = tag_key(&tag);
        if !seen.insert(key.clone()) {
            continue;
        }
        if QUALITY_TAGS.contains(&key.as_str()) || key.starts_with("artist:") {
            out.removed.push(tag);
            continue;
        }
        match tag_lookup::find_canonical(conn, &key)? {
            Some((_, Some(CATEGORY_ARTIST | CATEGORY_META))) => out.removed.push(tag),
            Some((canonical, _)) => out.kept.push(canonical),
            None => {
                out.unknown.push(tag.clone());
                out.kept.push(tag);
            }
        }
    }
    Ok(out)
}

fn parse_item(
    conn: &Connection,
    item: &Value,
    index: usize,
    style: AiPromptStyle,
) -> Result<Option<AiPromptItemDto>, AppError> {
    let mut name = str_field(item, &["name", "title"]).to_string();
    let text = match style {
        AiPromptStyle::Tags => String::new(),
        _ => str_field(item, &["text", "prompt", "description"]).to_string(),
    };
    let tags = match style {
        AiPromptStyle::Natural => Vec::new(),
        _ => raw_tags(item),
    };
    let checked = check_tags(conn, tags)?;
    if checked.kept.is_empty() && text.is_empty() {
        return Ok(None);
    }
    if name.is_empty() {
        name = format!("{}", index + 1);
    }
    Ok(Some(AiPromptItemDto {
        name,
        tags: checked.kept,
        text,
        unknown_tags: checked.unknown,
        removed_tags: checked.removed,
    }))
}

/// Turn a raw model answer (API response or pasted text) into checked items.
pub fn parse_response(
    conn: &Connection,
    raw: &str,
    style: AiPromptStyle,
) -> Result<AiPromptResultDto, AppError> {
    let no_json = || {
        let snippet: String = raw.trim().chars().take(SNIPPET_CHARS).collect();
        AppError::Validation(format!("AI answer had no usable prompts: {snippet}"))
    };
    let value = extract_json(raw).ok_or_else(no_json)?;
    let name = str_field(&value, &["name", "title"]).to_string();
    let list = match &value {
        Value::Array(a) => a.as_slice(),
        Value::Object(o) => o
            .get("items")
            .and_then(Value::as_array)
            .or_else(|| o.values().find_map(Value::as_array))
            .map(Vec::as_slice)
            .unwrap_or(&[]),
        _ => &[],
    };
    let mut items = Vec::with_capacity(list.len());
    for (i, item) in list.iter().enumerate() {
        if let Some(parsed) = parse_item(conn, item, i, style)? {
            items.push(parsed);
        }
    }
    if items.is_empty() {
        return Err(no_json());
    }
    Ok(AiPromptResultDto { name, items })
}

#[cfg(test)]
#[path = "ai_prompt_parse_tests.rs"]
mod tests;
