# Service Layer (Rust)

ビジネスロジック層。Repository を呼び出し、ファイルシステム操作や API 呼び出しを行う。

## 3.1 settings_service

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

## 3.2 project_service

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
/// project_repo::find_by_id → ProjectDto 返却
/// （未保存画像は削除しない。履歴はプロジェクトを閉じても保持される）
pub fn open_project(conn: &Connection, id: &str) -> Result<ProjectDto, AppError>;

/// プロジェクト削除
/// 1. project_repo::find_by_id → directory_path 取得
/// 2. project_repo::delete (CASCADE で画像レコードも消える)
/// 3. fs::remove_dir_all(directory_path) でディレクトリ削除
pub fn delete_project(conn: &Connection, id: &str) -> Result<(), AppError>;
```

## 3.3 generation_service

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
///      - character_reference → CharacterReferenceConfig { image: ImageInput::Base64, strength, fidelity, mode }
///   4. api_client.generate_with_progress(&params, on_progress).await
///      （on_progress: 途中経過の JPEG を GenerationProgressDto { step, image_base64 } にして渡す。None なら送らない）
///   5. image_output::persist_output_image で images/<uuid>.<ext> 書込 + image_repo::insert (is_saved = 0)
///      （prompt_snapshot = PromptSnapshotInput::build(seed)。拡張子は result.image_format）
///   6. GenerateImageResponse 返却 (image_data → base64)
pub async fn generate_image(
    db: &Mutex<Connection>,
    api_client: &tokio::sync::Mutex<Option<NovelAIClient>>,
    req: GenerateImageRequest,
    on_progress: Option<&(dyn Fn(GenerationProgressDto) + Send + Sync)>,
) -> Result<GenerateImageResponse, AppError>;

/// リクエスト検証（generate_image 冒頭で呼ばれる）
/// - characters 数 ≤ モデル別上限（V5: 32 / V4・V4.5: 6）
/// - V5 + vibes → Validation / V4・V4.5 + transparent_background → Validation
/// - character_reference: V5 では Validation（API クライアントが V4.5 以外を拒否）、
///   vibes との併用は Validation、mode は parse_char_ref_mode、strength / fidelity は 0.0–1.0
pub fn validate_generate_request(req: &GenerateImageRequest) -> Result<(), AppError>;

/// "character" | "character&style" | "style" → novelai_api::schemas::CharRefMode
/// それ以外は Validation
pub fn parse_char_ref_mode(mode: &str) -> Result<CharRefMode, AppError>;

/// コスト見積もり (純粋計算、API呼び出しなし)
/// → novelai_api::anlas::calculate_generation_cost
pub fn estimate_cost(req: CostEstimateRequest) -> Result<CostResultDto, AppError>;
```

### 3.3a generation_snapshot

```rust
// --- services/generation_snapshot.rs ---

/// generate_image のリクエストから prompt_snapshot 用 JSON を組み立てる。
/// ui_snapshot は Rust 側では不透明な JSON として保持するだけで、フロント側
/// restore-generation.ts がバージョン判定して各ストアにばら撒く。
pub struct PromptSnapshotInput {
    pub prompt: String,
    pub negative_prompt: Option<String>,
    pub width: u32,
    pub height: u32,
    pub steps: u32,
    pub scale: f64,
    pub cfg_rescale: f64,
    pub sampler: String,
    pub noise_schedule: String,
    pub model: String,
    pub characters: Option<serde_json::Value>,
    pub vibes: Option<serde_json::Value>,
    pub ui_snapshot: Option<serde_json::Value>,
    /// action の要約（画像 / マスクのバイト列は保存しない）
    pub action: serde_json::Value,
    /// キャラ参照の設定 { mode, strength, fidelity }（画像は保存しない）
    pub character_reference: Option<serde_json::Value>,
}

/// GenerateActionRequest → 履歴用の要約 JSON
/// - Generate → {"type":"generate"}
/// - Img2Img  → {"type":"img2img","strength","noise"}
/// - Infill   → {"type":"infill","strength"(=mask_strength),"colorCorrect"}
pub fn action_summary(action: &GenerateActionRequest) -> serde_json::Value;

impl PromptSnapshotInput {
    pub fn from_request(req: &GenerateImageRequest) -> Self;
    pub fn build(self, seed: u64) -> serde_json::Value;
}
```

