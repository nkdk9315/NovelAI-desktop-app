# テスト戦略

## 1. テスト方針

| レイヤー | テスト | 手法 | 理由 |
|---------|--------|------|------|
| Repository | する | インメモリSQLite | SQL正確性の検証。ROI最高 |
| Service (DB系) | する | インメモリSQLite + tempdir | ビジネスロジック + ファイルI/O |
| Service (API系) | しない | — | novelai-api crate側でテスト済み |
| Command | しない | — | thin wrapper、Service テストでカバー |
| Frontend (`lib/cost.ts`) | する | Vitest | 純粋関数、コスト計算の正確性 |
| Frontend (Stores/UI) | しない | — | IPC依存、手動確認で十分 |

---

## 2. NovelAIClient モッキング方針

**API呼び出しサービスは直接テストしない。**

| 選択肢 | 判定 | 理由 |
|--------|------|------|
| Trait導入 | 不採用 | 全serviceシグネチャにジェネリクスが波及。デスクトップアプリには過剰 |
| `#[cfg(test)]` 差替 | 不採用 | テスト専用コードパスの保守コスト |
| mockito (HTTP層) | 不採用 | novelai-api crateが既に同じことをやっている |
| **テストしない** | **採用** | crate側でカバー済み。アプリ側はDB/ファイル操作を個別テスト |

`generate_image` の処理フローは分離可能:
- DB読取 → repository テストでカバー
- パラメータ構築 → 将来 `build_generate_params()` として抽出可能
- API呼出 → novelai-api crateでカバー
- ファイル書込 → service テストでカバー
- DB挿入 → repository テストでカバー

---

## 3. テストインフラ

### 3.1 共通ユーティリティ

```rust
// src-tauri/src/test_utils.rs
// #[cfg(test)] で条件コンパイル

use rusqlite::Connection;

/// インメモリSQLite接続を作成し、マイグレーションを実行
pub fn setup_test_db() -> Connection {
    let conn = Connection::open_in_memory().unwrap();
    conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
    ).unwrap();
    conn.execute_batch(include_str!("../migrations/001_init.sql")).unwrap();
    conn
}

/// テスト用Projectを挿入して返す
pub fn create_test_project(conn: &Connection) -> ProjectRow { ... }

/// テスト用Genre (非システム) を挿入して返す (Phase 2+)
pub fn create_test_genre(conn: &Connection) -> GenreRow { ... }

/// テスト用PromptGroupを挿入して返す (Phase 2+)
pub fn create_test_prompt_group(conn: &Connection, genre_id: &str) -> PromptGroupRow { ... }

/// テスト用Vibeを挿入して返す (Phase 2+)
pub fn create_test_vibe(conn: &Connection) -> VibeRow { ... }

/// テスト用GeneratedImageを挿入して返す (is_saved: 0=未保存, 1=保存済み)
pub fn create_test_image(conn: &Connection, project_id: &str, is_saved: i32) -> GeneratedImageRow { ... }

/// テスト用StylePresetを挿入して返す (Phase 2+)
pub fn create_test_style_preset(conn: &Connection) -> StylePresetRow { ... }
```

### 3.2 dev-dependencies

```toml
[dev-dependencies]
tempfile = "3"
```

他のモックライブラリは不要。

### 3.3 ファイルI/Oテスト

```rust
use tempfile::TempDir;

#[test]
fn test_create_project_creates_directory() {
    let conn = setup_test_db();
    let tmp = TempDir::new().unwrap();
    let dir = tmp.path().join("test-project");
    // ... service呼び出し → dir の存在確認
    // TempDir の drop で自動クリーンアップ
}
```

---

## 4. テスト対象の詳細

### 4.1 Repository テスト

#### settings_repo

| テストケース | 検証内容 |
|-------------|---------|
| `test_set_and_get_by_key` | 設定の保存と取得 |
| `test_set_upsert` | 同一キーで上書き |
| `test_get_all` | 複数設定の一括取得 |
| `test_get_by_key_not_found` | 存在しないキー → None |

#### project_repo

| テストケース | 検証内容 |
|-------------|---------|
| `test_insert_and_list_all` | 挿入後に一覧取得、created_at DESC 順 |
| `test_find_by_id` | ID指定取得 |
| `test_find_by_id_not_found` | 存在しないID → エラー |
| `test_delete_cascades_images` | Project削除でGeneratedImageも消える |

