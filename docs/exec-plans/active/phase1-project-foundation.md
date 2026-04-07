# 実行プラン: Phase 1 — プロジェクト基盤 (F1, F11, F10)

## 概要
- **目標**: Tauri 2 バックエンドの Settings/Project CRUD を完成させ、フロントエンドの ProjectListPage・SettingsDialog・Header を機能させる
- **背景**: Phase 0 (UI Scaffold) 完了済み。Rust 側はディレクトリ構成・error.rs・db.rs・repositories が概ね実装済みだが、services 層に `todo!()` が多数残っている。フロントエンドはコンポーネント骨格のみ（TODO コメント）
- **作成日**: 2026-04-07
- **見積ステップ数**: 8

## 現状分析

### 実装済み
- Tauri 2 プロジェクト初期化、Cargo.toml に novelai-api path dependency
- `main.rs` / `lib.rs`: AppState 登録、全コマンド登録済み
- `state.rs`: AppState 定義済み
- `error.rs`: AppError 定義 + From 実装済み
- `db.rs`: SQLite 接続、WAL、FK、マイグレーション実行済み
- `migrations/001_init.sql`: 全 9 テーブル作成済み
- `repositories/settings.rs`: get_all / get_by_key / set 実装済み
- `repositories/project.rs`: list_all / find_by_id / insert / delete 実装済み
- `commands/settings.rs`: 4 コマンド（ただし service 層が todo!()）
- `commands/projects.rs`: 4 コマンド（ただし service 層が todo!()）
- Frontend: types/index.ts、lib/ipc.ts、lib/constants.ts、stores（骨格）
- Frontend: 全コンポーネント骨格（TODO コメント付き）

### 未実装（todo!() or スケルトン）
- `services/settings.rs`: initialize_client / get_anlas_balance
- `services/project.rs`: create_project / open_project / delete_project
- Frontend: ProjectListPage（機能する UI）
- Frontend: CreateProjectDialog（フォーム実装）
- Frontend: SettingsDialog（API キー入力、デフォルト設定）
- Frontend: Header（プロジェクト名表示、AnlasDisplay 連携、GenerationParams 連携）

## ステップ

### Step 1: Rust services/settings.rs — initialize_client 実装 ⬜
- **内容**: NovelAIClient を API キーから生成し、AppState.api_client にセットする。API キーを DB の settings テーブルに保存する
- **受け入れ基準**:
  - `initialize_client` が SecretString を使って NovelAIClient を生成
  - `api_client` Mutex をロックして Some(client) にセット
  - DB に api_key を保存
  - 不正なキーでもクライアント生成自体は成功する（API 呼び出し時にエラー）
- **依存**: なし
- **対象ファイル**: `src-tauri/src/services/settings.rs`

### Step 2: Rust services/settings.rs — get_anlas_balance 実装 ⬜
- **内容**: AppState.api_client から NovelAIClient を取得し、subscription API を呼び出して Anlas 残高 + サブスクリプション tier を返す
- **受け入れ基準**:
  - api_client が None の場合 NotInitialized エラーを返す
  - client.get_anlas_balance() で AnlasBalanceDto を返す（fixed, purchased, total, **tier** を含む）
  - AnlasBalanceDto に tier フィールドが含まれていることを確認（なければ追加）
  - API エラーは AppError::ApiClient に変換される
- **依存**: Step 1
- **対象ファイル**: `src-tauri/src/services/settings.rs`, `src-tauri/src/models/dto.rs`（AnlasBalanceDto に tier 追加が必要な場合）

### Step 3: Rust services/project.rs — CRUD 完成 ⬜
- **内容**: create_project / open_project / delete_project の 3 関数を実装する
- **受け入れ基準**:
  - `create_project`: UUID 生成、directory_path のディレクトリ作成（存在しなければ）、DB 挿入、ProjectDto 返却
  - `open_project`: find_by_id + cleanup_unsaved_images（image repository 利用）、ProjectDto 返却
  - `delete_project`: DB 削除（CASCADE で関連画像レコードも削除）
  - バリデーション: name 空チェック、project_type 有効値チェック
- **依存**: なし
- **対象ファイル**: `src-tauri/src/services/project.rs`

### Step 4: Rust — lib.rs の DB パス修正 + 起動時 API キー復元 ⬜
- **内容**: DB パスを Tauri の app_data_dir に変更する。起動時に settings テーブルから api_key を読み込み、存在すれば NovelAIClient を自動初期化する
- **受け入れ基準**:
  - `app_data_dir` を使った適切なパスで DB を開く
  - 起動時に api_key が保存されていれば自動的に api_client を初期化
  - api_key が未設定の場合は api_client = None のまま
- **依存**: Step 1
- **対象ファイル**: `src-tauri/src/lib.rs`

