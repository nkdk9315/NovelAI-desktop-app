// AI プロンプト作成: プロバイダー設定と、依頼・結果の DTO

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone)]
pub struct AiProviderRow {
    pub id: String,
    pub name: String,
    pub base_url: String,
    pub api_key: String,
    pub model: String,
    pub json_mode: bool,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

/// API キーそのものはフロントエンドへ返さない（有無だけを返す）
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiProviderDto {
    pub id: String,
    pub name: String,
    pub base_url: String,
    pub model: String,
    pub json_mode: bool,
    pub has_api_key: bool,
}

impl From<AiProviderRow> for AiProviderDto {
    fn from(row: AiProviderRow) -> Self {
        Self {
            has_api_key: !row.api_key.is_empty(),
            id: row.id,
            name: row.name,
            base_url: row.base_url,
            model: row.model,
            json_mode: row.json_mode,
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveAiProviderRequest {
    /// None = 新規作成
    pub id: Option<String>,
    pub name: String,
    pub base_url: String,
    pub model: String,
    pub json_mode: bool,
    /// None = 既存のキーを保持、Some("") = キーを消す
    pub api_key: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum AiPromptStyle {
    Tags,
    Natural,
    Hybrid,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum AiPromptDetail {
    Short,
    Standard,
    Detailed,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiPromptOptions {
    /// 作りたい場面・お題（ユーザーの言語のまま）
    pub theme: String,
    /// 登場人物の指定（任意。例:「女の子 2 人」）
    #[serde(default)]
    pub characters: String,
    pub count: u32,
    pub style: AiPromptStyle,
    pub detail: AiPromptDetail,
    pub adult: bool,
    /// 髪や目の色などの外見を AI に決めさせる
    pub include_appearance: bool,
    /// 衣装を AI に決めさせる
    pub include_outfit: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiPromptRequestDto {
    pub system: String,
    pub user: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AiPromptItemDto {
    pub name: String,
    pub tags: Vec<String>,
    pub text: String,
    /// タグ DB に見つからなかったタグ（`tags` には残す）
    pub unknown_tags: Vec<String>,
    /// 画風・品質・アーティストとして取り除いたタグ
    pub removed_tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiPromptResultDto {
    pub name: String,
    pub items: Vec<AiPromptItemDto>,
}
