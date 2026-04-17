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
/// 1. image_service::cleanup_unsaved_images(conn, id) で未保存画像削除
/// 2. project_repo::find_by_id → ProjectDto 返却
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

## 3.12 tokens_service

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