### Step 5: Frontend — SettingsDialog 実装 ⬜
- **内容**: shadcn/ui の Dialog を使って API キー入力・保存・テスト接続の UI を実装する
- **受け入れ基準**:
  - API キー入力フィールド（パスワードマスク、表示切替ボタン）
  - 「保存」ボタンで initializeClient → refreshAnlas を実行
  - 成功時トースト表示、エラー時エラートースト
  - 言語切替（i18n）、テーマ切替は既存の ThemeToggle を利用
  - デフォルトモデル・サンプラー・ステップ等の設定フィールド（将来の拡張用に UI だけ用意、保存は settings-store 経由）
- **依存**: Step 1, Step 2
- **対象ファイル**: `src/components/modals/SettingsDialog.tsx`

### Step 6: Frontend — ProjectListPage + CreateProjectDialog 実装 ⬜
- **内容**: プロジェクト一覧表示、新規作成ダイアログ、プロジェクト削除、プロジェクトを開く機能を実装する
- **受け入れ基準**:
  - マウント時に loadProjects() でプロジェクト一覧取得
  - プロジェクトカード表示（名前、タイプ、作成日）
  - カードクリックで openProject → /generation に遷移
  - 「New Project」ボタンで CreateProjectDialog 表示
  - CreateProjectDialog: name 入力、projectType 選択（simple/manga/cg）、directoryPath（Tauri の dialog.open でディレクトリ選択）
  - 削除ボタン + DeleteConfirmDialog 連携
  - Settings ボタンで SettingsDialog 表示
  - 空状態表示（EmptyState コンポーネント利用）
- **依存**: Step 3, Step 5
- **対象ファイル**: `src/pages/ProjectListPage.tsx`, `src/components/modals/CreateProjectDialog.tsx`

### Step 7: Frontend — Header 機能実装 ⬜
- **内容**: Header にプロジェクト名表示、AnlasDisplay の実データ連携（**プラン名表示含む**）、GenerationParams（モデル・サイズ・サンプラー等）の操作を実装する
- **受け入れ基準**:
  - currentProject.name を表示
  - AnlasDisplay: settingsStore.anlas からリアルタイム表示（null 時は「--」表示）
  - **サブスクリプションプラン表示**: tier 値からプラン名（Free / Tablet / Scroll / Opus）を表示。Opus 時はバッジ等で視覚的に区別
  - **settings-store に tier を保持**: AnlasBalanceDto から tier を受け取り store に保存（Phase 2 のコスト計算で使用）
  - GenerationParams: モデル選択（Select）、幅×高さ設定（プリセット or カスタム）、サンプラー選択、ステップ数（Slider）、スケール（Slider）
  - パラメータ変更は generation-store に反映
  - Settings ボタンクリックで SettingsDialog 表示
- **依存**: Step 5, Step 6
- **対象ファイル**: `src/components/header/Header.tsx`, `src/components/header/AnlasDisplay.tsx`, `src/components/header/GenerationParams.tsx`, `src/components/header/CostDisplay.tsx`, `src/stores/generation-store.ts`, `src/stores/settings-store.ts`

### Step 8: 統合テスト + ビルド確認 ⬜
- **内容**: cargo test / cargo clippy / npm run build / npm run lint を全通過させる。フロントエンドから Rust バックエンドへの IPC が正常に動作することを確認する
- **受け入れ基準**:
  - `cargo test` 全テストパス
  - `cargo clippy --all-targets` 警告なし
  - `npm run build` 成功
  - `npm run lint` (ESLint) パス
  - `cargo tauri dev` でアプリが起動し、設定保存 → プロジェクト作成 → プロジェクトを開く の一連のフローが動作する
- **依存**: Step 1〜7
- **対象ファイル**: 全体

## 意思決定ログ
| 日付 | 判断 | 理由 |
|------|------|------|
| 2026-04-07 | Rust services の todo!() 解消を最優先 | フロントエンドが IPC 呼び出し時にパニックするため |
| 2026-04-07 | Tauri dialog plugin でディレクトリ選択 | ネイティブダイアログが UX 上望ましい、Cargo.toml に tauri-plugin-dialog 追加が必要 |
| 2026-04-07 | 起動時の api_key 自動復元を Step 4 で実施 | 毎回 API キーを入力させるのは UX が悪い |
| 2026-04-07 | プラン表示を Phase 1 Step 7 に追加、コスト計算本実装は Phase 2 | tier は get_anlas_balance が既に返す。コスト計算は生成パラメータ（SMEA 等）が揃う Phase 2 が自然 |

## チェックポイント（最終更新: 2026-04-07）
- **現在のステップ**: Step 1（未着手）
- **作業中のファイル**: なし
- **次にやること**: novelai-api crate の NovelAIClient コンストラクタと balance() メソッドの API を確認し、services/settings.rs の initialize_client を実装する
- **ブロッカー**: なし
