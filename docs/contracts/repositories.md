# Repository Layer (Rust)

すべて自由関数。`conn: &Connection` を第1引数に取る。戻り値は `Result<T, AppError>`。

## 2.1 settings_repo

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

## 2.2 project_repo

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

## 2.3 image_repo

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

## 2.4 genre_repo

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

## 2.5 prompt_group_repo

```rust
// --- repositories/prompt_group.rs ---

pub fn list(conn, search: Option<&str>) -> Result<Vec<PromptGroupRow>, AppError>;
pub fn find_by_id(conn, id: &str) -> Result<PromptGroupRow, AppError>;
pub fn insert(conn, row: &PromptGroupRow) -> Result<(), AppError>;
pub fn update(conn, row: &PromptGroupRow) -> Result<(), AppError>;
pub fn delete(conn, id: &str) -> Result<(), AppError>;
pub fn list_default_genres(conn, prompt_group_id: &str) -> Result<Vec<String>, AppError>;
pub fn set_default_genres(conn, prompt_group_id: &str, genre_ids: &[String]) -> Result<(), AppError>;
pub fn list_groups_for_default_genre(conn, genre_id: &str) -> Result<Vec<String>, AppError>;
pub fn find_tags_by_group(conn, prompt_group_id: &str) -> Result<Vec<PromptGroupTagRow>, AppError>;
// tags: (id, name, tag, negative_prompt, sort_order, default_strength, thumbnail_path)
pub fn replace_tags(conn, prompt_group_id: &str, tags: &[(String, String, String, String, i32, i32, Option<String>)]) -> Result<(), AppError>;
```

## 2.6 vibe_repo

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

## 2.7 project_vibe_repo

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

## 2.8 style_preset_repo

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

## Tag DB — Repository

```rust
// --- repositories/tag.rs ---

// 検索
pub fn search(conn, query: &str, group_id: Option<i64>, limit: usize) -> Result<Vec<TagRow>, AppError>;
pub fn search_like(conn, query: &str, group_id: Option<i64>, limit: usize) -> Result<Vec<TagRow>, AppError>;
pub fn list_parent_groups(conn, tag_id: i64) -> Result<Vec<TagGroupRow>, AppError>;

// グループ参照
pub fn list_roots(conn) -> Result<Vec<TagGroupRow>, AppError>;
pub fn list_children(conn, parent_id: i64) -> Result<Vec<TagGroupRow>, AppError>;
pub fn find_group(conn, group_id: i64) -> Result<TagGroupRow, AppError>;
pub fn list_group_tags(conn, group_id: i64, limit: usize) -> Result<Vec<TagRow>, AppError>;
pub fn list_unclassified_characters(conn, limit: usize) -> Result<Vec<TagRow>, AppError>;
pub fn list_orphan_tags_by_category(conn, csv_category: i64, letter_bucket: Option<&str>, limit: usize)
    -> Result<Vec<TagRow>, AppError>;

// お気に入り（migration 014）
pub fn list_favorite_roots(conn) -> Result<Vec<TagGroupRow>, AppError>;
pub fn list_favorite_children(conn, parent_id: i64) -> Result<Vec<TagGroupRow>, AppError>;
pub fn toggle_favorite(conn, group_id: i64) -> Result<bool, AppError>;
pub fn count_tag_members_per_group(conn) -> Result<Vec<(i64, i64)>, AppError>;
pub fn count_favorite_descendants_per_group(conn) -> Result<Vec<(i64, i64)>, AppError>;

// ユーザ編集（source='user' のみ変更可）
pub fn create_user_group(conn, parent_id: Option<i64>, title: &str) -> Result<i64, AppError>;
pub fn rename_user_group(conn, group_id: i64, title: &str) -> Result<(), AppError>;
pub fn move_user_group(conn, group_id: i64, new_parent_id: Option<i64>) -> Result<(), AppError>;
pub fn delete_user_group(conn, group_id: i64) -> Result<(), AppError>;
pub fn add_members(conn, group_id: i64, tag_ids: &[i64]) -> Result<usize, AppError>;
pub fn remove_members(conn, group_id: i64, tag_ids: &[i64]) -> Result<usize, AppError>;
```

FTS5 エスケープ (`to_fts_match`) は repo 層に閉じている。サービス層は raw 文字列を渡すだけ。