### 3.3b image_output

```rust
// --- services/image_output.rs ---
// 入力画像の読込と、出力画像（generation / augment / upscale）の履歴保存を共通化する。

pub const MAX_INPUT_IMAGE_BYTES: u64 = 10 * 1024 * 1024;   // 10 MB
const ALLOWED_INPUT_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "webp"];

pub struct StoredImage { pub id: String, pub relative_path: String }
pub struct OutputMeta {
    pub seed: i64, pub width: u32, pub height: u32,
    pub model: String, pub prompt_snapshot: serde_json::Value,
}

/// project_repo::find_by_id → directory_path
pub fn project_dir(db: &Mutex<Connection>, project_id: &str) -> Result<String, AppError>;

/// <project>/images/<uuid>.<ext> に書込（プロジェクト外パスは Validation）→ image_repo::insert (is_saved = 0)
pub fn persist_output_image(
    db: &Mutex<Connection>, project_id: &str, project_dir: &str,
    bytes: &[u8], ext: &str, meta: OutputMeta,
) -> Result<StoredImage, AppError>;

/// 履歴画像のバイト列。image_repo / project_repo でパス解決し、
/// プロジェクトディレクトリ外（`..` を含む等）は Validation
pub fn read_history_image(db: &Mutex<Connection>, image_id: &str) -> Result<Vec<u8>, AppError>;

/// ユーザーが選んだ画像ファイル（D&D / ファイルダイアログ）を読む。
/// 拡張子 png/jpg/jpeg/webp のみ（大文字小文字無視）、通常ファイルのみ、10 MB 以下。違反は Validation
pub fn read_image_file(path: &str) -> Result<Vec<u8>, AppError>;

/// base64 デコード（`data:...;base64,` 接頭辞を除去）。不正は Validation
pub fn decode_base64(data: &str) -> Result<Vec<u8>, AppError>;

/// ImageSourceRequest::History → read_history_image / Base64 → decode_base64
pub fn resolve_source(db: &Mutex<Connection>, source: &ImageSourceRequest) -> Result<Vec<u8>, AppError>;

/// マジックバイトから (MIME, 拡張子) を判定。PNG / JPEG / WebP 以外は ("application/octet-stream", "bin")
pub fn detect_format(bytes: &[u8]) -> (&'static str, &'static str);

/// bytes → ImageDataDto { base64, mime }。未対応形式は Validation
pub fn to_image_data(bytes: &[u8]) -> Result<ImageDataDto, AppError>;
```

### 3.3c image_tools

```rust
// --- services/image_tools.rs ---
// Director Tools (augment) と Upscale。出力はプロジェクト履歴に追加する。

/// req_type 文字列 → AugmentReqType（未知は Validation）
pub fn parse_req_type(req_type: &str) -> Result<AugmentReqType, AppError>;

/// ツール別オプション検証: defry ≤ MAX_DEFRY(5)、emotion は prompt（感情キーワード）必須
pub fn validate_augment_request(req: &AugmentImageRequest) -> Result<AugmentReqType, AppError>;

/// 1. validate_augment_request
/// 2. image_output::resolve_source → 画像サイズ取得、MAX_PIXELS (3,145,728px) 超は Validation
/// 3. api_client.augment_image(AugmentParams { req_type, image, prompt, defry, save: None })
/// 4. 履歴保存: model = "augment:<tool>", seed = 0,
///    prompt_snapshot = {"action":{"type":"augment","tool","prompt","defry"},"source_image_id"}
pub async fn augment_image(
    db: &Mutex<Connection>,
    api_client: &tokio::sync::Mutex<Option<NovelAIClient>>,
    req: AugmentImageRequest,
) -> Result<ImageToolResponse, AppError>;

/// 1. image_output::resolve_source → UPSCALE_MAX_PIXELS (1,048,576px) 超は Validation
/// 2. api_client.upscale_image(UpscaleParams { image, ..Default::default() })（2x）
/// 3. 履歴保存: model = "upscale", seed = 0,
///    prompt_snapshot = {"action":{"type":"upscale","scale"},"source_image_id"}
pub async fn upscale_image(
    db: &Mutex<Connection>,
    api_client: &tokio::sync::Mutex<Option<NovelAIClient>>,
    req: UpscaleImageRequest,
) -> Result<ImageToolResponse, AppError>;

/// 写植（アプリで文字を載せた画像）を履歴に追加する。API は呼ばない。
/// model = "typeset", seed = 0, prompt_snapshot = typeset_snapshot(source_image_id, layers)
pub fn save_typeset(db: &Mutex<Connection>, req: SaveTypesetRequest) -> Result<ImageToolResponse, AppError>;
/// {"action":{"type":"typeset"},"source_image_id","typeset": layers}（layers はフロントのテキストボックス。再編集用）
pub fn typeset_snapshot(source_image_id: Option<&str>, layers: &serde_json::Value) -> serde_json::Value;
```

