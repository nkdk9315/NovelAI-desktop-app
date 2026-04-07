# 実行プラン: Phase 2 — コア生成機能 (F2, F3)

## 概要
- **目標**: メインプロンプト入力 → 画像生成 → 表示 → 履歴のフルスタック垂直スライスを完成させる。コスト計算、3パネルUIを含む
- **背景**: Phase 0 (UI Scaffold) + Phase 1 (プロジェクト基盤) 完了済み。Rust 側は Settings/Project の CRUD が動作し、フロントエンドは ProjectListPage・SettingsDialog・Header が機能する状態。Generation 関連は commands 層の骨格のみ（service 層に `todo!()` が残っている）
- **作成日**: 2026-04-07
- **見積ステップ数**: 11

## 現状分析

### 実装済み（Phase 1 完了時点）
- Tauri 2 + React プロジェクト初期化、AppState 登録済み
- `error.rs`, `db.rs`, `migrations/001_init.sql` 完成
- Settings: commands/services/repositories 完成
- Project: commands/services/repositories 完成
- Frontend: types, lib/ipc, lib/constants, stores (settings, project, generation-params)
- Frontend: ProjectListPage, SettingsDialog, Header (AnlasDisplay, ModelSelector, SizeSelector, ParamControls)
- `commands/images.rs`: 骨格のみ（service 層が `todo!()`）

### 未実装（Phase 2 スコープ）
- `models/dto.rs`: 画像生成関連の Request/Response DTO
- `repositories/image.rs`: generated_images テーブル CRUD
- `services/generation.rs`: パラメータ組立、API 呼出、ファイル書込、DB 挿入
- `services/image.rs`: save/delete/get/cleanup
- `commands/images.rs`: 7 IPC エントリポイント実装
- Frontend: generation-store, history-store
- Frontend: lib/cost (Anlas コスト計算)
- Frontend: 3パネル UI (LeftPanel, CenterPanel, RightPanel)
- Frontend: GenerationPage レイアウト
- Frontend: CostDisplay

## ステップ

### Step 1: Rust models/dto — 画像生成関連 DTO 追加 ✅
- **内容**: GenerateImageRequest, GenerateActionRequest, CharacterRequest, VibeReference, CostEstimateRequest (Request 側) と GenerateImageResponse, GeneratedImageDto, GeneratedImageRow, CostResultDto (Response 側) を追加
- **受け入れ基準**:
  - 全 DTO に `#[serde(rename_all = "camelCase")]` 適用
  - `GenerateActionRequest` は `Generate | Img2Img | Infill` の enum
  - `GeneratedImageRow` (DB 行) と `GeneratedImageDto` (IPC 用) を分離。`is_saved` は Row が i32、Dto が bool
  - `CostResultDto` に `total_cost: u64` と `is_opus_free: bool`
- **依存**: なし
- **対象ファイル**: `src-tauri/src/models/dto.rs`

### Step 2: Rust repositories/image — generated_images CRUD ✅
- **内容**: `list_by_project`, `find_by_id`, `insert`, `update_is_saved`, `update_all_is_saved`, `delete`, `delete_unsaved` の 7 関数を実装
- **受け入れ基準**:
  - `list_by_project` は `saved_only` フィルタ対応（`WHERE is_saved = 1` 条件付き）
  - `delete_unsaved` は未保存画像のパス一覧を返してから DB 削除
  - パラメータバインド使用（SQL インジェクション防止）
  - 6 件のユニットテスト
- **依存**: Step 1
- **対象ファイル**: `src-tauri/src/repositories/image.rs`

### Step 3: Rust services/generation — 画像生成パイプライン ✅
- **内容**: `generate_image` (async) と `estimate_cost` を実装
- **受け入れ基準**:
  - `generate_image`: 入力バリデーション (model/sampler/noise_schedule の `.parse()`) → パラメータ組立 (GenerateParams builder) → API 呼出 (tokio::sync::Mutex 経由) → ファイル書込 → Base64 エンコード → DB 挿入 → レスポンス返却
  - `AppState.api_client` を `tokio::sync::Mutex` に変更（async で `.await` 越しにロック保持が必要）
  - Vibe 参照は DB から vibe_row を取得してファイルパスを解決
  - `estimate_cost`: `novelai_api::anlas::calculate_generation_cost` をラップ
  - 4 件のユニットテスト (basic, opus_free, vibes, char_ref)
- **依存**: Step 1, Step 2
- **対象ファイル**: `src-tauri/src/services/generation.rs`, `src-tauri/src/state.rs`, `src-tauri/src/lib.rs`

