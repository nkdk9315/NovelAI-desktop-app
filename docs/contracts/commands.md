# Command Layer (Rust)

Thin wrapper。`State<'_, AppState>` から必要なフィールドを取得し、サービスを呼び出す。

## 4.1 commands/settings.rs

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

## 4.2 commands/projects.rs

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

## 4.3 commands/images.rs

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

## 4.4 commands/prompt_groups.rs

```rust
#[tauri::command]
pub fn list_prompt_groups(state, search: Option<String>) -> Result<Vec<PromptGroupDto>, String>;
pub fn get_prompt_group(state, id: String) -> Result<PromptGroupDto, String>;
pub fn create_prompt_group(state, req: CreatePromptGroupRequest) -> Result<PromptGroupDto, String>;
pub fn update_prompt_group(state, req: UpdatePromptGroupRequest) -> Result<(), String>;
pub fn update_prompt_group_thumbnail(state, id: String, thumbnail_path: Option<String>) -> Result<(), String>;
pub fn delete_prompt_group(state, id: String) -> Result<(), String>;
pub fn list_prompt_group_default_genres(state, group_id: String) -> Result<Vec<String>, String>;
pub fn set_prompt_group_default_genres(state, group_id: String, genre_ids: Vec<String>) -> Result<(), String>;
```

## 4.5 commands/genres.rs

```rust
#[tauri::command]
pub fn list_genres(state: State<'_, AppState>) -> Result<Vec<GenreDto>, String>;

#[tauri::command]
pub fn create_genre(
    state: State<'_, AppState>,
    req: CreateGenreRequest,
) -> Result<GenreDto, String>;

#[tauri::command]
pub fn update_genre(
    state: State<'_, AppState>,
    req: UpdateGenreRequest,
) -> Result<GenreDto, String>;

#[tauri::command]
pub fn delete_genre(state: State<'_, AppState>, id: String) -> Result<(), String>;
```

## 4.6 commands/vibes.rs

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

## 4.7 commands/style_presets.rs

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

