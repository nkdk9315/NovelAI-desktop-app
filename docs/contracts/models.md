# Models/DTO Layer (Rust)

## 1.1 DB Row Structs

rusqlite `Row` から直接マッピングする内部型。IPC には使わない。

```rust
// --- models/row.rs ---

pub struct ProjectRow {
    pub id: String,
    pub name: String,
    pub project_type: String,
    pub directory_path: String,
    pub thumbnail_path: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

pub struct GenreRow {
    pub id: String,
    pub name: String,
    pub is_system: i32,
    pub sort_order: i32,
    pub created_at: String,
}

pub struct PromptGroupRow {
    pub id: String,
    pub name: String,
    pub genre_id: Option<String>,        // legacy, always None post-020
    pub is_default_for_genre: i32,       // legacy
    pub is_system: i32,
    pub usage_type: String,
    pub created_at: String,
    pub updated_at: String,
    pub thumbnail_path: Option<String>,  // 009
    pub is_default: i32,                 // 009
    pub category: Option<i32>,           // 009
    pub default_strength: f64,           // 011
    pub random_mode: i32,                // 016
    pub random_count: i32,               // 016
    pub random_source: String,           // 016
    pub wildcard_token: Option<String>,  // 016
}

pub struct PromptGroupTagRow {
    pub id: String,
    pub name: String,                    // 010
    pub tag: String,
    pub negative_prompt: String,         // 021
    pub sort_order: i32,
    pub default_strength: i32,           // 009
    pub thumbnail_path: Option<String>,  // 009
}

pub struct GeneratedImageRow {
    pub id: String,
    pub project_id: String,
    pub file_path: String,
    pub seed: i64,
    pub prompt_snapshot: String,
    pub width: i32,
    pub height: i32,
    pub model: String,
    pub is_saved: i32,
    pub created_at: String,
}

pub struct VibeRow {
    pub id: String,
    pub name: String,
    pub file_path: String,
    pub model: String,
    pub created_at: String,
    pub thumbnail_path: Option<String>,
    pub is_favorite: bool,
}

pub struct StylePresetRow {
    pub id: String,
    pub name: String,
    pub artist_tags: String, // JSON array
    pub created_at: String,
    pub thumbnail_path: Option<String>,
    pub is_favorite: bool,
    pub model: String,
}
```

## 1.2 IPC DTOs

Tauri IPC で送受信する型。`#[serde(rename_all = "camelCase")]` でフロントエンド向け camelCase に変換。

```rust
// --- models/dto.rs ---

use serde::{Deserialize, Serialize};

// ---- Response DTOs ----

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectDto {
    pub id: String,
    pub name: String,
    pub project_type: String,
    pub directory_path: String,
    pub thumbnail_path: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GenreDto {
    pub id: String,
    pub name: String,
    pub is_system: bool,
    pub sort_order: i32,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptGroupDto {
    pub id: String,
    pub name: String,
    pub default_genre_ids: Vec<String>,  // 020
    pub is_system: bool,
    pub usage_type: String,
    pub tags: Vec<PromptGroupTagDto>,
    pub created_at: String,
    pub updated_at: String,
    pub thumbnail_path: Option<String>,
    pub is_default: bool,
    pub category: Option<i32>,
    pub default_strength: f64,
    pub random_mode: bool,
    pub random_count: i32,
    pub random_source: String,
    pub wildcard_token: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptGroupTagDto {
    pub id: String,
    pub name: String,
    pub tag: String,
    pub negative_prompt: String,
    pub sort_order: i32,
    pub default_strength: i32,
    pub thumbnail_path: Option<String>,
}

pub struct SystemGroupGenreDefaultDto { pub genre_id: String, pub show_by_default: bool }
pub struct ListSystemGroupTagsResponse { pub tags: Vec<SystemTagDto>, pub total_count: usize }

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneratedImageDto {
    pub id: String,
    pub project_id: String,
    pub file_path: String,
    pub seed: i64,
    pub prompt_snapshot: serde_json::Value,
    pub width: i32,
    pub height: i32,
    pub model: String,
    pub is_saved: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VibeDto {
    pub id: String,
    pub name: String,
    pub file_path: String,
    pub model: String,
    pub created_at: String,
    pub thumbnail_path: Option<String>,
    pub is_favorite: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StylePresetDto {
    pub id: String,
    pub name: String,
    pub artist_tags: Vec<ArtistTag>,
    pub vibe_refs: Vec<PresetVibeRef>,
    pub created_at: String,
    pub thumbnail_path: Option<String>,
    pub is_favorite: bool,
    pub model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtistTag {
    pub name: String,
    pub strength: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PresetVibeRef {
    pub vibe_id: String,
    pub strength: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectVibeDto {
    pub vibe_id: String,
    pub vibe_name: String,
    pub thumbnail_path: Option<String>,
    pub file_path: String,
    pub model: String,
    pub is_visible: bool,
    pub added_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnlasBalanceDto {
    pub anlas: u64,
    pub tier: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CostResultDto {
    pub total_cost: u64,
    pub is_opus_free: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryDto {
    pub id: u8,
    pub name: String,
    pub count: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemTagDto {
    pub name: String,
    pub category: u8,
    pub post_count: u64,
    pub aliases: Vec<String>,
}
```