### Step 4: Rust services/image — 画像管理操作 ✅
- **内容**: `save_image`, `save_all_images`, `delete_image`, `get_project_images`, `cleanup_unsaved_images` を実装
- **受け入れ基準**:
  - `delete_image`: DB レコード削除 + ファイル削除（ファイル不在時は graceful に処理）
  - `cleanup_unsaved_images`: 未保存画像のファイル削除 + DB 一括削除
  - `get_project_images`: `saved_only` フィルタ対応
  - 5 件のユニットテスト
- **依存**: Step 2
- **対象ファイル**: `src-tauri/src/services/image.rs`

### Step 5: Rust commands/images — IPC エントリポイント実装 ✅
- **内容**: 7 つの Tauri コマンドを実装: `generate_image` (async), `estimate_cost`, `save_image`, `save_all_images`, `delete_image`, `get_project_images`, `cleanup_unsaved_images`
- **受け入れ基準**:
  - 全コマンドが AppState から db/api_client を取得して service 層に委譲
  - エラーは `AppError` で統一的にハンドリング
- **依存**: Step 3, Step 4
- **対象ファイル**: `src-tauri/src/commands/images.rs`

### Step 6: Frontend — Zustand stores 実装 ✅
- **内容**: `generation-store.ts` (生成状態管理), `history-store.ts` (画像履歴管理) を実装。`generation-params-store.ts` は Phase 1 で作成済み
- **受け入れ基準**:
  - `generation-store`: `isGenerating`, `lastResult`, `error`, `generate()` action (IPC 呼出)
  - `history-store`: `images`, `isLoading`, `loadImages()`, `saveImage()`, `saveAllImages()`, `deleteImage()` actions
  - `history-store` は各操作後にローカル状態をオプティミスティック更新
- **依存**: なし
- **対象ファイル**: `src/stores/generation-store.ts`, `src/stores/history-store.ts`

### Step 7: Frontend — lib/cost + use-cost-estimate + テスト ✅
- **内容**: Anlas コスト計算の純粋関数を実装。カスタムフック経由で UI に提供
- **受け入れ基準**:
  - `calculateCost()`: V4 コスト係数による基本コスト → clamp(2, 140) → Opus Free 判定 → Vibe/CharRef 追加コスト
  - 定数: `V4_COST_COEFF_LINEAR`, `V4_COST_COEFF_STEP`, `OPUS_FREE_PIXELS = 1,048,576`, `OPUS_FREE_MAX_STEPS = 28`, `OPUS_MIN_TIER = 3`
  - `useCostEstimate` フック: 純粋関数の直接呼び出し（useMemo 不要）
  - 6 件のテスト (basic, opus_free, vibes, char_ref, min_floor, opus_free_with_vibes)
- **依存**: なし
- **対象ファイル**: `src/lib/cost.ts`, `src/hooks/use-cost-estimate.ts`, `src/lib/__tests__/cost.test.ts`

### Step 8: Frontend — 3パネル UI コンポーネント実装 ✅
- **内容**: LeftPanel (MainPromptSection), CenterPanel (ImageDisplay, ActionBar), RightPanel (HistoryHeader, ThumbnailGrid), Header (CostDisplay), shared (PromptTextarea) を実装
- **受け入れ基準**:
  - **MainPromptSection**: メインプロンプト textarea + 折りたたみ可能ネガティブプロンプト
  - **ImageDisplay**: Base64 インラインとファイルパス（convertFileSrc）の二重ソース対応。Loading/Empty/Error/Success の 4 状態
  - **ActionBar**: Generate (Play), Save, SaveAll, Delete ボタン。Generate は prompt 未入力 or isGenerating 時 disabled
  - **HistoryHeader**: All/Saved トグル
  - **ThumbnailGrid**: 2 列グリッド、選択状態ハイライト、保存インジケータ (Bookmark)、lazy loading
  - **CostDisplay**: リアルタイムコスト表示、Opus Free 時は緑色 "Free" 表示
  - **PromptTextarea**: 再利用可能な styled textarea
- **依存**: Step 6, Step 7
- **対象ファイル**: `src/components/left-panel/MainPromptSection.tsx`, `src/components/center-panel/CenterPanel.tsx`, `src/components/center-panel/ImageDisplay.tsx`, `src/components/center-panel/ActionBar.tsx`, `src/components/right-panel/RightPanel.tsx`, `src/components/right-panel/HistoryHeader.tsx`, `src/components/right-panel/ThumbnailGrid.tsx`, `src/components/header/CostDisplay.tsx`, `src/components/shared/PromptTextarea.tsx`

