# 実行プラン: プロジェクト UX 強化

## 概要
- **目標**: プロジェクト一覧・作成画面を強化する（サムネイル表示、名前検索、ジャンルフィルター、デフォルト保存先の自動生成）
- **背景**: 現在のプロジェクト一覧はテキストのみのカードで、サムネイルがなく視認性が低い。検索・フィルタ機能もなく、プロジェクト数が増えたとき不便。保存先を毎回手動指定する必要がある。
- **作成日**: 2026-04-10
- **見積ステップ数**: 8
- **ブランチ**: `feat/project-ux-enhancement`

## 変更対象の概要

### DB スキーマ変更
- `projects` テーブルに `thumbnail_path TEXT` カラムを追加（migration 008）

### Rust バックエンド変更
- `ProjectRow` / `ProjectDto` / `CreateProjectRequest` に `thumbnail_path` フィールド追加
- repository: `list_all` にオプション検索・フィルタ引数追加、`update_thumbnail` 追加
- service: デフォルト保存先の自動計算ロジック（`app_data_dir/projects/{project_type}/{project_name}`）、`directoryPath` がオプションに
- command: `update_project_thumbnail` コマンド追加、`get_default_project_dir` コマンド追加

### フロントエンド変更
- `ProjectDto` / `CreateProjectRequest` 型に `thumbnailPath` 追加、`directoryPath` をオプションに
- `CreateProjectDialog`: サムネイル選択 UI 追加、保存先をデフォルト表示（変更可能）
- `ProjectListPage`: カード形式でサムネイル表示、検索バー、ジャンルフィルタードロップダウン追加
- IPC: 新コマンドのバインディング追加

## ステップ

### Step 1: DB マイグレーション + Row/DTO 更新（テストファースト） ✅
- **内容**:
  - `src-tauri/migrations/008_project_thumbnail.sql` を作成（`ALTER TABLE projects ADD COLUMN thumbnail_path TEXT`）
  - `db.rs` にマイグレーション 008 を追加
  - `ProjectRow` に `thumbnail_path: Option<String>` を追加
  - `ProjectDto` に `thumbnail_path: Option<String>` を追加
  - `ProjectRow → ProjectDto` の `From` 実装を更新
  - `CreateProjectRequest` に `thumbnail_path: Option<String>` と `directory_path` を `Option<String>` に変更
- **受け入れ基準**:
  - マイグレーション適用後、`thumbnail_path` カラムが存在する
  - 既存テストが壊れない（NULL許容で後方互換）
  - `cargo test` パス
- **依存**: なし

### Step 2: Repository 層の拡張（テストファースト） ✅
- **内容**:
  - `project::insert` を `thumbnail_path` に対応
  - `project::update_thumbnail(conn, id, thumbnail_path)` 関数を追加
  - `project::list_all` を `list_filtered(conn, search: Option<&str>, project_type: Option<&str>)` に拡張（既存 `list_all` はラッパーとして残してもよい）
  - テストを先に書く: `test_insert_with_thumbnail`, `test_update_thumbnail`, `test_list_filtered_by_name`, `test_list_filtered_by_type`, `test_list_filtered_combined`
- **受け入れ基準**:
  - 名前の部分一致検索ができる（SQL LIKE）
  - `project_type` でフィルタできる
  - `thumbnail_path` の保存・更新ができる
  - `cargo test` パス
- **依存**: Step 1

### Step 3: Service 層の拡張（テストファースト） ✅
- **内容**:
  - `project::create_project` でデフォルト保存先を自動計算: `{app_data_dir}/projects/{project_type}/{sanitized_name}`
    - `directory_path` が `None` または空の場合にデフォルトを使用
    - `app_data_dir` は Tauri の `app_data_dir` から取得（service に渡すか State から取得）
  - `project::list_projects` に `search` / `project_type` 引数を追加
  - `project::update_project_thumbnail` を追加
  - テストを先に書く: `test_create_project_default_dir`, `test_create_project_custom_dir`, `test_list_projects_with_filter`, `test_update_thumbnail`
- **受け入れ基準**:
  - `directory_path` 未指定でも適切なデフォルトパスが生成される
  - パス内の不正文字がサニタイズされる
  - フィルタが正しく動作する
  - `cargo test` パス
- **依存**: Step 2

### Step 4: Command 層の追加 ✅
- **内容**:
  - `list_projects` コマンドに `search: Option<String>`, `project_type: Option<String>` 引数追加
  - `update_project_thumbnail` コマンド追加
  - `get_default_project_dir` コマンド追加（`project_type` と `name` を受け取りデフォルトパスを返す）
  - `main.rs` の invoke_handler に新コマンドを登録