`source_image_id` は `ImageSourceRequest::History` のときのみ値が入り、Base64 入力では `null`。

### 3.3d image_metadata

```rust
// --- services/image_metadata.rs ---
// NovelAI が PNG に埋め込む生成メタデータを読む（D&D 時のメタデータ取り込み用）。
// tEXt チャンク（Title / Description / Software / Source / Comment = リクエスト JSON）が
// 削除された画像でも、alpha チャンネルの LSB に同じデータが stealth 形式で残っている場合がある。

const PNG_SIGNATURE: &[u8] = &[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A];
const STEALTH_MAGIC: &[u8] = b"stealth_pngcomp";
const MAX_TEXT_BYTES: u64 = 32 * 1024 * 1024;   // 展開後テキストの上限（32 MB、細工ファイル対策）

/// PNG のテキストチャンク（tEXt / zTXt / iTXt）を keyword → 値で返す。PNG でなければ空
/// tEXt は仕様上 Latin-1 だが NovelAI は UTF-8 で書くため UTF-8 を優先し、失敗時のみ Latin-1。
/// zTXt / 圧縮 iTXt は zlib 展開（MAX_TEXT_BYTES で打ち切り）。途中で切れたチャンクは読み飛ばして終了（panic しない）
pub fn png_text_chunks(bytes: &[u8]) -> HashMap<String, String>;

/// alpha チャンネル LSB に埋め込まれたメタデータ（`stealth_pngcomp`: gzip 圧縮 JSON）。
/// ビットは列優先（x ごとに y を上から下へ）で読む: マジック 15 byte → ビット長 u32 BE → gzip ペイロード。
/// alpha なし / マジック不一致 / 展開・パース失敗は None
pub fn stealth_metadata(bytes: &[u8]) -> Option<HashMap<String, String>>;

/// テキストチャンクに Comment があればそれを、無ければ stealth_metadata を使う。
/// Comment が JSON オブジェクトでなければ None
pub fn extract(bytes: &[u8]) -> Option<ImageMetadataDto>;

/// image_output::read_image_file（拡張子・サイズ制限）→ extract
pub fn read_file_metadata(path: &str) -> Result<Option<ImageMetadataDto>, AppError>;
```

## 3.4 image_service

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

## 3.5 prompt_group_service

```rust
// --- services/prompt_group.rs ---

pub fn list_prompt_groups(conn, search: Option<&str>) -> Result<Vec<PromptGroupDto>, AppError>;
pub fn get_prompt_group(conn, id: &str) -> Result<PromptGroupDto, AppError>;
pub fn create_prompt_group(conn, req: CreatePromptGroupRequest) -> Result<PromptGroupDto, AppError>;
pub fn update_prompt_group(conn, req: UpdatePromptGroupRequest) -> Result<(), AppError>;
pub fn update_prompt_group_thumbnail(conn, id: &str, thumbnail_path: Option<&str>) -> Result<(), AppError>;
pub fn delete_prompt_group(conn, id: &str) -> Result<(), AppError>;
pub fn list_default_genres(conn, prompt_group_id: &str) -> Result<Vec<String>, AppError>;
pub fn set_default_genres(conn, prompt_group_id: &str, genre_ids: &[String]) -> Result<(), AppError>;
```

## 3.6 genre_service

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

## 3.7 vibe_service

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

### 3.7a vibe_import

