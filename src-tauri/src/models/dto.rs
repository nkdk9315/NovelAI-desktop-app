use serde::{Deserialize, Serialize};

// ---- Row Structs (internal, from DB) ----

pub struct ProjectRow {
    pub id: String,
    pub name: String,
    pub project_type: String,
    pub directory_path: String,
    pub created_at: String,
    pub updated_at: String,
    pub thumbnail_path: Option<String>,
}

pub struct GenreRow {
    pub id: String,
    pub name: String,
    pub is_system: i32,
    pub sort_order: i32,
    pub created_at: String,
    pub icon: String,
    pub color: String,
}

pub struct PromptGroupRow {
    pub id: String,
    pub name: String,
    /// Legacy column — always `None` post-migration-020. Kept on the struct so
    /// the physical column keeps round-tripping until a later cleanup drops it.
    pub genre_id: Option<String>,
    pub is_default_for_genre: i32,
    pub is_system: i32,
    pub usage_type: String,
    pub created_at: String,
    pub updated_at: String,
    pub thumbnail_path: Option<String>,
    pub is_default: i32,
    pub category: Option<i32>,
    pub default_strength: f64,
    pub random_mode: i32,
    pub random_count: i32,
    pub random_source: String,
    pub wildcard_token: Option<String>,
    pub folder_id: Option<i64>,
}