## 1.3 Request DTOs

フロントエンドからの入力を受け取る型。`Deserialize` のみ。

```rust
// ---- Request DTOs ----

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProjectRequest {
    pub name: String,
    pub project_type: String,
    pub directory_path: Option<String>, // None の場合はデフォルトパスを自動計算
    pub thumbnail_path: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProjectRequest {
    pub id: String,
    pub name: Option<String>,
    pub thumbnail_path: Option<Option<String>>, // Some(None) = クリア, Some(Some(path)) = セット, None = 変更なし
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateImageRequest {
    pub project_id: String,
    pub prompt: String,
    pub negative_prompt: Option<String>,
    pub characters: Option<Vec<CharacterRequest>>,
    pub vibes: Option<Vec<VibeReference>>,
    pub width: u32,
    pub height: u32,
    pub steps: u32,
    pub scale: f64,
    pub cfg_rescale: f64,
    pub seed: Option<u64>,
    pub sampler: String,
    pub noise_schedule: String,
    pub model: String,
    pub action: GenerateActionRequest,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CharacterRequest {
    pub prompt: String,
    pub center_x: f64,
    pub center_y: f64,
    pub negative_prompt: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VibeReference {
    pub vibe_id: String,
    pub strength: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", tag = "type")]
pub enum GenerateActionRequest {
    Generate,
    #[serde(rename_all = "camelCase")]
    Img2Img {
        source_image_base64: String,
        strength: f64,
        noise: f64,
    },
    #[serde(rename_all = "camelCase")]
    Infill {
        source_image_base64: String,
        mask_base64: String,
        mask_strength: f64,
        color_correct: bool,
    },
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateImageResponse {
    pub id: String,
    pub base64_image: String,
    pub seed: i64,
    pub file_path: String,
    pub anlas_remaining: Option<u64>,
    pub anlas_consumed: Option<u64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CostEstimateRequest {
    pub width: u32,
    pub height: u32,
    pub steps: u32,
    pub vibe_count: u64,
    pub has_character_reference: bool,
    pub tier: u32,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CountTokensRequest {
    pub texts: Vec<String>,  // batch of prompts (main + all characters, both positive and negative)
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CountTokensResponse {
    pub counts: Vec<usize>,   // one T5 token count per input text (0 for empty strings)
    pub max_tokens: usize,    // novelai-api MAX_TOKENS (= 512)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagInput { pub name: Option<String>, pub tag: String, pub negative_prompt: Option<String>, pub default_strength: Option<i32>, pub thumbnail_path: Option<String> }

pub struct CreatePromptGroupRequest {
    pub name: String,
    pub default_genre_ids: Vec<String>,
    pub tags: Vec<TagInput>,
    pub default_strength: Option<f64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePromptGroupRequest {
    pub id: String,
    pub name: Option<String>,
    pub default_genre_ids: Option<Vec<String>>,
    pub tags: Option<Vec<TagInput>>,
    pub is_default: Option<bool>,
    pub thumbnail_path: Option<Option<String>>,
    pub default_strength: Option<f64>,
    pub random_mode: Option<bool>,
    pub random_count: Option<i32>,
    pub random_source: Option<String>,
    pub wildcard_token: Option<Option<String>>,
}

pub struct SetSystemGroupGenreDefaultsRequest { pub system_group_id: String, pub entries: Vec<SystemGroupGenreDefaultDto> }

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateGenreRequest {
    pub name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddVibeRequest {
    pub file_path: String,
    pub name: String,
    pub thumbnail_path: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EncodeVibeRequest {
    pub image_path: String,
    pub model: String,
    pub name: String,
    pub information_extracted: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateVibeNameRequest {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateVibeThumbnailRequest {
    pub id: String,
    pub thumbnail_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateStylePresetRequest {
    pub name: String,
    pub artist_tags: Vec<ArtistTag>,
    pub vibe_refs: Vec<PresetVibeRef>,
    pub model: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateStylePresetRequest {
    pub id: String,
    pub name: Option<String>,
    pub artist_tags: Option<Vec<ArtistTag>>,
    pub vibe_refs: Option<Vec<PresetVibeRef>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePresetThumbnailRequest {
    pub id: String,
    pub thumbnail_path: String,
}
```