```rust
// --- services/vibe_import.rs ---
// 生のエンコーディング（NovelAI 画像メタデータの reference_image_multiple 等）を
// .naiv4vibe としてライブラリに追加する。

/// Vibe Transfer 対応モデルキー（V5 は Vibe Transfer 非対応）
const VIBE_MODEL_KEYS: &[(&str, &str)] = &[
    ("v4curated", "nai-diffusion-4-curated-preview"),
    ("v4full", "nai-diffusion-4-full"),
    ("v4-5curated", "nai-diffusion-4-5-curated"),
    ("v4-5full", "nai-diffusion-4-5-full"),
];

/// 検証してモデル名を返す: model_key が VIBE_MODEL_KEYS に無い / encoding が空・
/// MAX_VIBE_ENCODING_LENGTH 超・base64 文字以外を含む / information_extracted・strength が 0..=1 外 → Validation
pub fn validate_request(req: &ImportVibeEncodingRequest) -> Result<&'static str, AppError>;

/// 1. validate_request
/// 2. 重複検出: 同じ model_key の既存 Vibe の .naiv4vibe を読み、同一 encoding があれば
///    ImportedVibeDto { vibe, existed: true } を返す（ファイル・DB は変更しない）
/// 3. .naiv4vibe JSON を組立（id = encoding の SHA-256、encodings.<model_key>.unknown、importInfo）
/// 4. $APPDATA/vibes/<uuid>.naiv4vibe に書込 → vibe_repo::insert（thumbnail なし）
/// 5. ImportedVibeDto { vibe, existed: false }
pub fn import_vibe_encoding(
    conn: &Connection,
    app_data_dir: &Path,
    req: ImportVibeEncodingRequest,
) -> Result<ImportedVibeDto, AppError>;
```

## 3.8 project_vibe_service

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

## 3.9 style_preset_service

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

## 3.10 system_prompt_service

```rust
// --- services/system_prompt.rs ---

/// CSV読込 → SystemPromptDB構築
pub fn load_system_prompt_db<R: BufRead>(reader: R) -> SystemPromptDB;

/// カテゴリ一覧
/// SystemPromptDB.by_category のキー → CategoryDto 変換
pub fn get_categories(db: &SystemPromptDB) -> Vec<CategoryDto>;

pub fn search_system_prompts(db, query, category: Option<u8>, limit: usize) -> Vec<SystemTagDto>;
pub fn seed_system_prompt_groups(conn) -> Result<(), AppError>;
pub fn list_system_group_tags(db, category: u8, query: Option<&str>, offset: usize, limit: usize) -> (Vec<SystemTagDto>, usize);
pub fn get_random_tags(db, category: u8, count: usize) -> Vec<SystemTagDto>;
```

## 3.11 system_group_settings_service

Compat shim over `prompt_group_default_genres` (post-migration 020).

```rust
pub fn get_defaults(conn, system_group_id: &str) -> Result<Vec<SystemGroupGenreDefaultDto>, AppError>;
pub fn set_defaults(conn, system_group_id: &str, entries: Vec<SystemGroupGenreDefaultDto>) -> Result<(), AppError>;
pub fn list_default_groups_for_genre(conn, genre_id: &str) -> Result<Vec<String>, AppError>;
```

## Tag DB — Service

```rust
// --- services/tag.rs ---

pub fn search(conn, query: &str, group_id: Option<i64>, limit: usize) -> Result<Vec<TagDto>, AppError>;
pub fn search_with_groups(conn, query: &str, limit: usize) -> Result<Vec<TagWithGroupsDto>, AppError>;
pub fn list_roots(conn) -> Result<Vec<TagGroupDto>, AppError>;
pub fn get_group(conn, group_id: i64) -> Result<TagGroupDto, AppError>;
pub fn list_children(conn, parent_id: i64) -> Result<Vec<TagGroupDto>, AppError>;
pub fn list_favorite_roots(conn) -> Result<Vec<TagGroupDto>, AppError>;
pub fn list_favorite_children(conn, parent_id: i64) -> Result<Vec<TagGroupDto>, AppError>;
pub fn toggle_favorite(conn, group_id: i64) -> Result<bool, AppError>;
pub fn list_group_tags(conn, group_id: i64, limit: usize) -> Result<Vec<TagDto>, AppError>;
pub fn list_unclassified_characters(conn, limit: usize) -> Result<Vec<TagDto>, AppError>;
pub fn list_orphan_tags_by_category(conn, csv_category: i64, letter_bucket: Option<&str>, limit: usize)
    -> Result<Vec<TagDto>, AppError>;
pub fn count_tag_members_per_group(conn) -> Result<Vec<CountByIdDto>, AppError>;
pub fn count_favorite_descendants_per_group(conn) -> Result<Vec<CountByIdDto>, AppError>;
pub fn create_user_group(conn, parent_id: Option<i64>, title: &str) -> Result<TagGroupDto, AppError>;
pub fn rename_user_group(conn, group_id: i64, title: &str) -> Result<(), AppError>;
pub fn move_user_group(conn, group_id: i64, new_parent_id: Option<i64>) -> Result<(), AppError>;
pub fn delete_user_group(conn, group_id: i64) -> Result<(), AppError>;
pub fn add_members(conn, group_id: i64, tag_ids: &[i64]) -> Result<usize, AppError>;
pub fn remove_members(conn, group_id: i64, tag_ids: &[i64]) -> Result<usize, AppError>;
```

