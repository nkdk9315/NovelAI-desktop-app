# テスト戦略

## 1. テスト方針

| レイヤー | テスト | 手法 | 理由 |
|---------|--------|------|------|
| Repository | する | インメモリSQLite | SQL正確性の検証。ROI最高 |
| Service (DB系) | する | インメモリSQLite + tempdir | ビジネスロジック + ファイルI/O |
| Service (API系) | しない | — | novelai-api crate側でテスト済み |
| Command | しない | — | thin wrapper、Service テストでカバー |
| Frontend (`lib/cost.ts`) | する | Vitest | 純粋関数、コスト計算の正確性 |
| Frontend (Stores) | する | Vitest | Zustand storeの状態管理ロジック検証 |
| Frontend (UI) | する | Vitest + Testing Library | コンポーネントの描画・操作の検証 |

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
| `test_replace_tags` | タグ全置換 (既存タグ削除 + 新規挿入、negative_prompt 保存確認) |

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
| `test_open_project_keeps_unsaved` | 未保存画像が削除されずに残ること |
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
| `test_create_with_tags` | グループ + タグ一括作成 (negative_prompt 含む) |
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

#### generation_service — キャラクター参照・スナップショット (`services/generation_tests.rs`)

| テストケース | 検証内容 |
|-------------|---------|
| `test_char_ref_valid_on_v45` | V4.5 + `character&style` は検証通過 |
| `test_char_ref_rejected_on_v5` | V5 モデルでのキャラ参照は Validation エラー |
| `test_char_ref_rejected_with_vibes` | Vibe との併用は Validation エラー |
| `test_char_ref_invalid_mode_or_strength` | 不正 mode（`face`）/ 範囲外 strength（1.5）を拒否 |
| `test_snapshot_records_action_without_image_data` | `action_summary(Infill)` が type / strength を記録し、画像・マスクのバイト列を含まない |

#### image_output (`services/image_output.rs`)

| テストケース | 検証内容 |
|-------------|---------|
| `detects_formats` | マジックバイトから PNG / JPEG / WebP を判定、GIF は `bin` |
| `decode_base64_strips_data_url_prefix` | `data:...;base64,` 接頭辞の除去、不正 base64 はエラー |
| `read_image_file_rejects_non_images` | `.txt` と存在しないファイルは Validation、大文字拡張子 `.PNG` は読込可 (tempdir) |

#### image_tools (`services/image_tools.rs`)

| テストケース | 検証内容 |
|-------------|---------|
| `accepts_all_official_tools` | 公式 7 ツールを受理（emotion はキーワード + defry 0） |
| `rejects_unknown_tool_and_bad_options` | 未知ツール、defry > 5、emotion のキーワード欠落 / 空白のみを拒否 |
| `pixel_limits` | Upscale 入力 1024×1024 は可、1024×1088 は超過 |

#### image_metadata (`services/image_metadata_tests.rs`)

| テストケース | 検証内容 |
|-------------|---------|
| `reads_text_chunks` | tEXt の `Source` / `Comment` を読み、Comment JSON（prompt・reference_image_multiple）を返す |
| `reads_compressed_chunks` | zTXt（zlib）と非圧縮 iTXt の Comment を読める |
| `reads_stealth_alpha_metadata` | alpha LSB（列優先）に埋め込んだ `stealth_pngcomp` + gzip JSON から Source / Comment を復元 |
| `images_without_metadata_return_none` | メタデータ無し PNG・非 PNG・Comment が JSON オブジェクトでない場合は None |
| `truncated_chunks_do_not_panic` | 長さが範囲外のチャンクで panic せず空を返す |
| `text_chunks_are_utf8` | tEXt を UTF-8 として読む（日本語プロンプト） |
| `real_image` (`#[ignore]`) | 手動確認用。`NAI_IMAGE=/path/to.png cargo test real_image -- --ignored` で実画像の v4_prompt を確認 |

#### vibe_import (`services/vibe_import.rs`)

| テストケース | 検証内容 |
|-------------|---------|
| `validates_model_and_encoding` | 対応モデルキーのみ受理（v5full は拒否）、空・非 base64 エンコーディング、範囲外 strength を拒否 |
| `imports_readable_vibe_and_deduplicates` | 書き出した .naiv4vibe を `load_vibe_file` / `extract_encoding` で読める。同一モデル + 同一エンコーディングは `existed = true` で同じ id、別モデルなら新規 (tempdir) |