- **受け入れ基準**:
  - `cargo clippy --all-targets` クリーン
  - コマンドが正しく登録される
  - `cargo test` パス
- **依存**: Step 3

### Step 5: フロントエンド型定義 + IPC 更新 ✅
- **内容**:
  - `src/types/index.ts`:
    - `ProjectDto` に `thumbnailPath: string | null` 追加
    - `CreateProjectRequest` の `directoryPath` を `directoryPath?: string` に変更
  - `src/lib/ipc.ts`:
    - `listProjects` に `search?: string, projectType?: string` 引数追加
    - `updateProjectThumbnail(id, thumbnailPath)` 追加
    - `getDefaultProjectDir(projectType, name)` 追加
  - `src/stores/project-store.ts`:
    - `loadProjects` に `search` / `projectType` フィルタ引数追加
- **受け入れ基準**:
  - TypeScript 型エラーなし（`npm run build` パス）
  - 既存機能が壊れない
- **依存**: Step 4

### Step 6: CreateProjectDialog 改修 ✅
- **内容**:
  - サムネイル画像の選択 UI を追加（画像ファイルピッカー → プレビュー表示）
  - `directoryPath` をデフォルトで自動生成し、テキストフィールドで表示（変更可能）
    - `name` / `projectType` 変更時に `getDefaultProjectDir` を呼んでデフォルトパスを更新
  - ディレクトリ手動選択ボタンは残す（カスタムパス用）
  - i18n キーを追加（`project.thumbnail`, `project.thumbnailSelect`, `project.defaultDirectoryNote`）
  - Vitest テスト: ダイアログのレンダリング、デフォルトパス表示、サムネイル選択 UI
- **受け入れ基準**:
  - プロジェクト名入力だけで作成ボタンが有効になる（ディレクトリ自動設定）
  - サムネイル画像を選択してプレビューが表示される
  - `npm run test` パス
- **依存**: Step 5

### Step 7: ProjectListPage 改修（カード + 検索 + フィルター） ✅
- **内容**:
  - プロジェクトカードにサムネイル画像を表示（なければプレースホルダーアイコン）
  - ヘッダーに検索バー（`Input` + `Search` アイコン）を追加
  - ヘッダーにジャンルフィルター（`Select`: All / simple / manga / cg）を追加
  - 検索・フィルタの状態管理はローカル state（デバウンス付き）
  - `useDebounce` フックで検索入力をデバウンス（300ms）→ `loadProjects` 再呼出
  - i18n キーを追加（`project.search`, `project.filterByType`, `project.allTypes`）
  - Vitest テスト: 検索入力のレンダリング、フィルタ変更の動作
- **受け入れ基準**:
  - サムネイルがカードに表示される
  - 名前で絞り込みができる
  - ジャンルで絞り込みができる
  - 検索+フィルタの組み合わせが正しく動く
  - `npm run test` パス
- **依存**: Step 6

### Step 8: 統合テスト + Lint クリーンアップ ✅
- **内容**:
  - `cargo clippy --all-targets` でワーニングゼロを確認
  - `npm run build` で型エラーゼロを確認
  - `npm run test` 全テストパス
  - `cargo test` 全テストパス
  - 300行制限の確認（超過ファイルがあれば分割）
  - i18n の `ja.json` / `en.json` に追加したキーの漏れがないか確認
- **受け入れ基準**:
  - CI 相当のチェックがすべてパスする
  - 新機能のエンドツーエンドフローが動作する
- **依存**: Step 7

## 意思決定ログ
| 日付 | 判断 | 理由 |
|------|------|------|
| 2026-04-10 | デフォルト保存先に `app_data_dir` を使用 | Tauri の標準パスでクロスプラットフォーム対応可能。ユーザーのドキュメントフォルダ等よりアプリ固有ディレクトリの方が適切 |
| 2026-04-10 | 検索はバックエンド側（SQL LIKE）で実装 | プロジェクト数が増えてもパフォーマンスが安定。フロントエンドでの全件フィルタは避ける |
| 2026-04-10 | `directoryPath` を Option に変更 | 後方互換性のためフロントエンドでは省略可能にし、Rust 側で None の場合にデフォルトを生成 |
| 2026-04-10 | テストファーストで実装 | 各 Step で先にテストを書いてからプロダクションコードを実装する |

## チェックポイント（最終更新: 2026-04-10）
- **現在のステップ**: Step 2
- **作業中のファイル**: `src-tauri/src/repositories/project.rs`
- **次にやること**: Repository 層にフィルタ検索・サムネイル更新を追加
- **ブロッカー**: なし