ディスパッチ方針: 3 文字未満は `repo::search_like`、3 文字以上は `repo::search`（FTS5 trigram）。

## 3.12 prompt_preset_service

```rust
// --- services/prompt_preset.rs ---

pub fn list_prompt_presets(conn: &Connection, search: Option<&str>) -> Result<Vec<PromptPresetDto>, AppError>;
pub fn get_prompt_preset(conn: &Connection, id: &str) -> Result<PromptPresetDto, AppError>;
pub fn create_prompt_preset(conn: &Connection, req: CreatePromptPresetRequest) -> Result<PromptPresetDto, AppError>;
pub fn update_prompt_preset(conn: &Connection, req: UpdatePromptPresetRequest) -> Result<(), AppError>;
pub fn delete_prompt_preset(conn: &Connection, id: &str) -> Result<(), AppError>;
pub fn reorder_prompt_presets(conn: &mut Connection, req: ReorderPromptPresetsRequest) -> Result<(), AppError>;
```

バリデーション:
- プリセット名 trim 後の空禁止 / 最大 255 文字
- slot 数は最低 2 必須（create および update で slots を更新する場合）
- UUID は Service 層で `uuid::Uuid::new_v4()` 生成
- `create_prompt_preset` は `repo::next_sort_key(folder_id)` でフォルダ内末尾の `sort_key` を自動採番
- `reorder_prompt_presets` は `ordered_ids` の全プリセットが `folder_id` に所属することを確認し、トランザクション内で `sort_key = index` を一括更新

## 3.13 preset_folder_service

```rust
// --- services/preset_folder.rs ---

pub fn list_preset_folders(conn: &Connection) -> Result<Vec<PresetFolderDto>, AppError>;
pub fn create_preset_folder(conn: &Connection, title: &str, parent_id: Option<i64>) -> Result<PresetFolderDto, AppError>;
pub fn rename_preset_folder(conn: &Connection, id: i64, title: &str) -> Result<(), AppError>;
pub fn move_preset_folder(conn: &Connection, id: i64, new_parent_id: Option<i64>) -> Result<(), AppError>;
pub fn delete_preset_folder(conn: &Connection, id: i64) -> Result<(), AppError>;
pub fn count_presets_in_folder(conn: &Connection, folder_id: i64) -> Result<i64, AppError>;
pub fn delete_presets_in_folder(conn: &Connection, folder_id: i64) -> Result<usize, AppError>;
pub fn set_preset_folder(conn: &Connection, preset_id: &str, folder_id: Option<i64>) -> Result<(), AppError>;
```

## 3.14 sidebar_preset_group_service

```rust
// --- services/sidebar_preset_group.rs ---

pub fn list_by_project(conn: &Connection, project_id: &str) -> Result<Vec<SidebarPresetGroupInstanceDto>, AppError>;
pub fn create(conn: &Connection, req: CreateSidebarPresetGroupInstanceRequest) -> Result<SidebarPresetGroupInstanceDto, AppError>;
pub fn update_pair(conn: &Connection, req: UpdateSidebarPresetGroupPairRequest) -> Result<(), AppError>;
pub fn set_active_presets(conn: &Connection, req: SetSidebarPresetGroupActivePresetsRequest) -> Result<(), AppError>;
pub fn update_default_strength(conn: &Connection, req: UpdateSidebarPresetGroupDefaultStrengthRequest) -> Result<(), AppError>;
pub fn set_preset_strength(conn: &Connection, req: SetSidebarPresetGroupPresetStrengthRequest) -> Result<(), AppError>;
pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError>;
// reorder は全 ID の project 所属を検証した後、単一トランザクションで position を書き換え
pub fn reorder(conn: &mut Connection, req: ReorderSidebarPresetGroupInstancesRequest) -> Result<(), AppError>;
```

