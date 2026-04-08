# 実行プラン: Phase 5 - Vibe & スタイルプリセット (F8, F9)

## 概要
- **目標**: Vibeインポート/管理、スタイルプリセットCRUD、生成時のVibe統合を実装
- **背景**: Phase 4 (プロンプトグループ) 完了後の最終フェーズ。.naiv4vibeファイルのインポート・削除、スタイルプリセット(アーティストタグ + Vibe組み合わせ)の管理、画像生成時のVibe統合を含む
- **作成日**: 2026-04-08
- **見積ステップ数**: 10
- **ブランチ**: `feat/phase5-vibe-style`

## ステップ

### Step 1: Rust バックエンド - Vibe Repository テスト ✅
- **内容**:
  - `repositories/vibe.rs` にテスト追加:
    - `test_insert_and_list_all`: Vibe挿入後に一覧取得、created_at DESC順
    - `test_find_by_id`: ID指定取得
    - `test_delete_cascades_preset_vibes`: Vibe削除でstyle_preset_vibesも消える
  - `test_utils.rs` に `create_test_vibe` ヘルパー追加
- **受け入れ基準**:
  - `cargo test repositories::vibe` 全テスト通過
  - CASCADE削除が正しく動作
- **依存**: なし

### Step 2: Rust バックエンド - StylePreset Repository テスト ✅
- **内容**:
  - `repositories/style_preset.rs` にテスト追加:
    - `test_insert_and_list_all`: プリセット挿入と一覧取得
    - `test_update`: name, artist_tags更新
    - `test_delete`: 削除 (CASCADEでjunctionも消える)
    - `test_replace_vibe_ids`: Vibe ID全置換
    - `test_find_vibe_ids_by_preset`: プリセットのVibe ID取得
  - `test_utils.rs` に `create_test_style_preset` ヘルパー追加
- **受け入れ基準**:
  - `cargo test repositories::style_preset` 全テスト通過
  - replace_vibe_idsが既存IDを削除して新規IDを挿入
- **依存**: Step 1 (create_test_vibeヘルパーを使用)

### Step 3: Rust バックエンド - Vibe Service 実装 & テスト ✅
- **内容**:
  - `services/vibe.rs` の `add_vibe` 実装:
    - .naiv4vibeファイルを `$APPDATA/novelai-desktop/vibes/` にコピー
    - ファイル内容解析 → モデル情報取得 (novelai_api::utils::vibe::load_vibe_file + extract_encoding)
    - UUID生成、vibe_repo::insert
  - `services/vibe.rs` の `delete_vibe` 実装:
    - vibe_repo::find_by_id → file_path取得
    - vibe_repo::delete (CASCADE)
    - fs::remove_file
  - `encode_vibe` はAPI呼び出しのためテスト対象外 (todo!()のまま or 最小限実装)
  - テスト追加:
    - `test_add_vibe`: ファイルコピー + DB挿入確認 (tempdir)
    - `test_delete_vibe`: DB削除 + ファイル削除確認 (tempdir)
- **受け入れ基準**:
  - `cargo test services::vibe` 全テスト通過
  - add_vibeがファイルをvibesディレクトリにコピー
  - delete_vibeがDB + ファイル両方を削除
- **依存**: Step 1

### Step 4: Rust バックエンド - StylePreset Service 実装 & テスト ✅
- **内容**:
  - `services/style_preset.rs` の `create_style_preset` 実装:
    - UUID生成、artist_tags → JSON文字列化
    - style_preset_repo::insert + replace_vibe_ids
  - `services/style_preset.rs` の `update_style_preset` 実装:
    - find_by_id → 既存取得
    - name/artist_tags更新 → update
    - vibe_idsがSomeの場合: replace_vibe_ids
  - `services/style_preset.rs` の `delete_style_preset` 実装:
    - style_preset_repo::delete
  - テスト追加:
    - `test_create_with_vibes`: プリセット + vibe_ids一括作成
    - `test_update_partial`: 部分更新 (nameのみ、vibe_idsのみ)
- **受け入れ基準**:
  - `cargo test services::style_preset` 全テスト通過
  - create_style_presetがJSON文字列としてartist_tagsを保存
  - update_style_presetが部分更新に対応
- **依存**: Step 1, 2

### Step 5: Rust バックエンド - Commands 修正 & ビルド確認 ✅
- **内容**:
  - `commands/vibes.rs` の `add_vibe` で `app_handle.path().app_data_dir()` を正しく使用
  - `commands/vibes.rs` の `encode_vibe` で `app_handle.path().app_data_dir()` を正しく使用
  - `encode_vibe` service の最小限実装 (API呼び出しはcrate依存、基本構造のみ)
  - `cargo clippy --all-targets` 警告ゼロ確認
  - `cargo test` 全テスト通過確認
- **受け入れ基準**:
  - `cargo clippy --all-targets` 警告なし
  - `cargo test` 全テスト通過
  - 300行制限を遵守
- **依存**: Step 1, 2, 3, 4