#### image_repo

| テストケース | 検証内容 |
|-------------|---------|
| `test_insert_and_list_by_project` | 挿入後にproject_idフィルタ取得 |
| `test_list_by_project_saved_only` | `saved_only: Some(true)` で is_saved=1 のみ |
| `test_update_is_saved` | 個別画像の保存フラグ更新 |
| `test_update_all_is_saved` | プロジェクト内全画像を保存済みに |
| `test_delete` | 個別削除 |
| `test_delete_unsaved` | 未保存画像削除、file_pathリスト返却、保存済みは残存 |

#### genre_repo

| テストケース | 検証内容 |
|-------------|---------|
| `test_list_all_sorted` | sort_order ASC 順 (システムジャンル3件が初期状態) |
| `test_insert` | ユーザージャンル追加 |
| `test_delete_sets_null` | Genre削除でPromptGroup.genre_id が NULL に |

#### prompt_group_repo

| テストケース | 検証内容 |
|-------------|---------|
| `test_list_filter_genre_id` | genre_idフィルタ |
| `test_list_filter_usage_type` | usage_typeフィルタ |
| `test_list_filter_search` | 名前部分一致 |
| `test_list_filter_combined` | 複数フィルタ同時適用 |
| `test_insert_and_find_by_id` | 挿入と取得 |
| `test_update` | フィールド更新 |
| `test_delete` | 削除 (CASCADE でタグも消える) |
| `test_clear_default_for_genre` | 他グループのデフォルトフラグクリア |
| `test_replace_tags` | タグ全置換 (既存タグ削除 + 新規挿入) |

#### vibe_repo

| テストケース | 検証内容 |
|-------------|---------|
| `test_insert_and_list_all` | 挿入と一覧 |
| `test_find_by_id` | ID指定取得 |
| `test_delete_cascades_preset_vibes` | Vibe削除でStylePresetVibeも消える |

#### style_preset_repo

| テストケース | 検証内容 |
|-------------|---------|
| `test_insert_and_list_all` | 挿入と一覧 |
| `test_update` | name, artist_tags 更新 |
| `test_delete` | 削除 (CASCADE で junction も消える) |
| `test_replace_vibe_ids` | Vibe ID全置換 |
| `test_find_vibe_ids_by_preset` | プリセットのVibe ID取得 |

### 4.2 Service テスト

#### settings_service

| テストケース | 検証内容 |
|-------------|---------|
| `test_get_all_settings` | 全設定取得 |
| `test_set_setting` | 設定保存 |

#### project_service

| テストケース | 検証内容 |
|-------------|---------|
| `test_create_project` | ディレクトリ + images/ サブディレクトリ作成確認 (tempdir) |
| `test_open_project_cleans_unsaved` | 未保存画像がクリーンアップされること |
| `test_delete_project` | DB削除 + ディレクトリ削除確認 (tempdir) |

#### image_service

| テストケース | 検証内容 |
|-------------|---------|
| `test_save_image` | is_saved フラグ更新 |
| `test_save_all_images` | プロジェクト内全画像保存 |
| `test_delete_image` | DB削除 + ファイル削除確認 (tempdir) |
| `test_cleanup_unsaved` | 未保存ファイル削除、保存済みファイル残存 (tempdir) |
| `test_cleanup_missing_file` | ファイル不在でもエラーにならない |

#### prompt_group_service

| テストケース | 検証内容 |
|-------------|---------|
| `test_create_with_tags` | グループ + タグ一括作成 |
| `test_update_default_exclusivity` | デフォルトフラグ排他制御 |
| `test_delete_system_group_rejected` | システムグループ削除拒否 |
| `test_delete_user_group` | ユーザーグループ削除成功 |

#### genre_service

| テストケース | 検証内容 |
|-------------|---------|
| `test_create_auto_sort_order` | sort_order自動採番 |
| `test_delete_system_genre_rejected` | システムジャンル削除拒否 |
| `test_delete_user_genre` | ユーザージャンル削除成功 |

#### vibe_service