バリデーション:
- `source_character_id != target_character_id`
- 強度は `is_finite()` かつ `1.0..=10.0`
- reorder は各 `ordered_ids[i]` が `project_id` に属することを確認してから適用

## 3.15 Folder Services（共通パターン）

`prompt_group_folder` / `vibe_folder` / `style_preset_folder` は自己参照木の CRUD を同形のシグネチャで提供する。`preset_folder` は §3.13 を参照。

```rust
// --- services/prompt_group_folder.rs / vibe_folder.rs / style_preset_folder.rs ---

pub fn list_roots(conn) -> Result<Vec<FolderDto>, AppError>;
pub fn list_children(conn, parent_id: i64) -> Result<Vec<FolderDto>, AppError>;
pub fn create(conn, title: &str, parent_id: Option<i64>) -> Result<FolderDto, AppError>;
pub fn rename(conn, id: i64, title: &str) -> Result<(), AppError>;
pub fn move_to(conn, id: i64, new_parent_id: Option<i64>) -> Result<(), AppError>;
pub fn delete(conn, id: i64) -> Result<(), AppError>;  // CASCADE for descendants
pub fn set_folder_of_entity(conn, entity_id, folder_id: Option<i64>) -> Result<(), AppError>;
pub fn count_per_folder(conn) -> Result<Vec<CountByIdDto>, AppError>;
```

バリデーション:
- title は trim 後の空禁止・最大 255 文字
- `move_to` は循環防止（自身の子孫を新親に指定できない）
- 深さは UI 側で目安 5 階層まで、DB 制約はなし

## 3.16 tag_seed_service

```rust
// --- services/tag_seed.rs / tag_seed_csv.rs ---

/// `tags` が空の場合だけ CSV + tag_groups.json + character_groups.json を読み込んで seed する。
/// 既に seed 済みなら no-op。失敗時は bail して startup を停止（半端な状態で起動しない）。
pub fn seed_if_empty(conn: &mut Connection, resources_dir: &Path) -> Result<(), AppError>;

/// Danbooru CSV をパースして `(tag_name, csv_category, post_count, aliases)` を返す。
/// BufRead 経由のストリーミング実装（メモリ効率のため）。
pub fn parse_csv<R: BufRead>(reader: R) -> impl Iterator<Item = Result<TagCsvRow, AppError>>;
```

`lib.rs` の `setup` で呼ばれる。ユーザーフォルダに配置したタグ DB は残るため、アプリ再起動で再 seed されない。

## 3.17 vibe_encode_service

```rust
// --- services/vibe_encode.rs ---

/// 画像 → Vibe Transfer 用エンコーディングの生成と永続化を分離したヘルパー。
/// `generation_service::generate_image` から、また `commands::encode_vibe` から利用される。
pub async fn encode_to_file(
    api_client: &tokio::sync::Mutex<Option<NovelAIClient>>,
    src_image_path: &Path,
    dest_naiv4vibe_path: &Path,
    model: &str,
    info_extracted: f32,
) -> Result<(), AppError>;
```

## 3.18 tokens_service

```rust
// --- services/tokens.rs ---

/// 任意の文字列配列の T5 トークン数を返す。
/// novelai-api の `get_t5_tokenizer` を初回呼び出しで非同期にロードし
/// （ディスクキャッシュ + メモリシングルトン）、以降は即時返却。
/// 空文字列は 0 を返し、非空は `count_tokens()` の結果（EOS 込み）を返す。
pub async fn count_tokens(req: CountTokensRequest) -> Result<CountTokensResponse, AppError>;

/// novelai-api の MAX_TOKENS (= 512) を返す純粋関数。
pub fn max_tokens() -> usize;
```

呼び出し側（フロントエンド）は、ポジティブ側（メインプロンプト + 全キャラクタープロンプト）の
トークン数合計と、ネガティブ側の合計がそれぞれ `max_tokens` 以下であることを検証する。
トークナイザー取得に失敗した場合は `AppError::ApiClient` を返し、フロントエンドはバリデーションを
スキップしてユーザー操作を阻害しない。
