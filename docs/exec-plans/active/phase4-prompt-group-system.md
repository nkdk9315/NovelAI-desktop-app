# 実行プラン: Phase 4 - プロンプトグループシステム (F4, F5, F7)

## 概要
- **目標**: ジャンル管理、プロンプトグループCRUD、システムプロンプト（danbooru タグ検索・オートコンプリート）を実装
- **背景**: Phase 3 (キャラクターシステム) 完了後の次段階。キャラクター追加時にデフォルトグループを自動適用する機能も含む
- **作成日**: 2026-04-08
- **見積ステップ数**: 8
- **ブランチ**: `feat/phase4-prompt-group-system`

## ステップ

### Step 1: Rust バックエンド - Genre Repository テスト & Service 実装 ✅
- **内容**:
  - `repositories/genre.rs` にテスト追加: `test_list_all_sorted`, `test_insert`, `test_delete_sets_null`
  - `services/genre.rs` の `create_genre`, `delete_genre` を実装（todo!() → 実コード）
  - `services/genre.rs` にテスト追加: `test_create_auto_sort_order`, `test_delete_system_genre_rejected`, `test_delete_user_genre`
  - `test_utils.rs` に `create_test_genre` ヘルパー追加
- **受け入れ基準**:
  - `cargo test repositories::genre` 全テスト通過
  - `cargo test services::genre` 全テスト通過
  - システムジャンル削除拒否のバリデーション動作
- **依存**: なし

### Step 2: Rust バックエンド - PromptGroup Repository テスト & Service 実装 ✅
- **内容**:
  - `repositories/prompt_group.rs` にテスト追加: `test_list_filter_genre_id`, `test_list_filter_usage_type`, `test_list_filter_search`, `test_list_filter_combined`, `test_insert_and_find_by_id`, `test_update`, `test_delete`, `test_clear_default_for_genre`, `test_replace_tags`
  - `services/prompt_group.rs` の全 todo!() を実装
  - `services/prompt_group.rs` にテスト追加: `test_create_with_tags`, `test_update_default_exclusivity`, `test_delete_system_group_rejected`, `test_delete_user_group`
  - `test_utils.rs` に `create_test_prompt_group` ヘルパー追加
- **受け入れ基準**:
  - `cargo test repositories::prompt_group` 全テスト通過
  - `cargo test services::prompt_group` 全テスト通過
  - フィルタリング（genre_id, usage_type, search）が正しく動作
  - デフォルトフラグ排他制御が動作
- **依存**: Step 1 (create_test_genre ヘルパーを使用)

### Step 3: Rust バックエンド - SystemPrompt Service 実装 & テスト ✅
- **内容**:
  - danbooru_tags.csv のバンドル設定 (tauri.conf.json の resources 設定)
  - CSV ローダー実装 (lib.rs の setup 内で SystemPromptDB を構築)
  - `services/system_prompt.rs` の `get_categories`, `search_system_prompts` を実装
  - テスト用の小さな CSV データで `test_get_categories`, `test_search_partial_match`, `test_search_category_filter`, `test_search_limit` を実装
- **受け入れ基準**:
  - `cargo test services::system_prompt` 全テスト通過
  - カテゴリ名マッピングが contracts.md の仕様通り
  - 部分一致検索が動作（大文字小文字区別なし）
- **依存**: なし

### Step 4: Rust バックエンド - ビルド確認 & clippy 通過 ✅
- **内容**:
  - `cargo clippy --all-targets` で警告ゼロ確認
  - `cargo test` 全テスト通過確認
  - Step 1-3 で追加した全コードのレビュー・調整
- **受け入れ基準**:
  - `cargo clippy --all-targets` 警告なし
  - `cargo test` 全テスト通過
  - 300行制限を遵守
- **依存**: Step 1, 2, 3

### Step 5: Frontend - prompt-group-store テスト & 実装確認 ✅
- **内容**:
  - `src/stores/__tests__/prompt-store.test.ts` 作成: store の状態管理ロジックテスト
  - `prompt-store.ts` の IPC 依存部分をモック化してテスト
  - テスト対象: loadGenres, createGenre, deleteGenre, loadPromptGroups, createPromptGroup, updatePromptGroup, deletePromptGroup
- **受け入れ基準**:
  - `npm run test -- src/stores/__tests__/prompt-store.test.ts` 通過
  - Store の全アクションが正しく状態を更新
- **依存**: なし

### Step 6: Frontend - PromptGroupPicker & PromptGroupModal 実装 ✅
- **内容**:
  - `PromptGroupPicker.tsx`: ジャンル別プロンプトグループ選択 Popover 実装
    - ジャンルタブでフィルタ
    - グループクリックでタグをプロンプトに追加
  - `PromptGroupModal.tsx` (PromptGroupManager): Dialog 実装
    - ジャンルタブ、グループ一覧、グループ作成/編集/削除フォーム
    - タグの追加/削除/並び替え UI
  - i18n の promptGroup セクション拡充
  - `MainPromptSection.tsx` に PromptGroupPicker を統合
- **受け入れ基準**:
  - PromptGroupPicker でグループ選択 → タグがプロンプトに追加される
  - PromptGroupModal で CRUD 操作が可能
  - i18n 対応（ja/en）
  - `npm run build` 成功
- **依存**: Step 4 (バックエンド実装完了), Step 5

### Step 7: Frontend - オートコンプリート統合 & キャラクターデフォルトグループ ✅
- **内容**:
  - `PromptTextarea.tsx` にオートコンプリートドロップダウン統合
    - `use-autocomplete` フック使用
    - 入力中にシステムプロンプト候補を表示
    - 候補選択でタグを挿入
  - `CharacterAddButtons.tsx` / `generation-params-store.ts` 修正
    - キャラクター追加時にジャンルのデフォルトグループを取得
    - デフォルトグループのタグをキャラクターのプロンプトに自動挿入
- **受け入れ基準**:
  - プロンプト入力時にオートコンプリート候補が表示される
  - 候補選択でタグが挿入される
  - キャラクター追加時にデフォルトグループのタグが自動適用される
  - `npm run build` 成功
- **依存**: Step 6

### Step 8: 全体ビルド・テスト・lint 通過確認 ✅
- **内容**:
  - `cargo test` 全通過
  - `cargo clippy --all-targets` 警告なし
  - `npm run test` 全通過
  - `npm run build` 成功
  - `npm run lint` 通過
  - implementation-plan.md の Phase 4 チェックボックスを完了マーク
- **受け入れ基準**:
  - CI 相当の全チェック通過
  - implementation-plan.md 更新済み
- **依存**: Step 7

## 意思決定ログ
| 日付 | 判断 | 理由 |
|------|------|------|
| 2026-04-08 | テストファースト方針 | contracts.md / test-strategy.md に定義済みのテストケースを先に書いてから実装する |
| 2026-04-08 | danbooru CSV はテスト用小規模データで単体テスト | 本番 CSV (167k件) はビルド時にバンドル。テストではインメモリの小規模データを使用 |
| 2026-04-08 | ブランチ名: feat/phase4-prompt-group-system | Phase 3 の命名慣例に従う |

## チェックポイント（最終更新: 2026-04-08）
- **現在のステップ**: 全ステップ完了
- **作業中のファイル**: -
- **次にやること**: コミット → PR 作成
- **ブロッカー**: なし