| テストケース | 検証内容 |
|-------------|---------|
| `test_add_vibe` | ファイルコピー + DB挿入確認 (tempdir) |
| `test_delete_vibe` | DB削除 + ファイル削除確認 (tempdir) |

#### style_preset_service

| テストケース | 検証内容 |
|-------------|---------|
| `test_create_with_vibes` | プリセット + vibe_ids一括作成 |
| `test_update_partial` | 部分更新 (name のみ、vibe_ids のみ) |

#### system_prompt_service

| テストケース | 検証内容 |
|-------------|---------|
| `test_get_categories` | カテゴリ一覧と件数 |
| `test_search_partial_match` | 部分一致検索 |
| `test_search_category_filter` | カテゴリフィルタ |
| `test_search_limit` | 件数制限 |

#### estimate_cost

| テストケース | 検証内容 |
|-------------|---------|
| `test_txt2img_basic` | 基本コスト計算 |
| `test_opus_free` | Opus無料条件 |
| `test_with_vibes` | Vibe追加コスト |
| `test_with_char_ref` | CharRef追加コスト |

### 4.3 Frontend テスト (`lib/cost.ts`)

| テストケース | 検証内容 |
|-------------|---------|
| `txt2img basic cost` | 832×1216, 23steps の基本コスト |
| `opus free generation` | Opus tier, ≤1024×1024, ≤28steps → cost 0 |
| `vibe cost added` | 5+ vibes で追加コスト発生 |
| `char ref cost added` | CharRef使用時の追加コスト |

---

## 5. テスト構成

### ファイル配置

```
src-tauri/src/
├── test_utils.rs              # 共通ユーティリティ (#[cfg(test)])
├── repositories/
│   ├── settings.rs            # 末尾に #[cfg(test)] mod tests
│   ├── project.rs             # 同上
│   ├── image.rs
│   ├── genre.rs
│   ├── prompt_group.rs
│   ├── vibe.rs
│   └── style_preset.rs
├── services/
│   ├── settings.rs            # 末尾に #[cfg(test)] mod tests
│   ├── project.rs             # 同上
│   ├── image.rs
│   ├── prompt_group.rs
│   ├── genre.rs
│   ├── vibe.rs
│   ├── style_preset.rs
│   ├── system_prompt.rs
│   └── generation.rs          # estimate_cost のみテスト

src/
├── lib/
│   ├── cost.ts
│   └── __tests__/
│       └── cost.test.ts       # Vitest
```

### 命名規則

- Rust: `test_<関数名>_<シナリオ>` (例: `test_delete_project_cascades_images`)
- TypeScript: `describe("<関数名>") → it("<シナリオ>")` 

### 300行ルール

テストモジュールが300行を超えたら `tests/` ディレクトリに分離:

```rust
// repositories/prompt_group.rs のテストが300行超過した場合:
// → tests/repositories/prompt_group_tests.rs に移動
```

---

## 6. テスト優先順位

### Phase 1: データ整合性 (最優先)

1. Repository テスト全7モジュール
2. Service テスト: settings, project, image

### Phase 2: ビジネスロジック

3. Service テスト: prompt_group, genre (デフォルト排他・is_system保護)
4. Service テスト: vibe, style_preset (ファイルI/O)
5. Service テスト: system_prompt, estimate_cost

### Phase 3: フロントエンド

6. `lib/cost.ts` テスト

---

## 7. テストしないもの

| 対象 | 理由 |
|------|------|
| Command 層 | thin wrapper。Service テストでカバー |
| novelai-api crate | 独自テストスイートあり |
| Row → DTO 変換 | トリビアルなマッピング |
| Frontend Stores / UI | IPC依存。手動テストで十分 |
| 並行アクセス | シングルユーザーデスクトップアプリ |
| generate_image / encode_vibe | API呼び出し含む。crate側でカバー |

---

## 8. テスト実行コマンド

```bash
# Rust 全テスト
cargo test --manifest-path src-tauri/Cargo.toml

# 特定モジュール
cargo test --manifest-path src-tauri/Cargo.toml repositories::settings

# Frontend テスト
npx vitest run src/lib/__tests__/cost.test.ts
```

---

## 変更履歴

| 日付 | 内容 |
|------|------|
| 2026-04-07 | 初版作成 |