### 4.3 Frontend テスト (`lib/cost.ts`)

| テストケース | 検証内容 |
|-------------|---------|
| `txt2img basic cost` | 832×1216, 23steps の基本コスト |
| `opus free generation` | Opus tier, ≤1024×1024, ≤28steps → cost 0 |
| `vibe cost added` | 5+ vibes で追加コスト発生 |
| `char ref cost added` | CharRef使用時の追加コスト |
| `img2img scales the cost by strength` | img2img は strength 倍 |
| `txt2img ignores strength` | txt2img では strength を無視 |
| `small inpaint areas are billed as ~1MP and ignore vibes` | 小領域 inpaint の 1MP 換算、Vibe 課金なし |
| `vibes are not billed with a character reference` | キャラ参照ありで Vibe 課金なし |
| `calculateAugmentCost: small images are expanded to 1MP and free for Opus` | 小画像を 1MP へ拡大、Opus 無料 |
| `calculateAugmentCost: 832x1216 is enlarged to just under 1MP and stays Opus-free` | 公式の切り捨て拡大ロジック |
| `calculateAugmentCost: bg-removal is always billed with the multiplier` | bg-removal は ×3 + 5、Opus 無料対象外 |
| `calculateUpscaleCost: uses the pixel table and rejects >1MP inputs` | ピクセルテーブル、1MP 超は null |

### 4.4 Frontend テスト (`lib/image-size.ts` / `lib/mask-grid.ts` / `lib/history-action.ts`)

| テストケース | 検証内容 |
|-------------|---------|
| `fitGenerationSize: keeps valid sizes` | 有効サイズはそのまま |
| `fitGenerationSize: snaps to multiples of 64` | 64 の倍数に丸め |
| `fitGenerationSize: shrinks oversized images within the pixel budget` | ピクセル上限内に縮小 |
| `fitGenerationSize: clamps extreme aspect ratios to 2048 per side` | 極端な比率は各辺 2048 でクランプ |
| `enhanceSize: enlarges by the magnitude and respects the limits` | 倍率拡大 + 上限遵守 |
| `alphaToMaskCells: maps painted pixels to 1/8 cells` | 描画ピクセル → 1/8 セル |
| `alphaToMaskCells: scales between source and target sizes` | ソース / 生成サイズ間のスケーリング |
| `alphaToMaskCells: ignores faint strokes below the threshold` | 閾値未満の薄いストロークを無視 |
| `historyActionOf: defaults to generate for legacy snapshots` | action なし / null は generate |
| `historyActionOf: reads img2img / infill / tools` | img2img / infill / augment(tool) の判定、`isToolOutput` |

### 4.6 Frontend テスト (`lib/artist-extract.ts`)

| テスト | 内容 |
|--------|------|
| reads weights in every syntax | `0.3::artist:x::` / `artist#x` / `{0.33::artist:x ::}` / `{{}}` `[]` / 複数項目ブロック / 入れ子の重み |
| removes artists and cleans up empty blocks | 除去後に空ブロック・余分なカンマが残らない。混在ブロックは他の項目を残す |
| keeps artists the caller does not remove | 選ばれなかったアーティストは本文に残る |
| does not treat numbers inside words as weights | `1girl` / `2boys` を重みと誤認しない |
| reads artist# groups up to the end of their block | `0.8::artist#a, b, ::` の 2 件を抽出・部分除去時のマーカー移動 |
| never glues a name ending in a digit to a close | `2equal8, ::` を `2equal8 ::` に整形（`8::` にしない） |
| keeps line breaks | 行末のカンマと改行を保持 |

`metadata-import-prefs.test.ts`: 既定値（settings / seed / withImage OFF、append）、保存値のマージと不正値の無視、
prefs → チェックリスト、画像に無い項目は前回値を保持。`nai-metadata.test.ts`: `isImageBase64`（未エンコード Vibe 判定）。
Rust `image_metadata_tests`: `prefers_stealth_copy_when_chunks_lack_vibes`。

### 4.5 Frontend テスト (`lib/nai-metadata.ts`)

