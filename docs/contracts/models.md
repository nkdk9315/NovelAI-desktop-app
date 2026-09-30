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
    pub opus_usage: Option<OpusUsageDto>,  // V5 Opus 無料枠（非 Opus は None）
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpusUsageDto {  // novelai_api::anlas::summarize_opus_usage の結果
    pub remaining_percent: f64,
    pub refill_percent_per_day: f64,
    pub estimated_images_remaining: u64,
    pub is_low: bool,
    pub is_exhausted: bool,  // true の間 V5 は Opus 無料にならない
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
    /// Opaque JSON capturing the UI state that produced this request.
    /// Stored inside `prompt_snapshot` so history-item restore can
    /// rehydrate the frontend stores without an extra DB column.
    pub ui_snapshot: Option<serde_json::Value>,
    #[serde(default)]
    pub transparent_background: bool,  // V5 のみ（V4/V4.5 で true は Validation エラー）
    #[serde(default)]
    pub character_reference: Option<CharacterReferenceRequest>,  // V4.5 のみ。V5 / Vibe 併用時は Validation エラー
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CharacterReferenceRequest {
    pub image_base64: String,
    pub strength: f64,   // 0.0–1.0
    pub fidelity: f64,   // 0.0–1.0
    pub mode: String,    // "character" | "character&style" | "style"
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CharacterRequest {
    pub prompt: String,
    pub center_x: f64,
    pub center_y: f64,
    pub negative_prompt: String,
}

#[derive(Debug, Serialize, Deserialize)]
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

/// Director Tools / Upscale の入力画像。履歴画像 ID か base64（data URL 接頭辞可）
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", tag = "type")]
pub enum ImageSourceRequest {
    #[serde(rename_all = "camelCase")]
    History { image_id: String },
    #[serde(rename_all = "camelCase")]
    Base64 { data: String },   // PNG / JPEG / WebP
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AugmentImageRequest {
    pub project_id: String,
    pub source: ImageSourceRequest,
    /// colorize | declutter | declutter-keep-bubbles | emotion | sketch | lineart | bg-removal
    pub req_type: String,
    #[serde(default)]
    pub prompt: Option<String>,  // colorize: 任意プロンプト / emotion: 感情キーワード（必須、`;;` は API クライアントが付与）
    #[serde(default)]
    pub defry: Option<u32>,      // colorize / emotion: 0（変化最大）– 5（最小）
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpscaleImageRequest {
    pub project_id: String,
    pub source: ImageSourceRequest,
}

/// アプリで写植した画像を履歴に追加する要求
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveTypesetRequest {
    pub project_id: String,
    pub image_base64: String,                  // 合成済み PNG（data URL 可）
    #[serde(default)] pub source_image_id: Option<String>,  // 文字を載せた元の履歴画像
    #[serde(default)] pub layers: serde_json::Value,        // テキストボックス（スナップショットに保存、再編集用）
}

/// augment / upscale の結果（出力は履歴に追加済み）
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageToolResponse {
    pub id: String,
    pub base64_image: String,
    pub file_path: String,
    pub width: u32,
    pub height: u32,
    pub anlas_remaining: Option<u64>,
    pub anlas_consumed: Option<u64>,
}

/// フロントエンドに渡す画像バイト（キャンバスエディタ・キャラ参照など）
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageDataDto {
    pub base64: String,
    pub mime: String,   // マジックバイトから判定（image/png | image/jpeg | image/webp）
}

/// 画像に埋め込まれた NovelAI 生成メタデータ（PNG テキストチャンク / stealth alpha）
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageMetadataDto {
    pub source: Option<String>,        // 例: "NovelAI Diffusion V4.5 4BDE2A90"（モデル推定に使用）
    pub software: Option<String>,
    pub description: Option<String>,
    pub comment: serde_json::Value,    // `Comment` JSON（prompt / v4_prompt / uc / steps / vibes ...）。常にオブジェクト
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

/// 生成中の途中経過 1 枚（generate_image_stream の Channel で送る）
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerationProgressDto {
    pub step: u32,              // API の step_ix（0 始まり）
    pub image_base64: String,   // JPEG
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
    #[serde(default)]
    pub model: Option<String>,        // V5 は 1.5 倍
    #[serde(default)]
    pub opus_usage_exhausted: bool,   // V5 Opus 無料枠切れ
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CountTokensRequest {
    pub texts: Vec<String>,  // batch of prompts (main + all characters, both positive and negative)
    #[serde(default)]
    pub model: Option<String>,  // None = DEFAULT_MODEL (V4.5 full)
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CountTokensResponse {
    pub counts: Vec<usize>,   // one token count per input text (T5 for V4/V4.5, Qwen for V5; 0 for empty strings)
    pub max_tokens: usize,    // Model::max_tokens() (V4/V4.5: 512, V5 curated: 703, V5 full: 1471)
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

/// 画像メタデータ内の Vibe エンコーディングの取り込み
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportVibeEncodingRequest {
    pub name: String,
    pub model_key: String,               // v4curated | v4full | v4-5curated | v4-5full
    pub encoding: String,                // base64
    pub information_extracted: f64,      // 0..=1
    pub strength: f64,                   // 0..=1
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportedVibeDto {
    pub vibe: VibeDto,
    pub existed: bool,                   // 同一モデル + 同一エンコーディングが既にライブラリにあった
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

## Prompt Presets & Sidebar Preset Groups

マルチキャラクター対話プリセット機能（migrations 022–026）。

### Row Structs

```rust
pub struct PromptPresetRow {
    pub id: String,              // UUID
    pub name: String,
    pub folder_id: Option<i64>,  // FK → preset_folders(id), ON DELETE SET NULL
    pub sort_key: i64,           // migration 026, per-folder 並び順
    pub created_at: String,
    pub updated_at: String,
}

pub struct PresetCharacterSlotRow {
    pub id: String,                       // UUID
    pub preset_id: String,                // FK → prompt_presets(id), CASCADE
    pub slot_index: i32,                  // 0-based
    pub slot_label: String,
    pub genre_id: Option<String>,         // FK → genres(id), ON DELETE SET NULL
    pub positive_prompt: String,
    pub negative_prompt: String,
    pub role: String,                     // "target" | "source" | "none"
    pub position_x: f64,                  // migration 025, 0.0..=1.0
    pub position_y: f64,                  // migration 025, 0.0..=1.0
}

pub struct PresetFolderRow {
    pub id: i64,                          // AUTOINCREMENT
    pub title: String,
    pub parent_id: Option<i64>,           // self-ref, CASCADE
    pub sort_key: i64,
}

pub struct SidebarPresetGroupInstanceRow {
    pub id: String,                       // UUID
    pub project_id: String,               // FK → projects(id), CASCADE
    pub folder_id: i64,                   // FK → preset_folders(id), CASCADE
    pub source_character_id: String,      // front-end UUID, not FK-enforced
    pub target_character_id: String,      // front-end UUID, not FK-enforced
    pub position: i32,
    pub default_positive_strength: f64,   // migration 024
    pub default_negative_strength: f64,   // migration 024
    pub created_at: String,
    pub updated_at: String,
}
```

### IPC DTOs

```rust
#[derive(Debug, Clone, Serialize)] #[serde(rename_all = "camelCase")]
pub struct PromptPresetDto {
    pub id: String,
    pub name: String,
    pub folder_id: Option<i64>,
    pub sort_key: i32,                      // migration 026
    pub slots: Vec<PresetCharacterSlotDto>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)] #[serde(rename_all = "camelCase")]
pub struct PresetCharacterSlotDto { /* row と同形、preset_id は除外 */ }

#[derive(Debug, Clone, Serialize)] #[serde(rename_all = "camelCase")]
pub struct PresetFolderDto { /* row と同形、sortKey 含む */ }

#[derive(Debug, Clone, Serialize)] #[serde(rename_all = "camelCase")]
pub struct SidebarPresetGroupInstanceDto {
    /* row 相当 + activePresets: Vec<SidebarPresetGroupActivePresetDto> */
}

#[derive(Debug, Clone, Serialize)] #[serde(rename_all = "camelCase")]
pub struct SidebarPresetGroupActivePresetDto {
    pub preset_id: String,
    pub positive_strength: Option<f64>,   // migration 024, NULL = instance default 継承
    pub negative_strength: Option<f64>,   // migration 024
    pub activated_at: String,             // migration 025, 競合解決の last-wins キー
}
```

### Request DTOs

```rust
#[derive(Debug, Deserialize)] #[serde(rename_all = "camelCase")]
pub struct CreatePromptPresetRequest {
    pub name: String,
    #[serde(default)] pub folder_id: Option<i64>,
    pub slots: Vec<PresetSlotInput>,      // 最低 2 slot 必須
}

#[derive(Debug, Deserialize)] #[serde(rename_all = "camelCase")]
pub struct UpdatePromptPresetRequest {
    pub id: String,
    pub name: Option<String>,
    pub folder_id: Option<Option<i64>>,   // double-option: None = 無変更、Some(None) = クリア
    pub slots: Option<Vec<PresetSlotInput>>,
}

#[derive(Debug, Deserialize)] #[serde(rename_all = "camelCase")]
pub struct PresetSlotInput { /* slot_label, genre_id?, positive_prompt, negative_prompt?, role, position_x, position_y */ }

#[derive(Debug, Deserialize)] #[serde(rename_all = "camelCase")]
pub struct CreateSidebarPresetGroupInstanceRequest {
    pub project_id: String,
    pub folder_id: i64,
    pub source_character_id: String,      // source != target バリデーション
    pub target_character_id: String,
}

#[derive(Debug, Deserialize)] #[serde(rename_all = "camelCase")]
pub struct UpdateSidebarPresetGroupPairRequest { pub id: String, pub source_character_id: String, pub target_character_id: String }

#[derive(Debug, Deserialize)] #[serde(rename_all = "camelCase")]
pub struct SetSidebarPresetGroupActivePresetsRequest { pub id: String, pub preset_ids: Vec<String> }

#[derive(Debug, Deserialize)] #[serde(rename_all = "camelCase")]
pub struct ReorderSidebarPresetGroupInstancesRequest { pub project_id: String, pub ordered_ids: Vec<String> }
pub struct ReorderPromptPresetsRequest { pub folder_id: Option<i64>, pub ordered_ids: Vec<String> }

#[derive(Debug, Deserialize)] #[serde(rename_all = "camelCase")]
pub struct UpdateSidebarPresetGroupDefaultStrengthRequest {
    pub id: String,
    pub default_positive_strength: f64,   // 1.0..=10.0 バリデーション
    pub default_negative_strength: f64,
}

#[derive(Debug, Deserialize)] #[serde(rename_all = "camelCase")]
pub struct SetSidebarPresetGroupPresetStrengthRequest {
    pub instance_id: String,
    pub preset_id: String,
    pub positive_strength: Option<f64>,   // None = instance default に戻す
    pub negative_strength: Option<f64>,
}
```
