# インターフェースコントラクト

## 1. Models/DTO Layer (Rust)

### 1.1 DB Row Structs

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
    pub genre_id: Option<String>,
    pub is_default_for_genre: i32,
    pub is_system: i32,
    pub usage_type: String,
    pub created_at: String,
    pub updated_at: String,
}

pub struct PromptGroupTagRow {
    pub id: String,
    pub tag: String,
    pub sort_order: i32,
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

### 1.2 IPC DTOs

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
    pub genre_id: Option<String>,
    pub is_default_for_genre: bool,
    pub is_system: bool,
    pub usage_type: String,
    pub tags: Vec<PromptGroupTagDto>,  // インライン
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptGroupTagDto {
    pub id: String,
    pub tag: String,
    pub sort_order: i32,
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

### 1.3 Request DTOs

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
pub struct CreatePromptGroupRequest {
    pub name: String,
    pub genre_id: Option<String>,
    pub usage_type: String,
    pub tags: Vec<String>,
}

/// genre_id の3状態:
/// - フィールド省略 (None) → 変更なし
/// - 明示的 null (Some(None)) → NULLにクリア
/// - 値あり (Some(Some("..."))) → 指定IDにセット
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePromptGroupRequest {
    pub id: String,
    pub name: Option<String>,
    #[serde(default, deserialize_with = "deserialize_double_option")]
    pub genre_id: Option<Option<String>>,
    pub tags: Option<Vec<String>>,
    pub is_default_for_genre: Option<bool>,
}

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

### 1.4 Row → DTO 変換

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
    pub fn into_dto(self, tags: Vec<PromptGroupTagDto>) -> PromptGroupDto {
        // is_default_for_genre: self.is_default_for_genre != 0
        // is_system: self.is_system != 0
    }
}

impl From<PromptGroupTagRow> for PromptGroupTagDto {
    fn from(row: PromptGroupTagRow) -> Self { /* id, tag, sort_order */ }
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

---

## 2. Repository Layer (Rust)

すべて自由関数。`conn: &Connection` を第1引数に取る。戻り値は `Result<T, AppError>`。

### 2.1 settings_repo

```rust
// --- repositories/settings.rs ---

/// 全設定を取得
/// SQL: SELECT key, value FROM settings
pub fn get_all(conn: &Connection) -> Result<HashMap<String, String>, AppError>;

/// キー指定で取得。見つからなければ None
/// SQL: SELECT value FROM settings WHERE key = ?1
pub fn get_by_key(conn: &Connection, key: &str) -> Result<Option<String>, AppError>;

/// 設定を保存（UPSERT）
/// SQL: INSERT INTO settings (key, value) VALUES (?1, ?2)
///      ON CONFLICT(key) DO UPDATE SET value = excluded.value
pub fn set(conn: &Connection, key: &str, value: &str) -> Result<(), AppError>;
```

### 2.2 project_repo

```rust
// --- repositories/project.rs ---

/// フィルタ付きプロジェクト一覧
/// SQL: SELECT * FROM projects [WHERE name LIKE ?] [AND project_type = ?] ORDER BY created_at DESC
pub fn list_filtered(
    conn: &Connection,
    search: Option<&str>,
    project_type: Option<&str>,
) -> Result<Vec<ProjectRow>, AppError>;

/// ID指定で取得
/// SQL: SELECT * FROM projects WHERE id = ?1
pub fn find_by_id(conn: &Connection, id: &str) -> Result<ProjectRow, AppError>;

/// 挿入
/// SQL: INSERT INTO projects (id, name, project_type, directory_path, thumbnail_path, created_at, updated_at)
///      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
pub fn insert(conn: &Connection, row: &ProjectRow) -> Result<(), AppError>;

/// サムネイルパス更新（None でクリア）
/// SQL: UPDATE projects SET thumbnail_path = ?1, updated_at = ?2 WHERE id = ?3
pub fn update_thumbnail(conn: &Connection, id: &str, path: Option<&str>) -> Result<(), AppError>;

/// 名前更新
/// SQL: UPDATE projects SET name = ?1, updated_at = ?2 WHERE id = ?3
pub fn update_name(conn: &Connection, id: &str, name: &str) -> Result<(), AppError>;

/// 削除 (CASCADE で generated_images も消える)
/// SQL: DELETE FROM projects WHERE id = ?1
pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError>;
```

### 2.3 image_repo

```rust
// --- repositories/image.rs ---

/// プロジェクトの画像一覧
/// SQL: SELECT * FROM generated_images WHERE project_id = ?1
///      [AND is_saved = ?2]  -- saved_only が Some の場合
///      ORDER BY created_at DESC
pub fn list_by_project(
    conn: &Connection,
    project_id: &str,
    saved_only: Option<bool>,
) -> Result<Vec<GeneratedImageRow>, AppError>;

/// ID指定で取得
/// SQL: SELECT * FROM generated_images WHERE id = ?1
pub fn find_by_id(conn: &Connection, id: &str) -> Result<GeneratedImageRow, AppError>;

/// 挿入
/// SQL: INSERT INTO generated_images (id, project_id, file_path, seed, prompt_snapshot,
///      width, height, model, is_saved, created_at) VALUES (...)
pub fn insert(conn: &Connection, row: &GeneratedImageRow) -> Result<(), AppError>;

/// is_saved を更新
/// SQL: UPDATE generated_images SET is_saved = 1 WHERE id = ?1
pub fn update_is_saved(conn: &Connection, id: &str) -> Result<(), AppError>;

/// プロジェクト内の全画像を保存済みに
/// SQL: UPDATE generated_images SET is_saved = 1 WHERE project_id = ?1
pub fn update_all_is_saved(conn: &Connection, project_id: &str) -> Result<(), AppError>;

/// 削除
/// SQL: DELETE FROM generated_images WHERE id = ?1
pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError>;

/// 未保存画像を削除し、削除対象のfile_pathリストを返す
/// SQL: SELECT file_path FROM generated_images WHERE project_id = ?1 AND is_saved = 0
/// SQL: DELETE FROM generated_images WHERE project_id = ?1 AND is_saved = 0
pub fn delete_unsaved(conn: &Connection, project_id: &str) -> Result<Vec<String>, AppError>;
```

### 2.4 genre_repo

```rust
// --- repositories/genre.rs ---

/// 全ジャンル一覧
/// SQL: SELECT * FROM genres ORDER BY sort_order ASC
pub fn list_all(conn: &Connection) -> Result<Vec<GenreRow>, AppError>;

/// ID指定で取得
/// SQL: SELECT * FROM genres WHERE id = ?1
pub fn find_by_id(conn: &Connection, id: &str) -> Result<GenreRow, AppError>;

/// 挿入
/// SQL: INSERT INTO genres (id, name, is_system, sort_order, created_at) VALUES (...)
pub fn insert(conn: &Connection, row: &GenreRow) -> Result<(), AppError>;

/// 削除 (prompt_groups.genre_id は ON DELETE SET NULL)
/// SQL: DELETE FROM genres WHERE id = ?1
pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError>;
```

### 2.5 prompt_group_repo

```rust
// --- repositories/prompt_group.rs ---

/// フィルタ付き一覧
/// SQL: SELECT * FROM prompt_groups
///      WHERE (?1 IS NULL OR genre_id = ?1)
///        AND (?2 IS NULL OR usage_type = ?2)
///        AND (?3 IS NULL OR name LIKE '%' || ?3 || '%')
///      ORDER BY created_at DESC
pub fn list(
    conn: &Connection,
    genre_id: Option<&str>,
    usage_type: Option<&str>,
    search: Option<&str>,
) -> Result<Vec<PromptGroupRow>, AppError>;

/// ID指定で取得
/// SQL: SELECT * FROM prompt_groups WHERE id = ?1
pub fn find_by_id(conn: &Connection, id: &str) -> Result<PromptGroupRow, AppError>;

/// 挿入
/// SQL: INSERT INTO prompt_groups (...) VALUES (...)
pub fn insert(conn: &Connection, row: &PromptGroupRow) -> Result<(), AppError>;

/// 更新
/// SQL: UPDATE prompt_groups SET name=?2, genre_id=?3, is_default_for_genre=?4,
///      usage_type=?5, updated_at=?6 WHERE id = ?1
pub fn update(conn: &Connection, row: &PromptGroupRow) -> Result<(), AppError>;

/// 削除
/// SQL: DELETE FROM prompt_groups WHERE id = ?1
pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError>;

/// 指定ジャンルの他グループのデフォルトフラグをクリア
/// SQL: UPDATE prompt_groups SET is_default_for_genre = 0
///      WHERE genre_id = ?1 AND id != ?2
pub fn clear_default_for_genre(
    conn: &Connection,
    genre_id: &str,
    except_id: &str,
) -> Result<(), AppError>;

/// グループのタグ一覧
/// SQL: SELECT * FROM prompt_group_tags WHERE prompt_group_id = ?1 ORDER BY sort_order ASC
pub fn find_tags_by_group(
    conn: &Connection,
    prompt_group_id: &str,
) -> Result<Vec<PromptGroupTagRow>, AppError>;

/// タグを全置換 (DELETE + INSERT)
/// SQL: DELETE FROM prompt_group_tags WHERE prompt_group_id = ?1
/// SQL: INSERT INTO prompt_group_tags (id, prompt_group_id, tag, sort_order) VALUES (...)
pub fn replace_tags(
    conn: &Connection,
    prompt_group_id: &str,
    tags: &[(String, String, i32)], // (id, tag, sort_order)
) -> Result<(), AppError>;
```

### 2.6 vibe_repo

```rust
// --- repositories/vibe.rs ---

/// 全Vibe一覧
/// SQL: SELECT * FROM vibes ORDER BY created_at DESC
pub fn list_all(conn: &Connection) -> Result<Vec<VibeRow>, AppError>;

/// ID指定で取得
/// SQL: SELECT * FROM vibes WHERE id = ?1
pub fn find_by_id(conn: &Connection, id: &str) -> Result<VibeRow, AppError>;

/// 挿入
/// SQL: INSERT INTO vibes (id, name, file_path, model, created_at, thumbnail_path, is_favorite) VALUES (...)
pub fn insert(conn: &Connection, row: &VibeRow) -> Result<(), AppError>;

/// 削除 (style_preset_vibes, project_vibes は CASCADE)
/// SQL: DELETE FROM vibes WHERE id = ?1
pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError>;

/// 名前更新
/// SQL: UPDATE vibes SET name = ?2 WHERE id = ?1
pub fn update_name(conn: &Connection, id: &str, name: &str) -> Result<(), AppError>;

/// サムネイルパス更新
/// SQL: UPDATE vibes SET thumbnail_path = ?2 WHERE id = ?1
pub fn update_thumbnail(conn: &Connection, id: &str, path: Option<&str>) -> Result<(), AppError>;

/// お気に入りトグル
/// SQL: UPDATE vibes SET is_favorite = NOT is_favorite WHERE id = ?1
pub fn toggle_favorite(conn: &Connection, id: &str) -> Result<(), AppError>;
```

### 2.7 project_vibe_repo

```rust
// --- repositories/project_vibe.rs ---

/// プロジェクトにVibe追加
/// SQL: INSERT OR IGNORE INTO project_vibes (project_id, vibe_id) VALUES (...)
pub fn add_to_project(conn: &Connection, project_id: &str, vibe_id: &str) -> Result<(), AppError>;

/// プロジェクトからVibe削除
/// SQL: DELETE FROM project_vibes WHERE project_id = ?1 AND vibe_id = ?2
pub fn remove_from_project(conn: &Connection, project_id: &str, vibe_id: &str) -> Result<(), AppError>;

/// 表示/非表示切替
/// SQL: UPDATE project_vibes SET is_visible = ?1 WHERE project_id = ?2 AND vibe_id = ?3
pub fn set_visibility(conn: &Connection, project_id: &str, vibe_id: &str, is_visible: bool) -> Result<(), AppError>;

/// プロジェクトのVibe一覧（JOIN取得）
/// SQL: SELECT v.*, pv.is_visible FROM project_vibes pv JOIN vibes v ON pv.vibe_id = v.id WHERE pv.project_id = ?1
pub fn list_with_vibe_details(conn: &Connection, project_id: &str, visible_only: bool) -> Result<Vec<(VibeRow, bool)>, AppError>;
```

### 2.8 style_preset_repo

```rust
// --- repositories/style_preset.rs ---

/// 全プリセット一覧
/// SQL: SELECT * FROM style_presets ORDER BY created_at DESC
pub fn list_all(conn: &Connection) -> Result<Vec<StylePresetRow>, AppError>;

/// ID指定で取得
/// SQL: SELECT * FROM style_presets WHERE id = ?1
pub fn find_by_id(conn: &Connection, id: &str) -> Result<StylePresetRow, AppError>;

/// 挿入
/// SQL: INSERT INTO style_presets (id, name, artist_tags, created_at, thumbnail_path, is_favorite, model) VALUES (...)
pub fn insert(conn: &Connection, row: &StylePresetRow) -> Result<(), AppError>;

/// 更新
/// SQL: UPDATE style_presets SET name=?2, artist_tags=?3 WHERE id = ?1
pub fn update(conn: &Connection, row: &StylePresetRow) -> Result<(), AppError>;

/// 削除 (style_preset_vibes は CASCADE)
/// SQL: DELETE FROM style_presets WHERE id = ?1
pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError>;

/// サムネイルパス更新
/// SQL: UPDATE style_presets SET thumbnail_path = ?2 WHERE id = ?1
pub fn update_thumbnail(conn: &Connection, id: &str, path: Option<&str>) -> Result<(), AppError>;

/// お気に入りトグル
/// SQL: UPDATE style_presets SET is_favorite = NOT is_favorite WHERE id = ?1
pub fn toggle_favorite(conn: &Connection, id: &str) -> Result<(), AppError>;

/// プリセットのVibe参照一覧
/// SQL: SELECT vibe_id, strength FROM style_preset_vibes WHERE style_preset_id = ?1
pub fn find_vibe_refs_by_preset(
    conn: &Connection,
    preset_id: &str,
) -> Result<Vec<PresetVibeRef>, AppError>;

/// Vibe参照を全置換 (DELETE + INSERT)
/// SQL: DELETE FROM style_preset_vibes WHERE style_preset_id = ?1
/// SQL: INSERT INTO style_preset_vibes (style_preset_id, vibe_id, strength) VALUES (...)
pub fn replace_vibe_refs(
    conn: &Connection,
    preset_id: &str,
    vibe_refs: &[PresetVibeRef],
) -> Result<(), AppError>;
```

---

## 3. Service Layer (Rust)

ビジネスロジック層。Repository を呼び出し、ファイルシステム操作や API 呼び出しを行う。

### 3.1 settings_service

```rust
// --- services/settings.rs ---

/// 全設定取得
/// → settings_repo::get_all
pub fn get_all_settings(conn: &Connection) -> Result<HashMap<String, String>, AppError>;

/// 設定保存
/// → settings_repo::set
pub fn set_setting(conn: &Connection, key: &str, value: &str) -> Result<(), AppError>;

/// APIクライアント初期化
/// 1. api_key で NovelAIClient::new() 生成
/// 2. AppState.api_client に Mutex lock → Some(client) セット
/// 3. settings_repo::set(conn, "api_key", api_key) で永続化
pub fn initialize_client(
    conn: &Connection,
    api_client: &tokio::sync::Mutex<Option<NovelAIClient>>,
    api_key: &str,
) -> Result<(), AppError>;

/// Anlas残高取得
/// 1. AppState.api_client lock → client 取得 (None なら NotInitialized)
/// 2. client.get_anlas_balance().await
/// 3. AnlasBalanceDto に変換
pub async fn get_anlas_balance(
    api_client: &tokio::sync::Mutex<Option<NovelAIClient>>,
) -> Result<AnlasBalanceDto, AppError>;
```

### 3.2 project_service

```rust
// --- services/project.rs ---

/// プロジェクト一覧（フィルタ付き）
/// → project_repo::list_filtered
pub fn list_projects(
    conn: &Connection,
    search: Option<&str>,
    project_type: Option<&str>,
) -> Result<Vec<ProjectDto>, AppError>;

/// プロジェクト作成
/// 1. UUID生成
/// 2. directory_path が None の場合 get_default_project_dir で自動計算
/// 3. directory_path にディレクトリ作成 (fs::create_dir_all)
/// 4. directory_path/images/ サブディレクトリ作成
/// 5. project_repo::insert
pub fn create_project(
    conn: &Connection,
    req: CreateProjectRequest,
    base_dir: &Path,
) -> Result<ProjectDto, AppError>;

/// デフォルト保存先を計算（DB操作なし）
/// 戻り値: {base_dir}/projects/{project_type}/{sanitized_name}
pub fn get_default_project_dir(base_dir: &Path, project_type: &str, name: &str) -> PathBuf;

/// プロジェクト名・サムネイル更新
/// → project_repo::update_name (name が Some の場合)
/// → project_repo::update_thumbnail (thumbnail_path が Some の場合)
pub fn update_project(
    conn: &Connection,
    req: UpdateProjectRequest,
) -> Result<ProjectDto, AppError>;

/// サムネイル単体更新（None でクリア）
/// → project_repo::update_thumbnail
pub fn update_project_thumbnail(
    conn: &Connection,
    id: &str,
    thumbnail_path: Option<String>,
) -> Result<ProjectDto, AppError>;

/// プロジェクトを開く
/// 1. image_service::cleanup_unsaved_images(conn, id) で未保存画像削除
/// 2. project_repo::find_by_id → ProjectDto 返却
pub fn open_project(conn: &Connection, id: &str) -> Result<ProjectDto, AppError>;

/// プロジェクト削除
/// 1. project_repo::find_by_id → directory_path 取得
/// 2. project_repo::delete (CASCADE で画像レコードも消える)
/// 3. fs::remove_dir_all(directory_path) でディレクトリ削除
pub fn delete_project(conn: &Connection, id: &str) -> Result<(), AppError>;
```

### 3.3 generation_service

```rust
// --- services/generation.rs ---

/// 画像生成 (最も複雑なサービス)
///
/// Mutex locking strategy:
///   1. DB lock → Vibe情報取得 + Project情報取得 → release
///   2. api_client lock → generate() → release
///   3. ファイル書込 (lock不要)
///   4. DB lock → INSERT → release
///
/// 処理フロー:
///   1. project_repo::find_by_id → directory_path 取得
///   2. req.vibes → vibe_repo::find_by_id × N → VibeRow.file_path 取得
///   3. GenerateParams::builder() で組立:
///      - prompt, negative_prompt, characters → CharacterConfig変換
///      - vibes → VibeConfig { item: VibeItem::FilePath, strength, info_extracted }
///      - model/sampler/noise_schedule → FromStr parse
///      - action → GenerateAction変換 (base64 → ImageInput::Base64)
///      - save → SaveTarget::Directory { dir: project_dir/images/ }
///   4. api_client.generate(&params).await
///   5. GenerateResult からファイル保存確認
///   6. GeneratedImageRow 構築 → image_repo::insert (is_saved = 0)
///   7. GenerateImageResponse 返却 (image_data → base64)
pub async fn generate_image(
    db: &Mutex<Connection>,
    api_client: &tokio::sync::Mutex<Option<NovelAIClient>>,
    req: GenerateImageRequest,
) -> Result<GenerateImageResponse, AppError>;

/// コスト見積もり (純粋計算、API呼び出しなし)
/// → novelai_api::anlas::calculate_generation_cost
pub fn estimate_cost(req: CostEstimateRequest) -> Result<CostResultDto, AppError>;
```

### 3.4 image_service

```rust
// --- services/image.rs ---

/// 画像を保存済みにマーク
/// → image_repo::update_is_saved
pub fn save_image(conn: &Connection, image_id: &str) -> Result<(), AppError>;

/// プロジェクト内の全画像を保存済みに
/// → image_repo::update_all_is_saved
pub fn save_all_images(conn: &Connection, project_id: &str) -> Result<(), AppError>;

/// 画像削除 (DB + ファイル)
/// 1. image_repo::find_by_id → file_path 取得
/// 2. project_repo::find_by_id → directory_path 取得
/// 3. image_repo::delete
/// 4. fs::remove_file(directory_path + file_path)
pub fn delete_image(conn: &Connection, image_id: &str) -> Result<(), AppError>;

/// プロジェクトの画像一覧取得
/// → image_repo::list_by_project → Vec<GeneratedImageDto>
pub fn get_project_images(
    conn: &Connection,
    project_id: &str,
    saved_only: Option<bool>,
) -> Result<Vec<GeneratedImageDto>, AppError>;

/// 未保存画像のクリーンアップ
/// 1. project_repo::find_by_id → directory_path 取得
/// 2. image_repo::delete_unsaved → file_path リスト取得
/// 3. 各 file_path に対して fs::remove_file(directory_path + file_path)
///    (ファイル不在はログ出力のみ、エラーにしない)
pub fn cleanup_unsaved_images(conn: &Connection, project_id: &str) -> Result<(), AppError>;
```

### 3.5 prompt_group_service

```rust
// --- services/prompt_group.rs ---

/// フィルタ付き一覧 (タグ含む)
/// 1. prompt_group_repo::list → Vec<PromptGroupRow>
/// 2. 各グループに対して prompt_group_repo::find_tags_by_group
/// 3. row.into_dto(tags) → Vec<PromptGroupDto>
pub fn list_prompt_groups(
    conn: &Connection,
    genre_id: Option<&str>,
    usage_type: Option<&str>,
    search: Option<&str>,
) -> Result<Vec<PromptGroupDto>, AppError>;

/// ID指定で取得 (タグ含む)
/// → prompt_group_repo::find_by_id + find_tags_by_group
pub fn get_prompt_group(conn: &Connection, id: &str) -> Result<PromptGroupDto, AppError>;

/// 作成 (グループ + タグ一括)
/// 1. UUID生成 (グループ用 + タグ×N)
/// 2. prompt_group_repo::insert
/// 3. prompt_group_repo::replace_tags
pub fn create_prompt_group(
    conn: &Connection,
    req: CreatePromptGroupRequest,
) -> Result<PromptGroupDto, AppError>;

/// 更新
/// 1. prompt_group_repo::find_by_id → 既存取得
/// 2. is_system チェック (システムグループは更新不可)
/// 3. is_default_for_genre が true の場合:
///    prompt_group_repo::clear_default_for_genre(genre_id, id) で排他制御
/// 4. prompt_group_repo::update
/// 5. tags が Some の場合: prompt_group_repo::replace_tags
pub fn update_prompt_group(
    conn: &Connection,
    req: UpdatePromptGroupRequest,
) -> Result<(), AppError>;

/// 削除
/// 1. prompt_group_repo::find_by_id → is_system チェック
/// 2. prompt_group_repo::delete (CASCADE で tags も消える)
pub fn delete_prompt_group(conn: &Connection, id: &str) -> Result<(), AppError>;
```

### 3.6 genre_service

```rust
// --- services/genre.rs ---

/// 全ジャンル一覧
/// → genre_repo::list_all → Vec<GenreDto>
pub fn list_genres(conn: &Connection) -> Result<Vec<GenreDto>, AppError>;

/// ジャンル作成
/// 1. UUID生成
/// 2. sort_order = 既存最大値 + 1
/// 3. genre_repo::insert
pub fn create_genre(conn: &Connection, req: CreateGenreRequest) -> Result<GenreDto, AppError>;

/// ジャンル削除
/// 1. genre_repo::find_by_id → is_system チェック
/// 2. genre_repo::delete (prompt_groups.genre_id は ON DELETE SET NULL)
pub fn delete_genre(conn: &Connection, id: &str) -> Result<(), AppError>;
```

### 3.7 vibe_service

```rust
// --- services/vibe.rs ---

/// 全Vibe一覧
/// → vibe_repo::list_all → Vec<VibeDto>
pub fn list_vibes(conn: &Connection) -> Result<Vec<VibeDto>, AppError>;

/// Vibeインポート（サムネイル付き）
/// 1. .naiv4vibe ファイルを $APPDATA/novelai-desktop/vibes/ にコピー
/// 2. ファイル内容解析 → モデル情報取得 (novelai_api::utils::vibe)
/// 3. UUID生成
/// 4. サムネイル画像コピー（任意、拡張子ホワイトリスト検証済み）
/// 5. vibe_repo::insert
pub fn add_vibe(
    conn: &Connection,
    app_data_dir: &Path,
    req: AddVibeRequest,
) -> Result<VibeDto, AppError>;

/// Vibe削除
/// 1. vibe_repo::find_by_id → file_path 取得
/// 2. vibe_repo::delete (CASCADE で style_preset_vibes, project_vibes も消える)
/// 3. fs::remove_file(file_path)
pub fn delete_vibe(conn: &Connection, id: &str) -> Result<(), AppError>;

/// Vibe名前更新
pub fn update_vibe_name(conn: &Connection, id: &str, name: &str) -> Result<VibeDto, AppError>;

/// Vibeサムネイル更新（拡張子ホワイトリスト検証済み）
pub fn update_vibe_thumbnail(conn: &Connection, app_data_dir: &Path, id: &str, source_path: &str) -> Result<VibeDto, AppError>;

/// Vibeサムネイルクリア
pub fn clear_vibe_thumbnail(conn: &Connection, id: &str) -> Result<VibeDto, AppError>;

/// Vibeお気に入りトグル
pub fn toggle_vibe_favorite(conn: &Connection, id: &str) -> Result<VibeDto, AppError>;

/// Vibeエクスポート
pub fn export_vibe(conn: &Connection, id: &str, dest_path: &str) -> Result<(), AppError>;

/// Vibeエンコード (画像 → .naiv4vibe)
/// 1. api_client で encode_vibe API 呼び出し
/// 2. .naiv4vibe ファイルを $APPDATA/novelai-desktop/vibes/ に保存
/// 3. ソース画像をサムネイルとしてコピー
/// 4. vibe_repo::insert
pub async fn encode_vibe(
    db: &std::sync::Mutex<Connection>,
    api_client: &tokio::sync::Mutex<Option<NovelAIClient>>,
    app_data_dir: &Path,
    req: EncodeVibeRequest,
) -> Result<VibeDto, AppError>;
```

### 3.8 project_vibe_service

```rust
// --- services/project_vibe.rs ---

/// プロジェクトにVibe追加（存在チェック付き）
pub fn add_vibe_to_project(conn: &Connection, project_id: &str, vibe_id: &str) -> Result<(), AppError>;

/// プロジェクトからVibe削除
pub fn remove_vibe_from_project(conn: &Connection, project_id: &str, vibe_id: &str) -> Result<(), AppError>;

/// Vibe表示/非表示切替
pub fn set_vibe_visibility(conn: &Connection, project_id: &str, vibe_id: &str, is_visible: bool) -> Result<(), AppError>;

/// プロジェクトのVibe一覧（visible only）→ VibeDto（JOINクエリ）
pub fn list_project_vibes(conn: &Connection, project_id: &str) -> Result<Vec<VibeDto>, AppError>;

/// プロジェクトのVibe一覧（全件）→ ProjectVibeDto（JOINクエリ）
pub fn list_project_vibes_all(conn: &Connection, project_id: &str) -> Result<Vec<ProjectVibeDto>, AppError>;
```

### 3.9 style_preset_service

```rust
// --- services/style_preset.rs ---

/// 全プリセット一覧 (vibe_refs含む)
/// 1. style_preset_repo::list_all
/// 2. 各プリセットに対して find_vibe_refs_by_preset
/// 3. row.into_dto(vibe_refs)
pub fn list_style_presets(conn: &Connection) -> Result<Vec<StylePresetDto>, AppError>;

/// プリセット作成
/// 1. UUID生成
/// 2. artist_tags → JSON文字列化
/// 3. style_preset_repo::insert
/// 4. style_preset_repo::replace_vibe_refs
pub fn create_style_preset(
    conn: &Connection,
    req: CreateStylePresetRequest,
) -> Result<StylePresetDto, AppError>;

/// プリセット更新
/// 1. style_preset_repo::find_by_id → 既存取得
/// 2. name/artist_tags を更新 → style_preset_repo::update
/// 3. vibe_refs が Some の場合: style_preset_repo::replace_vibe_refs
pub fn update_style_preset(
    conn: &Connection,
    req: UpdateStylePresetRequest,
) -> Result<(), AppError>;

/// プリセットサムネイル更新（拡張子ホワイトリスト検証済み）
pub fn update_preset_thumbnail(conn: &Connection, app_data_dir: &Path, id: &str, source_path: &str) -> Result<StylePresetDto, AppError>;

/// プリセットサムネイルクリア
pub fn clear_preset_thumbnail(conn: &Connection, id: &str) -> Result<StylePresetDto, AppError>;

/// プリセットお気に入りトグル
pub fn toggle_preset_favorite(conn: &Connection, id: &str) -> Result<StylePresetDto, AppError>;

/// プリセット削除
/// → style_preset_repo::delete (CASCADE で junction も消える)
pub fn delete_style_preset(conn: &Connection, id: &str) -> Result<(), AppError>;
```

### 3.9 system_prompt_service

```rust
// --- services/system_prompt.rs ---

/// CSV読込 → SystemPromptDB構築
pub fn load_system_prompt_db<R: BufRead>(reader: R) -> SystemPromptDB;

/// カテゴリ一覧
/// SystemPromptDB.by_category のキー → CategoryDto 変換
pub fn get_categories(db: &SystemPromptDB) -> Vec<CategoryDto>;

/// タグ検索 (部分一致)
/// SystemPromptDB.tags をフィルタ + カテゴリフィルタ + limit
pub fn search_system_prompts(
    db: &SystemPromptDB,
    query: &str,
    category: Option<u8>,
    limit: usize,
) -> Vec<SystemTagDto>;
```

---

## 4. Command Layer (Rust)

Thin wrapper。`State<'_, AppState>` から必要なフィールドを取得し、サービスを呼び出す。

### 4.1 commands/settings.rs

```rust
#[tauri::command]
pub fn get_settings(
    state: State<'_, AppState>,
) -> Result<HashMap<String, String>, String>;
// → db.lock() → settings_service::get_all_settings

#[tauri::command]
pub fn set_setting(
    state: State<'_, AppState>,
    key: String,
    value: String,
) -> Result<(), String>;
// → db.lock() → settings_service::set_setting

#[tauri::command]
pub fn initialize_client(
    state: State<'_, AppState>,
    api_key: String,
) -> Result<(), String>;
// → db.lock() → settings_service::initialize_client(conn, &state.api_client, &api_key)

#[tauri::command]
pub async fn get_anlas_balance(
    state: State<'_, AppState>,
) -> Result<AnlasBalanceDto, String>;
// → settings_service::get_anlas_balance(&state.api_client).await
```

### 4.2 commands/projects.rs

```rust
#[tauri::command]
pub fn list_projects(
    state: State<'_, AppState>,
    search: Option<String>,
    project_type: Option<String>,
) -> Result<Vec<ProjectDto>, String>;

#[tauri::command]
pub fn create_project(
    state: State<'_, AppState>,
    req: CreateProjectRequest,
) -> Result<ProjectDto, String>;

#[tauri::command]
pub fn update_project(
    state: State<'_, AppState>,
    req: UpdateProjectRequest,
) -> Result<ProjectDto, String>;

#[tauri::command]
pub fn update_project_thumbnail(
    state: State<'_, AppState>,
    id: String,
    thumbnail_path: Option<String>,
) -> Result<ProjectDto, String>;

#[tauri::command]
pub fn get_default_project_dir(
    state: State<'_, AppState>,
    project_type: String,
    name: String,
) -> Result<String, String>;

#[tauri::command]
pub fn open_project(state: State<'_, AppState>, id: String) -> Result<ProjectDto, String>;

#[tauri::command]
pub fn delete_project(state: State<'_, AppState>, id: String) -> Result<(), String>;
```

### 4.3 commands/images.rs

```rust
#[tauri::command]
pub async fn generate_image(
    state: State<'_, AppState>,
    req: GenerateImageRequest,
) -> Result<GenerateImageResponse, String>;
// → generation_service::generate_image(&state.db, &state.api_client, req).await

#[tauri::command]
pub fn estimate_cost(req: CostEstimateRequest) -> Result<CostResultDto, String>;
// → generation_service::estimate_cost(req) (AppState不要)

#[tauri::command]
pub fn save_image(state: State<'_, AppState>, image_id: String) -> Result<(), String>;

#[tauri::command]
pub fn save_all_images(state: State<'_, AppState>, project_id: String) -> Result<(), String>;

#[tauri::command]
pub fn delete_image(state: State<'_, AppState>, image_id: String) -> Result<(), String>;

#[tauri::command]
pub fn get_project_images(
    state: State<'_, AppState>,
    project_id: String,
    saved_only: Option<bool>,
) -> Result<Vec<GeneratedImageDto>, String>;

#[tauri::command]
pub fn cleanup_unsaved_images(
    state: State<'_, AppState>,
    project_id: String,
) -> Result<(), String>;
```

### 4.4 commands/prompt_groups.rs

```rust
#[tauri::command]
pub fn list_prompt_groups(
    state: State<'_, AppState>,
    genre_id: Option<String>,
    usage_type: Option<String>,
    search: Option<String>,
) -> Result<Vec<PromptGroupDto>, String>;

#[tauri::command]
pub fn get_prompt_group(
    state: State<'_, AppState>,
    id: String,
) -> Result<PromptGroupDto, String>;

#[tauri::command]
pub fn create_prompt_group(
    state: State<'_, AppState>,
    req: CreatePromptGroupRequest,
) -> Result<PromptGroupDto, String>;

#[tauri::command]
pub fn update_prompt_group(
    state: State<'_, AppState>,
    req: UpdatePromptGroupRequest,
) -> Result<(), String>;

#[tauri::command]
pub fn delete_prompt_group(state: State<'_, AppState>, id: String) -> Result<(), String>;
```

### 4.5 commands/genres.rs

```rust
#[tauri::command]
pub fn list_genres(state: State<'_, AppState>) -> Result<Vec<GenreDto>, String>;

#[tauri::command]
pub fn create_genre(
    state: State<'_, AppState>,
    req: CreateGenreRequest,
) -> Result<GenreDto, String>;

#[tauri::command]
pub fn delete_genre(state: State<'_, AppState>, id: String) -> Result<(), String>;
```

### 4.6 commands/vibes.rs

```rust
#[tauri::command]
pub fn list_vibes(state: State<'_, AppState>) -> Result<Vec<VibeDto>, String>;

#[tauri::command]
pub fn add_vibe(state: State<'_, AppState>, app_handle: tauri::AppHandle, req: AddVibeRequest) -> Result<VibeDto, String>;

#[tauri::command]
pub fn delete_vibe(state: State<'_, AppState>, id: String) -> Result<(), String>;

#[tauri::command]
pub fn update_vibe_name(state: State<'_, AppState>, req: UpdateVibeNameRequest) -> Result<VibeDto, String>;

#[tauri::command]
pub fn update_vibe_thumbnail(state: State<'_, AppState>, app_handle: tauri::AppHandle, req: UpdateVibeThumbnailRequest) -> Result<VibeDto, String>;

#[tauri::command]
pub fn clear_vibe_thumbnail(state: State<'_, AppState>, id: String) -> Result<VibeDto, String>;

#[tauri::command]
pub fn toggle_vibe_favorite(state: State<'_, AppState>, id: String) -> Result<VibeDto, String>;

#[tauri::command]
pub fn export_vibe(state: State<'_, AppState>, id: String, dest_path: String) -> Result<(), String>;

#[tauri::command]
pub async fn encode_vibe(state: State<'_, AppState>, app_handle: tauri::AppHandle, req: EncodeVibeRequest) -> Result<VibeDto, String>;

#[tauri::command]
pub fn add_vibe_to_project(state: State<'_, AppState>, project_id: String, vibe_id: String) -> Result<(), String>;

#[tauri::command]
pub fn remove_vibe_from_project(state: State<'_, AppState>, project_id: String, vibe_id: String) -> Result<(), String>;

#[tauri::command]
pub fn set_vibe_visibility(state: State<'_, AppState>, project_id: String, vibe_id: String, is_visible: bool) -> Result<(), String>;

#[tauri::command]
pub fn list_project_vibes(state: State<'_, AppState>, project_id: String) -> Result<Vec<VibeDto>, String>;

#[tauri::command]
pub fn list_project_vibes_all(state: State<'_, AppState>, project_id: String) -> Result<Vec<ProjectVibeDto>, String>;
```

### 4.7 commands/style_presets.rs

```rust
#[tauri::command]
pub fn list_style_presets(state: State<'_, AppState>) -> Result<Vec<StylePresetDto>, String>;

#[tauri::command]
pub fn create_style_preset(state: State<'_, AppState>, req: CreateStylePresetRequest) -> Result<StylePresetDto, String>;

#[tauri::command]
pub fn update_style_preset(state: State<'_, AppState>, req: UpdateStylePresetRequest) -> Result<(), String>;

#[tauri::command]
pub fn delete_style_preset(state: State<'_, AppState>, id: String) -> Result<(), String>;

#[tauri::command]
pub fn toggle_preset_favorite(state: State<'_, AppState>, id: String) -> Result<StylePresetDto, String>;

#[tauri::command]
pub fn update_preset_thumbnail(state: State<'_, AppState>, app_handle: tauri::AppHandle, req: UpdatePresetThumbnailRequest) -> Result<StylePresetDto, String>;

#[tauri::command]
pub fn clear_preset_thumbnail(state: State<'_, AppState>, id: String) -> Result<StylePresetDto, String>;
```

### 4.8 commands/system_prompts.rs

```rust
#[tauri::command]
pub fn get_system_prompt_categories(
    state: State<'_, AppState>,
) -> Result<Vec<CategoryDto>, String>;
// → system_prompt_service::get_categories(&state.system_tags)

#[tauri::command]
pub fn search_system_prompts(
    state: State<'_, AppState>,
    query: String,
    category: Option<u8>,
    limit: Option<usize>,
) -> Result<Vec<SystemTagDto>, String>;
// → system_prompt_service::search_system_prompts(&state.system_tags, &query, category, limit.unwrap_or(50))
```

---

## 5. Frontend Types (TypeScript)

### 5.1 型定義

```typescript
// --- src/types/index.ts ---

// ---- Entities ----

export interface ProjectDto {
  id: string;
  name: string;
  projectType: string;
  directoryPath: string;
  thumbnailPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GenreDto {
  id: string;
  name: string;
  isSystem: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface PromptGroupDto {
  id: string;
  name: string;
  genreId: string | null;
  isDefaultForGenre: boolean;
  isSystem: boolean;
  usageType: "main" | "character" | "both";
  tags: PromptGroupTagDto[];
  createdAt: string;
  updatedAt: string;
}

export interface PromptGroupTagDto {
  id: string;
  tag: string;
  sortOrder: number;
}

export interface GeneratedImageDto {
  id: string;
  projectId: string;
  filePath: string;
  seed: number;
  promptSnapshot: Record<string, unknown>;
  width: number;
  height: number;
  model: string;
  isSaved: boolean;
  createdAt: string;
}

export interface VibeDto {
  id: string;
  name: string;
  filePath: string;
  model: string;
  createdAt: string;
}

export interface StylePresetDto {
  id: string;
  name: string;
  artistTags: string[];
  vibeIds: string[];
  createdAt: string;
}

export interface AnlasBalanceDto {
  anlas: number;
  tier: number;
}

export interface CostResultDto {
  totalCost: number;
  isOpusFree: boolean;
}

export interface CategoryDto {
  id: number;
  name: string;
  count: number;
}

export interface SystemTagDto {
  name: string;
  category: number;
  postCount: number;
  aliases: string[];
}

// ---- Requests ----

export interface CreateProjectRequest {
  name: string;
  projectType: string;
  directoryPath?: string; // 省略時はバックエンドでデフォルトパスを自動計算
  thumbnailPath?: string | null;
}

export interface UpdateProjectRequest {
  id: string;
  name?: string;
  thumbnailPath?: string | null; // null = クリア, string = セット, undefined = 変更なし
}

export interface GenerateImageRequest {
  projectId: string;
  prompt: string;
  negativePrompt?: string;
  characters?: CharacterRequest[];
  vibes?: VibeReference[];
  width: number;
  height: number;
  steps: number;
  scale: number;
  cfgRescale: number;
  seed?: number;
  sampler: string;
  noiseSchedule: string;
  model: string;
  action: GenerateActionRequest;
}

export interface CharacterRequest {
  prompt: string;
  centerX: number;
  centerY: number;
  negativePrompt: string;
}

export interface VibeReference {
  vibeId: string;
  strength: number;
  infoExtracted: number;
}

export type GenerateActionRequest =
  | { type: "generate" }
  | { type: "img2Img"; sourceImageBase64: string; strength: number; noise: number }
  | { type: "infill"; sourceImageBase64: string; maskBase64: string; maskStrength: number; colorCorrect: boolean };

export interface GenerateImageResponse {
  id: string;
  base64Image: string;
  seed: number;
  filePath: string;
  anlasRemaining?: number;
  anlasConsumed?: number;
}

export interface CostEstimateRequest {
  width: number;
  height: number;
  steps: number;
  vibeCount: number;
  hasCharacterReference: boolean;
  tier: number;
}

export interface CreatePromptGroupRequest {
  name: string;
  genreId?: string;
  usageType: string;
  tags: string[];
}

export interface UpdatePromptGroupRequest {
  id: string;
  name?: string;
  genreId?: string | null;  // undefined=変更なし, null=クリア, string=セット
  tags?: string[];
  isDefaultForGenre?: boolean;
}

export interface CreateGenreRequest {
  name: string;
}

export interface AddVibeRequest {
  filePath: string;
  name: string;
}

export interface EncodeVibeRequest {
  imagePath: string;
  model: string;
  name: string;
}

export interface CreateStylePresetRequest {
  name: string;
  artistTags: string[];
  vibeIds: string[];
}

export interface UpdateStylePresetRequest {
  id: string;
  name?: string;
  artistTags?: string[];
  vibeIds?: string[];
}

// ---- Error ----

export interface AppError {
  kind: "NotFound" | "Validation" | "Database" | "ApiClient" | "Io" | "NotInitialized";
  message: string;
}
```

### 5.2 IPC Wrapper

```typescript
// --- src/lib/ipc.ts ---

import { invoke } from "@tauri-apps/api/core";
import type {
  ProjectDto, GenreDto, PromptGroupDto, GeneratedImageDto,
  VibeDto, StylePresetDto, AnlasBalanceDto, CostResultDto,
  CategoryDto, SystemTagDto, GenerateImageResponse,
  CreateProjectRequest, UpdateProjectRequest, GenerateImageRequest, CostEstimateRequest,
  CreatePromptGroupRequest, UpdatePromptGroupRequest, CreateGenreRequest,
  AddVibeRequest, EncodeVibeRequest, CreateStylePresetRequest,
  UpdateStylePresetRequest,
} from "@/types";

// ---- Settings ----

export function getSettings(): Promise<Record<string, string>> {
  return invoke("get_settings");
}

export function setSetting(key: string, value: string): Promise<void> {
  return invoke("set_setting", { key, value });
}

export function initializeClient(apiKey: string): Promise<void> {
  return invoke("initialize_client", { apiKey });
}

export function getAnlasBalance(): Promise<AnlasBalanceDto> {
  return invoke("get_anlas_balance");
}

// ---- Projects ----

export function listProjects(search?: string, projectType?: string): Promise<ProjectDto[]> {
  return invoke("list_projects", { search, projectType });
}

export function createProject(req: CreateProjectRequest): Promise<ProjectDto> {
  return invoke("create_project", { req });
}

export function updateProject(req: UpdateProjectRequest): Promise<ProjectDto> {
  return invoke("update_project", { req });
}

export function updateProjectThumbnail(id: string, thumbnailPath?: string | null): Promise<ProjectDto> {
  return invoke("update_project_thumbnail", { id, thumbnailPath });
}

export function getDefaultProjectDir(projectType: string, name: string): Promise<string> {
  return invoke("get_default_project_dir", { projectType, name });
}

export function openProject(id: string): Promise<ProjectDto> {
  return invoke("open_project", { id });
}

export function deleteProject(id: string): Promise<void> {
  return invoke("delete_project", { id });
}

// ---- Images ----

export function generateImage(req: GenerateImageRequest): Promise<GenerateImageResponse> {
  return invoke("generate_image", { req });
}

export function estimateCost(req: CostEstimateRequest): Promise<CostResultDto> {
  return invoke("estimate_cost", { req });
}

export function saveImage(imageId: string): Promise<void> {
  return invoke("save_image", { imageId });
}

export function saveAllImages(projectId: string): Promise<void> {
  return invoke("save_all_images", { projectId });
}

export function deleteImage(imageId: string): Promise<void> {
  return invoke("delete_image", { imageId });
}

export function getProjectImages(
  projectId: string,
  savedOnly?: boolean,
): Promise<GeneratedImageDto[]> {
  return invoke("get_project_images", { projectId, savedOnly });
}

export function cleanupUnsavedImages(projectId: string): Promise<void> {
  return invoke("cleanup_unsaved_images", { projectId });
}

// ---- Prompt Groups ----

export function listPromptGroups(
  genreId?: string,
  usageType?: string,
  search?: string,
): Promise<PromptGroupDto[]> {
  return invoke("list_prompt_groups", { genreId, usageType, search });
}

export function getPromptGroup(id: string): Promise<PromptGroupDto> {
  return invoke("get_prompt_group", { id });
}

export function createPromptGroup(req: CreatePromptGroupRequest): Promise<PromptGroupDto> {
  return invoke("create_prompt_group", { req });
}

export function updatePromptGroup(req: UpdatePromptGroupRequest): Promise<void> {
  return invoke("update_prompt_group", { req });
}

export function deletePromptGroup(id: string): Promise<void> {
  return invoke("delete_prompt_group", { id });
}

// ---- Genres ----

export function listGenres(): Promise<GenreDto[]> {
  return invoke("list_genres");
}

export function createGenre(req: CreateGenreRequest): Promise<GenreDto> {
  return invoke("create_genre", { req });
}

export function deleteGenre(id: string): Promise<void> {
  return invoke("delete_genre", { id });
}

// ---- Vibes ----

export function listVibes(): Promise<VibeDto[]> {
  return invoke("list_vibes");
}

export function addVibe(req: AddVibeRequest): Promise<VibeDto> {
  return invoke("add_vibe", { req });
}

export function deleteVibe(id: string): Promise<void> {
  return invoke("delete_vibe", { id });
}

export function encodeVibe(req: EncodeVibeRequest): Promise<VibeDto> {
  return invoke("encode_vibe", { req });
}

// ---- Style Presets ----

export function listStylePresets(): Promise<StylePresetDto[]> {
  return invoke("list_style_presets");
}

export function createStylePreset(req: CreateStylePresetRequest): Promise<StylePresetDto> {
  return invoke("create_style_preset", { req });
}

export function updateStylePreset(req: UpdateStylePresetRequest): Promise<void> {
  return invoke("update_style_preset", { req });
}

export function deleteStylePreset(id: string): Promise<void> {
  return invoke("delete_style_preset", { id });
}

// ---- System Prompts ----

export function getSystemPromptCategories(): Promise<CategoryDto[]> {
  return invoke("get_system_prompt_categories");
}

export function searchSystemPrompts(
  query: string,
  category?: number,
  limit?: number,
): Promise<SystemTagDto[]> {
  return invoke("search_system_prompts", { query, category, limit });
}
```

---

## 6. Frontend Utilities

### 6.1 toastError (`src/lib/toast-error.ts`)

```typescript
export function toastError(message: string): void
```

`toast.error()` を Sonner の `action` オプション付きでラップするヘルパー。

- アクションボタン: `lucide-react` の Copy アイコン（`React.createElement` で生成）
- クリック時: `navigator.clipboard.writeText(message)` → `toast.success(i18n.t("common.copied"))`
- 全モーダル・ページで `toast.error()` の代わりに使用する

---

## 7. 設計上の重要な決定

### 6.1 UpdatePromptGroupRequest の genre_id 3状態

JSON → Rust の `Option<Option<String>>` マッピング:

| JSON | Rust | 意味 |
|------|------|------|
| フィールド省略 | `None` | 変更なし |
| `"genreId": null` | `Some(None)` | NULL にクリア |
| `"genreId": "xxx"` | `Some(Some("xxx"))` | 指定IDにセット |

カスタム `deserialize_double_option` 関数が必要。

### 6.2 generate_image の Mutex ロック戦略

```
1. db.lock()      → Vibe情報 + Project情報取得 → drop(guard)
2. api_client.lock() → client.generate().await  → drop(guard)
3. ファイル書込 (ロック不要)
4. db.lock()      → image_repo::insert          → drop(guard)
```

DB ロックと API ロックを同時に保持しない。API 呼び出し中（数秒）に DB がブロックされるのを防ぐ。

### 6.3 novelai-api crate の型再利用

以下の型はサービス層内部でのみ使用し、IPC には露出しない:
- `GenerateParams`, `GenerateParamsBuilder`
- `GenerateResult`, `VibeEncodeResult`
- `NovelAIClient`
- `Model`, `Sampler`, `NoiseSchedule` (IPC では文字列として受け渡し、サービス層で `FromStr` parse)
- `GenerationCostParams`, `GenerationCostResult`

### 6.4 カテゴリ名マッピング

```rust
fn category_name(id: u8) -> &'static str {
    match id {
        0 => "一般タグ",
        1 => "アーティスト",
        3 => "作品名",
        4 => "キャラクター",
        5 => "メタ",
        _ => "その他",
    }
}
```

### 6.5 Vibe マージ戦略（プリセット × 単品 重複時）

フロントエンド（`ActionBar.tsx`）で生成リクエスト組み立て時に、同一 `vibeId` を1エントリに統合する。

**優先順位**:
1. **有効プリセットのVibes（先勝ち）** — `sidebarPresets` 配列順に走査。同一 vibeId が複数プリセットに含まれる場合、先に登場したプリセットの `strength` を採用
2. **単品Vibes（補完）** — プリセットに含まれない vibeId のみ追加

```
PresetA (enabled): vibe-1 (0.5), vibe-2 (0.8)
PresetB (enabled): vibe-1 (0.3), vibe-3 (0.6)
単品:               vibe-2 (0.4), vibe-4 (0.9)

→ 結果: vibe-1 (0.5), vibe-2 (0.8), vibe-3 (0.6), vibe-4 (0.9)
  vibe-1: PresetA先勝ち（PresetBの0.3は無視）
  vibe-2: PresetA先勝ち（単品の0.4は無視）
  vibe-3: PresetBから（PresetAに未登場）
  vibe-4: 単品から（プリセットに未登場）
```

コスト計算（`vibeCount`）もマージ後のユニーク数を使用。

---

## 変更履歴

| 日付 | 内容 |
|------|------|
| 2026-04-07 | 初版作成 |
| 2026-04-10 | Vibe UX強化に伴うDTO/Repository/Service/Command全面更新、Vibeマージ戦略追加 |