| テストケース | 検証内容 |
|-------------|---------|
| `modelFromSource: uses known hashes and falls back to the version text` | 既知ハッシュ → モデル、無ければ V5 / V4.5 / V4 + curated 判定、不明・null は null |
| `prompt splitting: splits on top-level commas only` | 括弧内のカンマでは分割しない |
| `prompt splitting: parses artist tag formats` | `artist:x` / `{w::artist:x ::}` / `w::artist:x ::` / `{{}}` / `[]` の強度変換、非アーティスト・括弧不一致は null |
| `prompt splitting: separates artist tags and the quality suffix` | アーティストタグと QUALITY_TAGS 接尾辞の分離 |
| `prompt splitting: detects negative presets` | 先頭のネガティブプリセット検出（完全一致 / 接頭辞 / 無し） |
| `parseMetadata: extracts prompt, characters, vibes and settings` | v4_prompt 優先、キャラ位置・ネガティブ、Vibe（strength / information_extracted）、設定・seed、`vibeModelKey` |
| `parseMetadata: falls back to legacy fields and ignores unknown values` | prompt / uc へのフォールバック、未知 sampler は無視、モデル不明なら Vibe キー null |
| `parseMetadata: reads a character reference` | director_reference_* → imageBase64 / strength / fidelity（= 1 − secondary）/ mode |

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
│   ├── generation_tests.rs    # validate_generate_request / estimate_cost / snapshot
│   ├── image_output.rs        # 末尾に #[cfg(test)] mod tests（形式判定・base64・ファイル読込制限）
│   ├── image_tools.rs         # 同上（augment 検証・ピクセル上限）
│   ├── image_metadata_tests.rs # PNG テキストチャンク / stealth alpha メタデータ
│   └── vibe_import.rs         # 末尾に #[cfg(test)] mod tests（検証・重複排除）

src/
├── lib/
│   ├── cost.ts
│   └── __tests__/
│       ├── cost.test.ts       # Vitest
│       ├── image-size.test.ts # fitGenerationSize / enhanceSize / alphaToMaskCells
│       ├── history-action.test.ts
│       ├── artist-extract.test.ts # 重み構文からのアーティスト抽出・除去
│       └── nai-metadata.test.ts # メタデータのパース・プロンプト分割
├── stores/
│   └── __tests__/
│       └── generation-params-store.test.ts  # Vitest
├── components/
│   └── left-panel/
│       └── __tests__/
│           ├── CharacterAddButtons.test.tsx  # Vitest + Testing Library
│           └── CharacterSection.test.tsx     # Vitest + Testing Library
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
7. Store テスト: generation-params-store (characters CRUD)
8. Store テスト: sidebar-prompt-store (negativeOverride 設定・クリア)
9. `lib/prompt-assembly.ts` テスト: assembleNegativeFromGroups (有効タグ収集、空スキップ、randomMode)
10. UI テスト: CharacterAddButtons, CharacterSection (描画・操作)

---

## 7. テストしないもの

| 対象 | 理由 |
|------|------|
| Command 層 | thin wrapper。Service テストでカバー |
| novelai-api crate | 独自テストスイートあり |
| Row → DTO 変換 | トリビアルなマッピング |
| Frontend Stores / UI (IPC依存部分) | IPC呼び出し部分は手動テストで十分。状態管理ロジック・描画・操作はVitest + Testing Library |
| 並行アクセス | シングルユーザーデスクトップアプリ |
| generate_image / encode_vibe | API呼び出し含む。crate側でカバー |
| augment_image / upscale_image 本体 | API呼び出し含む。入力検証（`validate_augment_request` / ピクセル上限）のみテスト |
| キャンバスエディタ描画 | Canvas API 依存。マスク縮約ロジック（`alphaToMaskCells`）のみテスト |
| `applyMetadata` / MetadataImportPanel | 各 store への反映と IPC のみ。パース（`nai-metadata.ts`）をテスト |

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
| 2026-04-07 | Frontend Stores/UIテスト方針追加 (Phase 3対応) |
| 2026-09-26 | Img2Img / Inpaint / キャラ参照 / Director Tools / Upscale — generation_tests（char ref・snapshot）、image_output / image_tools、cost.test.ts 追加分、image-size / history-action テスト追加 |
| 2026-09-26 | 画像メタデータ取り込み — image_metadata_tests、vibe_import、nai-metadata.test.ts 追加 |