pub struct PromptGroupTagRow {
    pub id: String,
    pub name: String,
    pub tag: String,
    pub negative_prompt: String,
    pub sort_order: i32,
    pub default_strength: i32,
    pub thumbnail_path: Option<String>,
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

#[derive(Debug)]
pub struct VibeRow {
    pub id: String,
    pub name: String,
    pub file_path: String,
    pub model: String,
    pub created_at: String,
    pub thumbnail_path: Option<String>,
    pub is_favorite: bool,
    pub folder_id: Option<i64>,
}

#[derive(Debug)]
pub struct StylePresetRow {
    pub id: String,
    pub name: String,
    pub artist_tags: String, // JSON array
    pub created_at: String,
    pub thumbnail_path: Option<String>,
    pub is_favorite: bool,
    pub model: String,
    pub folder_id: Option<i64>,
}

#[derive(Debug, Clone)]
pub struct AssetFolderRow {
    pub id: i64,
    pub title: String,
    pub parent_id: Option<i64>,
    pub sort_key: i64,
    pub child_count: i64,
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


// ---- Response DTOs (sent to frontend via IPC) ----

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectDto {
    pub id: String,
    pub name: String,
    pub project_type: String,
    pub directory_path: String,
    pub created_at: String,
    pub updated_at: String,
    pub thumbnail_path: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GenreDto {
    pub id: String,
    pub name: String,
    pub is_system: bool,
    pub sort_order: i32,
    pub created_at: String,
    pub icon: String,
    pub color: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptGroupDto {
    pub id: String,
    pub name: String,
    pub folder_id: Option<i64>,
    pub default_genre_ids: Vec<String>,
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
    pub folder_id: Option<i64>,
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
    pub folder_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetFolderDto {
    pub id: i64,
    pub title: String,
    pub parent_id: Option<i64>,
    pub sort_key: i64,
    pub child_count: i64,
}

impl From<AssetFolderRow> for AssetFolderDto {
    fn from(row: AssetFolderRow) -> Self {
        Self {
            id: row.id,
            title: row.title,
            parent_id: row.parent_id,
            sort_key: row.sort_key,
            child_count: row.child_count,
        }
    }
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

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListSystemGroupTagsResponse {
    pub tags: Vec<SystemTagDto>,
    pub total_count: usize,
}

// ---- Tag database (migration 013) ----

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
    pub kind: String,
    pub source: String,
    pub sort_key: i64,
    pub child_count: i64,
    pub is_favorite: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TagDto {
    pub id: i64,
    pub name: String,
    pub csv_category: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TagGroupDto {
    pub id: i64,
    pub slug: String,
    pub title: String,
    pub parent_id: Option<i64>,
    pub kind: String,
    pub source: String,
    pub sort_key: i64,
    pub child_count: i64,
    pub is_favorite: bool,
}

impl From<TagRow> for TagDto {
    fn from(row: TagRow) -> Self {
        Self {
            id: row.id,
            name: row.name,
            csv_category: row.csv_category,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TagWithGroupsDto {
    pub tag: TagDto,
    pub groups: Vec<TagGroupDto>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CountByIdDto {
    pub id: i64,
    pub count: i64,
}

impl From<TagGroupRow> for TagGroupDto {
    fn from(row: TagGroupRow) -> Self {
        Self {
            id: row.id,
            slug: row.slug,
            title: row.title,
            parent_id: row.parent_id,
            kind: row.kind,
            source: row.source,
            sort_key: row.sort_key,
            child_count: row.child_count,
            is_favorite: row.is_favorite,
        }
    }
}

// ---- Request DTOs (from frontend) ----

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProjectRequest {
    pub name: String,
    pub project_type: String,
    pub directory_path: Option<String>,
    pub thumbnail_path: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProjectRequest {
    pub id: String,
    pub name: Option<String>,
    #[serde(default, deserialize_with = "deserialize_double_option")]
    pub thumbnail_path: Option<Option<String>>,
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
pub struct TagInput {
    pub name: Option<String>,
    pub tag: String,
    pub negative_prompt: Option<String>,
    pub default_strength: Option<i32>,
    pub thumbnail_path: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePromptGroupRequest {
    pub name: String,
    #[serde(default)]
    pub folder_id: Option<i64>,
    #[serde(default)]
    pub default_genre_ids: Vec<String>,
    pub tags: Vec<TagInput>,
    pub default_strength: Option<f64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePromptGroupRequest {
    pub id: String,
    pub name: Option<String>,
    #[serde(default, deserialize_with = "deserialize_double_option_i64")]
    pub folder_id: Option<Option<i64>>,
    pub default_genre_ids: Option<Vec<String>>,
    pub tags: Option<Vec<TagInput>>,
    pub is_default: Option<bool>,
    #[serde(default, deserialize_with = "deserialize_double_option")]
    pub thumbnail_path: Option<Option<String>>,
    pub default_strength: Option<f64>,
    pub random_mode: Option<bool>,
    pub random_count: Option<i32>,
    pub random_source: Option<String>,
    #[serde(default, deserialize_with = "deserialize_double_option")]
    pub wildcard_token: Option<Option<String>>,
}

#[derive(Debug, Clone)]
pub struct PromptGroupFolderRow {
    pub id: i64,
    pub title: String,
    pub parent_id: Option<i64>,
    pub sort_key: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptGroupFolderDto {
    pub id: i64,
    pub title: String,
    pub parent_id: Option<i64>,
    pub sort_key: i32,
}

impl From<PromptGroupFolderRow> for PromptGroupFolderDto {
    fn from(row: PromptGroupFolderRow) -> Self {
        Self {
            id: row.id,
            title: row.title,
            parent_id: row.parent_id,
            sort_key: row.sort_key as i32,
        }
    }
}

// NOTE: The command layer currently takes folder CRUD args positionally
// (`title`, `parent_id`, etc.) rather than bundling them into request DTOs.
// These structs are kept as part of the documented IPC contract surface so
// tests / future refactors can wire them in uniformly — allow dead_code.
#[allow(dead_code)]
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePromptGroupFolderRequest {
    pub title: String,
    #[serde(default)]
    pub parent_id: Option<i64>,
}

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePromptGroupFolderRequest {
    pub id: i64,
    pub title: String,
}

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MovePromptGroupFolderRequest {
    pub id: i64,
    #[serde(default)]
    pub new_parent_id: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateGenreRequest {
    pub name: String,
    pub icon: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateGenreRequest {
    pub id: String,
    pub name: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
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

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PresetSlotInput {
    pub slot_label: String,
    pub genre_id: Option<String>,
    pub positive_prompt: String,
    #[serde(default)]
    pub negative_prompt: Option<String>,
    pub role: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePromptPresetRequest {
    pub name: String,
    #[serde(default)]
    pub folder_id: Option<i64>,
    pub slots: Vec<PresetSlotInput>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePromptPresetRequest {
    pub id: String,
    pub name: Option<String>,
    #[serde(default, deserialize_with = "deserialize_double_option_i64")]
    pub folder_id: Option<Option<i64>>,
    pub slots: Option<Vec<PresetSlotInput>>,
}

// ---- Row → DTO 変換 ----

impl From<ProjectRow> for ProjectDto {
    fn from(row: ProjectRow) -> Self {
        Self {
            id: row.id,
            name: row.name,
            project_type: row.project_type,
            directory_path: row.directory_path,
            created_at: row.created_at,
            updated_at: row.updated_at,
            thumbnail_path: row.thumbnail_path,
        }
    }
}

impl From<GenreRow> for GenreDto {
    fn from(row: GenreRow) -> Self {
        Self {
            id: row.id,
            name: row.name,
            is_system: row.is_system != 0,
            sort_order: row.sort_order,
            created_at: row.created_at,
            icon: row.icon,
            color: row.color,
        }
    }
}

impl PromptGroupRow {
    pub fn into_dto(
        self,
        tags: Vec<PromptGroupTagDto>,
        default_genre_ids: Vec<String>,
    ) -> PromptGroupDto {
        PromptGroupDto {
            id: self.id,
            name: self.name,
            folder_id: self.folder_id,
            default_genre_ids,
            is_system: self.is_system != 0,
            usage_type: self.usage_type,
            tags,
            created_at: self.created_at,
            updated_at: self.updated_at,
            thumbnail_path: self.thumbnail_path,
            is_default: self.is_default != 0,
            category: self.category,
            default_strength: self.default_strength,
            random_mode: self.random_mode != 0,
            random_count: self.random_count,
            random_source: self.random_source,
            wildcard_token: self.wildcard_token,
        }
    }
}

impl From<PromptGroupTagRow> for PromptGroupTagDto {
    fn from(row: PromptGroupTagRow) -> Self {
        Self {
            id: row.id,
            name: row.name,
            tag: row.tag,
            negative_prompt: row.negative_prompt,
            sort_order: row.sort_order,
            default_strength: row.default_strength,
            thumbnail_path: row.thumbnail_path,
        }
    }
}

impl From<GeneratedImageRow> for GeneratedImageDto {
    fn from(row: GeneratedImageRow) -> Self {
        Self {
            id: row.id,
            project_id: row.project_id,
            file_path: row.file_path,
            seed: row.seed,
            prompt_snapshot: serde_json::from_str(&row.prompt_snapshot)
                .unwrap_or(serde_json::Value::Null),
            width: row.width,
            height: row.height,
            model: row.model,
            is_saved: row.is_saved != 0,
            created_at: row.created_at,
        }
    }
}

impl From<VibeRow> for VibeDto {
    fn from(row: VibeRow) -> Self {
        Self {
            id: row.id,
            name: row.name,
            file_path: row.file_path,
            model: row.model,
            created_at: row.created_at,
            thumbnail_path: row.thumbnail_path,
            is_favorite: row.is_favorite,
            folder_id: row.folder_id,
        }
    }
}

impl StylePresetRow {
    pub fn into_dto(self, vibe_refs: Vec<PresetVibeRef>) -> StylePresetDto {
        // Backward-compatible parsing: support both ["tag"] and [{"name":"tag","strength":0}]
        let artist_tags: Vec<ArtistTag> =
            serde_json::from_str::<Vec<ArtistTag>>(&self.artist_tags).unwrap_or_else(|_| {
                serde_json::from_str::<Vec<String>>(&self.artist_tags)
                    .unwrap_or_default()
                    .into_iter()
                    .map(|name| ArtistTag {
                        name,
                        strength: 0.0,
                    })
                    .collect()
            });
        StylePresetDto {
            id: self.id,
            name: self.name,
            artist_tags,
            vibe_refs,
            created_at: self.created_at,
            thumbnail_path: self.thumbnail_path,
            is_favorite: self.is_favorite,
            model: self.model,
            folder_id: self.folder_id,
        }
    }
}

// ---- Prompt presets ----

pub struct PromptPresetRow {
    pub id: String,
    pub name: String,
    pub folder_id: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}

pub struct PresetCharacterSlotRow {
    pub id: String,
    pub preset_id: String,
    pub slot_index: i32,
    pub slot_label: String,
    pub genre_id: Option<String>,
    pub positive_prompt: String,
    pub negative_prompt: String,
    pub role: String,
}

#[derive(Debug, Clone)]
pub struct PresetFolderRow {
    pub id: i64,
    pub title: String,
    pub parent_id: Option<i64>,
    pub sort_key: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptPresetDto {
    pub id: String,
    pub name: String,
    pub folder_id: Option<i64>,
    pub slots: Vec<PresetCharacterSlotDto>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PresetCharacterSlotDto {
    pub id: String,
    pub slot_index: i32,
    pub slot_label: String,
    pub genre_id: Option<String>,
    pub positive_prompt: String,
    pub negative_prompt: String,
    pub role: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PresetFolderDto {
    pub id: i64,
    pub title: String,
    pub parent_id: Option<i64>,
    pub sort_key: i32,
}

impl From<PresetFolderRow> for PresetFolderDto {
    fn from(row: PresetFolderRow) -> Self {
        Self {
            id: row.id,
            title: row.title,
            parent_id: row.parent_id,
            sort_key: row.sort_key as i32,
        }
    }
}

impl From<PresetCharacterSlotRow> for PresetCharacterSlotDto {
    fn from(row: PresetCharacterSlotRow) -> Self {
        Self {
            id: row.id,
            slot_index: row.slot_index,
            slot_label: row.slot_label,
            genre_id: row.genre_id,
            positive_prompt: row.positive_prompt,
            negative_prompt: row.negative_prompt,
            role: row.role,
        }
    }
}

impl PromptPresetRow {
    pub fn into_dto(self, slots: Vec<PresetCharacterSlotDto>) -> PromptPresetDto {
        PromptPresetDto {
            id: self.id,
            name: self.name,
            folder_id: self.folder_id,
            slots,
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}

// ---- System group genre defaults ----

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SystemGroupGenreDefaultDto {
    pub genre_id: String,
    pub show_by_default: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetSystemGroupGenreDefaultsRequest {
    pub system_group_id: String,
    pub entries: Vec<SystemGroupGenreDefaultDto>,
}

// ---- Helper ----

fn deserialize_double_option<'de, D>(deserializer: D) -> Result<Option<Option<String>>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    Ok(Some(Option::deserialize(deserializer)?))
}

fn deserialize_double_option_i64<'de, D>(deserializer: D) -> Result<Option<Option<i64>>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    Ok(Some(Option::deserialize(deserializer)?))
}