### Step 9: Frontend — GenerationPage レイアウト ✅
- **内容**: 3パネルレイアウト (LeftPanel w-80 | CenterPanel flex-1 | RightPanel w-64) を GenerationPage に組み込む
- **受け入れ基準**:
  - h-screen flex flex-col レイアウト
  - Header + 3パネル (overflow-hidden)
  - パネル間に border-r / border-l
- **依存**: Step 8
- **対象ファイル**: `src/pages/GenerationPage.tsx`

### Step 10: レビュー修正 ✅
- **内容**: コードレビュー指摘事項の修正
- **受け入れ基準**:
  - `generation-store.ts`: `selectImage()` action 追加。ThumbnailGrid の `setState()` 直接呼び出しを排除
  - `generation.rs`: 未使用 import `SaveTarget` 削除
  - `generation.rs`: パストラバーサル防御チェック (`full_path.starts_with(project_path)`) 追加
  - `use-cost-estimate.ts`: 無効な `useMemo` 削除
  - `ARCHITECTURE.md`: `api_client` の型を `tokio::sync::Mutex` に更新
  - `contracts.md`: 関連サービス関数シグネチャ 4 箇所の `api_client` 型を更新
  - `check-naming.sh`: `.test.ts` / `.spec.ts` パターンを許容するよう正規表現修正
- **依存**: Step 1-9
- **対象ファイル**: `src/stores/generation-store.ts`, `src/components/right-panel/ThumbnailGrid.tsx`, `src-tauri/src/services/generation.rs`, `src/hooks/use-cost-estimate.ts`, `docs/architecture/ARCHITECTURE.md`, `docs/contracts/contracts.md`, `scripts/lint/check-naming.sh`

### Step 11: 統合テスト + ビルド確認 ✅
- **内容**: 全テスト・lint・ビルドを通過させる
- **受け入れ基準**:
  - `cargo check` 成功
  - `cargo test` 全テストパス (15 件: generation 4 + image_service 5 + image_repo 6)
  - `npm run build` 成功
  - `npm run test` 全テストパス (211 件 + cost 6 件)
  - `bash scripts/lint/run-all.sh` 全 6 linter パス
- **依存**: Step 1-10
- **対象ファイル**: 全体

## 意思決定ログ
| 日付 | 判断 | 理由 |
|------|------|------|
| 2026-04-07 | `api_client` を `tokio::sync::Mutex` に変更 | `generate_image` が async で `.await` 越しにロック保持が必要。`std::sync::Mutex` は `.await` 間で保持不可 |
| 2026-04-07 | SaveTarget を None にして手動ファイル書込 | Base64 エンコードによるフロントエンド即時プレビューのため、ファイル I/O を自前制御する必要がある |
| 2026-04-07 | prompt_snapshot を JSON で保存 | 生成時のパラメータを再現可能にする。正規化せず JSON blob として保存し、将来の拡張に対応 |
| 2026-04-07 | コスト計算をフロントエンド純粋関数で実装 | リアルタイム更新が必要。バックエンド (novelai_api::anlas) と同じアルゴリズムをフロントエンドにも実装し、IPC オーバーヘッドを回避 |
| 2026-04-07 | history-store でオプティミスティック更新 | save/delete 後に毎回全件再取得するのではなく、ローカル配列を即座に更新して体感速度を向上 |
| 2026-04-07 | レビュー: selectImage を store action に抽出 | coding-guidelines Section 8「コンポーネントからの直接 setState 禁止」に準拠 |
| 2026-04-07 | レビュー: パストラバーサル防御追加 | `full_path.starts_with(project_path)` で防御。現状は UUID ベースパスで安全だが、防御的プログラミングとして追加 |

## チェックポイント（最終更新: 2026-04-07）
- **現在のステップ**: 全ステップ完了
- **作業中のファイル**: なし
- **完了事項**: Step 1-11 すべて実装完了。cargo check / npm run build / 全テスト / 全 linter パス
- **追加対応**: base64 crate 追加。tokio::sync::Mutex 移行。generation-params-store は Phase 1 で作成済みのため流用
- **レビュー修正**: selectImage action 抽出、SaveTarget import 削除、パストラバーサル防御、useMemo 削除、ドキュメント更新 (ARCHITECTURE.md, contracts.md)、lint 修正 (check-naming.sh)
- **テスト**: Backend 15 件 (generation 4 + image_service 5 + image_repo 6)、Frontend 6 件 (cost.test.ts)
- **ブロッカー**: なし