### Step 6: Frontend - generation-params-store 拡張 & テスト ✅
- **内容**:
  - `generation-params-store.ts` に Vibe & スタイル関連の状態追加:
    - `selectedVibes: SelectedVibe[]` (vibeId, strength, infoExtracted, enabled)
    - `artistTags: string[]`
    - `selectedStylePresetId: string | null`
  - アクション追加:
    - `addVibe(vibeId)` / `removeVibe(vibeId)` / `toggleVibe(vibeId)`
    - `updateVibeStrength(vibeId, strength)` / `updateVibeInfoExtracted(vibeId, infoExtracted)`
    - `setArtistTags(tags)` / `setStylePreset(presetId)` / `clearStylePreset()`
    - `applyStylePreset(preset: StylePresetDto, vibes: VibeDto[])` → artistTags + selectedVibes同時設定
  - `src/stores/__tests__/generation-params-store.test.ts` にVibe関連テスト追加:
    - `test_add_remove_vibe`, `test_toggle_vibe`, `test_update_vibe_strength`
    - `test_apply_style_preset`, `test_max_vibes_limit` (MAX_VIBES = 10)
- **受け入れ基準**:
  - `npm run test -- src/stores/__tests__/generation-params-store.test.ts` 通過
  - MAX_VIBES制限が動作
  - applyStylePresetがartistTagsとselectedVibesを同時更新
- **依存**: なし (フロントエンド独立)

### Step 7: Frontend - VibeSection 実装 ✅
- **内容**:
  - `VibeSection.tsx` の実装:
    - Vibe一覧表示 (ipc.listVibes で取得)
    - ON/OFFトグル (Checkbox or Switch)
    - strengthスライダー (0.0-1.0, デフォルト 0.7)
    - information_extractedスライダー (0.0-1.0, デフォルト 0.7)
    - 「Vibeを管理」ボタン → VibeModal表示
  - generation-params-storeとの連携
  - i18n の vibe セクション追加 (ja.json, en.json)
- **受け入れ基準**:
  - VibeSectionにVibe一覧が表示される
  - スライダー操作でstoreが更新される
  - ON/OFFトグルが動作
- **依存**: Step 6

### Step 8: Frontend - VibeModal 実装 ✅
- **内容**:
  - `VibeModal.tsx` を shadcn/ui Dialog ベースで実装:
    - Vibe一覧表示 (名前、モデル、作成日)
    - インポートボタン → ファイルピッカー (.naiv4vibe) → ipc.addVibe
    - 削除ボタン → 確認ダイアログ → ipc.deleteVibe
    - (encode_vibeはUIボタンを用意するが、バックエンドが未完成の場合はdisabled)
  - Tauri file dialog pluginの設定確認・追加 (tauri.conf.json)
  - i18n の vibeModal セクション追加
- **受け入れ基準**:
  - VibeModalが正しく開閉する (Dialog)
  - .naiv4vibeファイルのインポートが動作
  - Vibe削除が動作
- **依存**: Step 5 (バックエンドAPI必要)

### Step 9: Frontend - ArtistStyleSection & StylePresetModal 実装 ✅
- **内容**:
  - `ArtistStyleSection.tsx` の実装:
    - アーティストタグ入力 (オートコンプリート付き、system_promptsのcategory=1で検索)
    - スタイルプリセット選択ドロップダウン
    - 「プリセット管理」ボタン → StylePresetModal表示
    - プリセット選択時: applyStylePreset でartistTags + Vibes同時適用
  - `StylePresetModal.tsx` を shadcn/ui Dialog ベースで実装:
    - プリセット一覧 (名前、アーティストタグ、関連Vibe数)
    - 作成フォーム (名前, アーティストタグ入力, Vibe選択チェックリスト)
    - 編集フォーム (既存値をプリフィル)
    - 削除ボタン → 確認ダイアログ
  - i18n の stylePreset セクション追加
- **受け入れ基準**:
  - アーティストタグのオートコンプリート動作 (category=1: Artist)
  - スタイルプリセットの作成/編集/削除が動作
  - プリセット適用でartistTags + selectedVibesが同時反映
- **依存**: Step 6, 7, 8

### Step 10: 生成統合 & 最終確認 ✅
- **内容**:
  - `services/generation.rs` の `generate_image` でVibe統合:
    - req.vibes → vibe_repo::find_by_id × N → VibeRow.file_path
    - VibeConfig { item: VibeItem::FilePath, strength, info_extracted } 構築
    - GenerateParams builderにvibes設定
  - GenerateImageRequest のフロントエンド送信:
    - selectedVibes (enabled=true) → vibes配列構築
    - artistTags → プロンプトに付加
  - `npm run build` 成功確認
  - `cargo clippy --all-targets` 警告なし
  - `cargo test` + `npm run test` 全通過
  - implementation-plan.md の Phase 5 チェックボックスを完了マーク
- **受け入れ基準**:
  - Vibeが画像生成パラメータに統合される
  - アーティストタグがプロンプトに反映される
  - 全テスト通過、lint通過、ビルド成功
- **依存**: Step 5, 9

## 意思決定ログ
| 日付 | 判断 | 理由 |
|------|------|------|
| 2026-04-08 | encode_vibeはtodo!()のまま最小限実装 | API呼び出しが必要でテスト困難。UIボタンは用意するがdisabled可 |
| 2026-04-08 | テストファースト: Step 1-2でrepo テスト、Step 3-4でserviceテストを先行 | contracts/test-strategy.mdの方針に従い、ROI最高のrepoテストから着手 |
| 2026-04-08 | フロントエンドStoreテスト(Step 6)をUI実装(Step 7-9)より先に | 状態管理ロジックの正確性を先に検証してからUI構築 |

## チェックポイント（最終更新: 2026-04-08）
- **現在のステップ**: 全10ステップ完了 ✅
- **作業中のファイル**: なし
- **次にやること**: PRレビュー & マージ
- **ブロッカー**: なし