## 1.4 Row → DTO 変換

```rust
// --- models/convert.rs ---

impl From<ProjectRow> for ProjectDto {
    fn from(row: ProjectRow) -> Self { /* 1:1マッピング */ }
}

impl From<GenreRow> for GenreDto {
    fn from(row: GenreRow) -> Self {
        // is_system: row.is_system != 0
    }
}

impl PromptGroupRow {
    /// タグを外部から受け取ってDtoを構築
    pub fn into_dto(self, tags: Vec<PromptGroupTagDto>, default_genre_ids: Vec<String>) -> PromptGroupDto {
        // is_system, is_default, random_mode: != 0
    }
}

impl From<PromptGroupTagRow> for PromptGroupTagDto {
    fn from(row: PromptGroupTagRow) -> Self { /* id, name, tag, sort_order, default_strength, thumbnail_path */ }
}

impl From<GeneratedImageRow> for GeneratedImageDto {
    fn from(row: GeneratedImageRow) -> Self {
        // prompt_snapshot: serde_json::from_str(&row.prompt_snapshot)
        // is_saved: row.is_saved != 0
    }
}

impl From<VibeRow> for VibeDto {
    fn from(row: VibeRow) -> Self { /* 1:1マッピング（thumbnail_path, is_favorite含む） */ }
}

impl StylePresetRow {
    /// vibe_refsを外部から受け取ってDtoを構築
    pub fn into_dto(self, vibe_refs: Vec<PresetVibeRef>) -> StylePresetDto {
        // artist_tags: serde_json::from_str(&self.artist_tags) -> Vec<ArtistTag>
        // thumbnail_path, is_favorite, model 含む
    }
}
```

## Tag DB — DTO / Row

```rust
#[derive(Debug, Clone)]
pub struct TagRow {
    pub id: i64,
    pub name: String,
    pub csv_category: Option<i64>,
}

#[derive(Debug, Clone)]
pub struct TagGroupRow {
    pub id: i64,
    pub slug: String,
    pub title: String,
    pub parent_id: Option<i64>,
    pub kind: String,       // "group" | "leaf" | "user"
    pub source: String,     // "seed" | "user"
    pub sort_key: i64,
    pub child_count: i64,
    pub is_favorite: bool,  // migration 014
}

#[derive(Debug, Clone, Serialize)] #[serde(rename_all = "camelCase")]
pub struct TagDto { /* id, name, csvCategory */ }

#[derive(Debug, Clone, Serialize)] #[serde(rename_all = "camelCase")]
pub struct TagGroupDto { /* …TagGroupRow相当, isFavorite含む */ }

#[derive(Debug, Clone, Serialize)] #[serde(rename_all = "camelCase")]
pub struct TagWithGroupsDto {
    pub tag: TagDto,
    pub groups: Vec<TagGroupDto>,
}

#[derive(Debug, Clone, Serialize)] #[serde(rename_all = "camelCase")]
pub struct CountByIdDto { pub id: i64, pub count: i64 }
```