## 4.8 commands/system_prompts.rs

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
pub fn list_system_group_tags(state, category: u8, query: Option<String>, offset: Option<usize>, limit: Option<usize>) -> Result<ListSystemGroupTagsResponse, String>;
pub fn get_random_artist_tags(state, count: usize) -> Result<Vec<SystemTagDto>, String>;
```

## 4.9 commands/system_group_settings.rs

```rust
pub fn get_system_group_genre_defaults(state, system_group_id: String) -> Result<Vec<SystemGroupGenreDefaultDto>, String>;
pub fn set_system_group_genre_defaults(state, req: SetSystemGroupGenreDefaultsRequest) -> Result<(), String>;
pub fn list_default_system_groups_for_genre(state, genre_id: String) -> Result<Vec<String>, String>;
```

## 4.X Tag Database Commands

### 起動時シード

`lib.rs` の `setup` 内で `services::tag_seed::seed_if_empty(&mut conn, &resources_dir)` を呼ぶ。`tags` が空のときだけ `tag_groups.json` / `character_groups.json` を読み込んで挿入する。失敗時は startup を bail（半端に seed された状態で起動しない方針）。

### commands/tags.rs

| Command | 引数 | 戻り値 |
|---|---|---|
| `search_tags` | query, groupId?, limit? | `Vec<TagDto>` |
| `search_tags_with_groups` | query, limit? | `Vec<TagWithGroupsDto>` |
| `list_tag_group_roots` | — | `Vec<TagGroupDto>` |
| `get_tag_group` | groupId | `TagGroupDto` |
| `list_tag_group_children` | parentId | `Vec<TagGroupDto>` |
| `list_tag_group_tags` | groupId, limit? | `Vec<TagDto>` |
| `list_unclassified_character_tags` | limit? | `Vec<TagDto>` |
| `list_orphan_tags_by_category` | csvCategory, letterBucket?, limit? | `Vec<TagDto>` |
| `create_user_tag_group` | parentId?, title | `TagGroupDto` |
| `rename_tag_group` | groupId, title | `()` |
| `delete_tag_group` | groupId | `()` |
| `move_tag_group` | groupId, newParentId? | `()` |
| `add_tags_to_group` | groupId, tagIds | `usize` |
| `remove_tags_from_group` | groupId, tagIds | `usize` |
| `list_favorite_tag_group_roots` | — | `Vec<TagGroupDto>` |
| `list_favorite_tag_group_children` | parentId | `Vec<TagGroupDto>` |
| `toggle_tag_group_favorite` | groupId | `bool`（新しい状態） |
| `count_tag_members_per_group` | — | `Vec<CountByIdDto>` |
| `count_favorite_descendants_per_group` | — | `Vec<CountByIdDto>` |

## 4.10 commands/prompt_presets.rs

| コマンド | 引数 | 戻り値 |
|---|---|---|
| `list_prompt_presets` | search? | `Vec<PromptPresetDto>` |
| `get_prompt_preset` | id | `PromptPresetDto` |
| `create_prompt_preset` | req: `CreatePromptPresetRequest` | `PromptPresetDto` |
| `update_prompt_preset` | req: `UpdatePromptPresetRequest` | `()` |
| `delete_prompt_preset` | id | `()` |
| `reorder_prompt_presets` | req: `ReorderPromptPresetsRequest` | `()` |

## 4.11 commands/preset_folders.rs

| コマンド | 引数 | 戻り値 |
|---|---|---|
| `list_preset_folders` | — | `Vec<PresetFolderDto>` |
| `create_preset_folder` | title, parentId? | `PresetFolderDto` |
| `rename_preset_folder` | folderId, title | `()` |
| `move_preset_folder` | folderId, newParentId? | `()` |
| `delete_preset_folder` | folderId | `()` |
| `count_presets_in_folder` | folderId | `i64` |
| `delete_presets_in_folder` | folderId | `usize`（削除件数） |
| `set_preset_folder` | presetId, folderId? | `()` |

## 4.12 commands/sidebar_preset_groups.rs

| コマンド | 引数 | 戻り値 |
|---|---|---|
| `list_sidebar_preset_group_instances` | projectId | `Vec<SidebarPresetGroupInstanceDto>` |
| `create_sidebar_preset_group_instance` | req | `SidebarPresetGroupInstanceDto` |
| `update_sidebar_preset_group_pair` | req | `()` |
| `set_sidebar_preset_group_active_presets` | req | `()` |
| `delete_sidebar_preset_group_instance` | id | `()` |
| `reorder_sidebar_preset_group_instances` | req | `()` |
| `update_sidebar_preset_group_default_strength` | req | `()` |
| `set_sidebar_preset_group_preset_strength` | req | `()` |

## 4.14 Folder Commands (共通パターン)

`prompt_group_folders` / `vibe_folders` / `style_preset_folders` / `preset_folders` は自己参照木（`parent_id` NULL=ルート）の CRUD を共通パターンで提供する。実装は `commands/{prompt_group,vibe,style_preset,preset}_folders.rs`。

### 4.14.1 commands/prompt_group_folders.rs

| コマンド | 引数 | 戻り値 |
|---|---|---|
| `list_prompt_group_folders` | — | `Vec<PromptGroupFolderDto>` |
| `create_prompt_group_folder` | title, parentId? | `PromptGroupFolderDto` |
| `rename_prompt_group_folder` | folderId, title | `()` |
| `move_prompt_group_folder` | folderId, newParentId? | `()` |
| `delete_prompt_group_folder` | folderId | `()` |
| `delete_prompt_groups_in_folder` | folderId | `usize`（削除件数） |
| `count_prompt_groups_in_folder` | folderId | `i64` |
| `set_prompt_group_folder` | promptGroupId, folderId? | `()` |

### 4.14.2 commands/vibe_folders.rs

| コマンド | 引数 | 戻り値 |
|---|---|---|
| `list_vibe_folder_roots` | — | `Vec<VibeFolderDto>` |
| `list_vibe_folder_children` | parentId | `Vec<VibeFolderDto>` |
| `create_vibe_folder` | title, parentId? | `VibeFolderDto` |
| `rename_vibe_folder` | folderId, title | `()` |
| `move_vibe_folder` | folderId, newParentId? | `()` |
| `delete_vibe_folder` | folderId | `()` |
| `set_vibe_folder` | vibeId, folderId? | `()` |
| `count_vibes_per_folder` | — | `Vec<CountByIdDto>` |

### 4.14.3 commands/style_preset_folders.rs

| コマンド | 引数 | 戻り値 |
|---|---|---|
| `list_style_preset_folder_roots` | — | `Vec<StylePresetFolderDto>` |
| `list_style_preset_folder_children` | parentId | `Vec<StylePresetFolderDto>` |
| `create_style_preset_folder` | title, parentId? | `StylePresetFolderDto` |
| `rename_style_preset_folder` | folderId, title | `()` |
| `move_style_preset_folder` | folderId, newParentId? | `()` |
| `delete_style_preset_folder` | folderId | `()` |
| `set_style_preset_folder` | presetId, folderId? | `()` |
| `count_style_presets_per_folder` | — | `Vec<CountByIdDto>` |

## 4.15 commands/tokens.rs

```rust
#[tauri::command]
pub async fn count_tokens(req: CountTokensRequest) -> Result<CountTokensResponse, String>;
// → tokens_service::count_tokens(req).await

#[tauri::command]
pub fn get_max_prompt_tokens() -> usize;
// → tokens_service::max_tokens() (= novelai_api::constants::MAX_TOKENS, 512)
```

フロントエンドは `count_tokens` に `[main_positive, char1_positive, …, main_negative, char1_negative, …]`
の形で一括送信し、返ってきた `counts` を前半（ポジティブ）と後半（ネガティブ）で合計して
それぞれ `max_tokens` と比較する。`AppState` を参照しないため並行実行可能。
