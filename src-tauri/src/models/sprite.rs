//! Rows and IPC DTOs of the sprite variant feature (差分制作, F13).
//! See docs/contracts/sprite-variants.md.

use serde::{Deserialize, Serialize};

// ---- Rows ----

#[derive(Debug, Clone)]
pub struct SpriteSetRow {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub spec: String,
    pub sort_order: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone)]
pub struct SpriteCellRow {
    pub set_id: String,
    pub cell_key: String,
    pub adopted_image_id: Option<String>,
    pub excluded: bool,
    pub note: String,
    pub updated_at: String,
}

/// A candidate joined with its image's file path and seed.
#[derive(Debug, Clone)]
pub struct SpriteCandidateRow {
    pub id: String,
    pub set_id: String,
    pub cell_key: String,
    pub image_id: String,
    pub parent_image_id: Option<String>,
    pub method: String,
    pub created_at: String,
    pub file_path: String,
    pub seed: i64,
}

/// A candidate to insert.
#[derive(Debug, Clone)]
pub struct NewSpriteCandidate<'a> {
    pub id: &'a str,
    pub set_id: &'a str,
    pub cell_key: &'a str,
    pub image_id: &'a str,
    pub parent_image_id: Option<&'a str>,
    pub method: &'a str,
    pub created_at: &'a str,
}

// ---- DTOs ----

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpriteSetDto {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub spec: serde_json::Value,
    pub sort_order: i64,
    pub created_at: String,
    pub updated_at: String,
}

impl From<SpriteSetRow> for SpriteSetDto {
    fn from(r: SpriteSetRow) -> Self {
        Self {
            spec: serde_json::from_str(&r.spec).unwrap_or(serde_json::Value::Null),
            id: r.id,
            project_id: r.project_id,
            name: r.name,
            sort_order: r.sort_order,
            created_at: r.created_at,
            updated_at: r.updated_at,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpriteCandidateDto {
    pub id: String,
    pub cell_key: String,
    pub image_id: String,
    pub parent_image_id: Option<String>,
    pub method: String,
    pub created_at: String,
    pub file_path: String,
    pub seed: i64,
}

impl From<SpriteCandidateRow> for SpriteCandidateDto {
    fn from(r: SpriteCandidateRow) -> Self {
        Self {
            id: r.id,
            cell_key: r.cell_key,
            image_id: r.image_id,
            parent_image_id: r.parent_image_id,
            method: r.method,
            created_at: r.created_at,
            file_path: r.file_path,
            seed: r.seed,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpriteCellDto {
    pub cell_key: String,
    pub adopted_image_id: Option<String>,
    pub excluded: bool,
    pub note: String,
    pub candidates: Vec<SpriteCandidateDto>,
}

// ---- Requests ----

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSpriteSetRequest {
    pub project_id: String,
    pub name: String,
    pub spec: serde_json::Value,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSpriteSetRequest {
    pub id: String,
    pub name: Option<String>,
    pub spec: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddSpriteCandidateRequest {
    pub set_id: String,
    pub cell_key: String,
    pub image_id: String,
    pub parent_image_id: Option<String>,
    pub method: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportSpriteCandidateRequest {
    pub set_id: String,
    pub cell_key: String,
    pub path: String,
}

/// An image made in the app (composite / hand edit) saved as a candidate.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveSpriteImageRequest {
    pub set_id: String,
    pub cell_key: String,
    pub image_base64: String,
    pub parent_image_id: Option<String>,
    pub method: String,
    #[serde(default)]
    pub source_image_ids: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetSpriteCellStateRequest {
    pub set_id: String,
    pub cell_key: String,
    pub excluded: Option<bool>,
    pub note: Option<String>,
}

// ---- Export ----

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpriteExportLayer {
    pub base_image_id: String,
    /// 1/8-size black / white PNG (one pixel per 8px cell); white = keep the variant's pixels
    pub mask_base64: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpriteExportImage {
    pub image_id: String,
    pub rel_path: String,
    #[serde(default = "one")]
    pub scale: f64,
    pub layer: Option<SpriteExportLayer>,
}

fn one() -> f64 {
    1.0
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpriteExportText {
    pub rel_path: String,
    pub content: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpriteAtlasEntry {
    pub image_id: String,
    pub frame: String,
    pub layer: Option<SpriteExportLayer>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpriteAtlasRequest {
    /// File name stem; pages are written as `<rel_dir>/<name>-<n>.png/.json`
    pub name: String,
    pub rel_dir: String,
    pub max_size: u32,
    pub padding: u32,
    #[serde(default = "one")]
    pub scale: f64,
    pub entries: Vec<SpriteAtlasEntry>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpriteExportPlan {
    pub set_id: String,
    pub out_dir: String,
    #[serde(default)]
    pub images: Vec<SpriteExportImage>,
    #[serde(default)]
    pub texts: Vec<SpriteExportText>,
    pub atlas: Option<SpriteAtlasRequest>,
    /// Remove plain backgrounds before anything else (images already transparent pass through)
    #[serde(default)]
    pub background: Option<crate::services::sprite_background::BackgroundOptions>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpriteBackgroundPreviewDto {
    pub image_base64: String,
    pub outcome: crate::services::sprite_background::BackgroundOutcome,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpriteExportResultDto {
    pub out_dir: String,
    pub files: Vec<String>,
}
