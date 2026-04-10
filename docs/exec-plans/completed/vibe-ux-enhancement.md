# 実行プラン: Vibe UX 強化（サムネイル・プロジェクト連携・D&D・右クリック管理・エンコード）

## 概要
- **目標**: Vibeのインポート/管理/表示を大幅に改善し、サムネイル画像・名前のカスタマイズ、プロジェクト単位のVibe管理、ドラッグ&ドロップインポート/エンコード、右クリックメニューによる編集/削除、Vibeエンコード機能を実装する
- **背景**: Phase 5でVibeの基本CRUD・生成統合は完了しているが、UX面で不足がある。具体的には(1)サムネイルがない、(2)プロジェクトとVibeの紐付けがない、(3)インポート時にファイルピッカーのみ、(4)管理画面でのインタラクションが貧弱、(5)Vibeエンコード（画像→vibe変換）が未実装、(6)infoExtractedスライダーが不要（エンコード時固定値）
- **作成日**: 2026-04-09
- **見積ステップ数**: 9（Step 0〜8）

## 現状分析

### 現在のVibe関連実装
- **DB**: `vibes`テーブル（id, name, file_path, model, created_at）— サムネイル列なし、プロジェクトとの紐付けテーブルなし
- **Rust DTO**: `VibeDto { id, name, file_path, model, created_at }`, `VibeReference { vibe_id, strength, info_extracted }`, `EncodeVibeRequest { image_path, model, name }`
- **フロントエンド型**: `VibeDto { id, name, filePath, model, createdAt }`, `VibeReference { vibeId, strength, infoExtracted }`, `EncodeVibeRequest { imagePath, model, name }`
- **VibeSection（左サイドバー）**: `listVibes()`で全Vibeを一覧表示、ON/OFFトグル + strength/infoExtractedスライダー
- **VibeModal（管理画面）**: インポート（ファイルピッカー）、削除（確認ダイアログ）のみ。名前編集・サムネイル表示なし
- **StylePresetModal**: Vibeをチェックリストで選択。名前のみ表示、サムネイルなし
- **encode_vibe**: コマンド登録済みだがService層がプレースホルダー（NotInitialized）
- **APIクライアント**: `NovelAIClient::encode_vibe(EncodeVibeParams)` は完全実装済み（`VIBE_ENCODE_PRICE = 2`）

### 不足している機能（今回のスコープ）
1. **サムネイル画像**: インポート時に任意設定、Vibe管理画面/プリセット画面/サイドバーでの表示
2. **名前のカスタマイズ**: インポート時にファイル名とは別の表示名を設定可能（デフォルトはファイル名）
3. **プロジェクト × Vibe紐付け**: プロジェクトに追加されたVibeだけがサイドバーに表示される
4. **サイドバーからVibeを非表示にする機能**: import自体は残すがサイドバーに表示しない
5. **サイドバーからimport済みVibeをプロジェクトに追加**: 管理画面経由
6. **Vibe管理画面の強化**: 右クリックで削除・名前編集・サムネイル編集、サムネイル一覧表示
7. **ドラッグ&ドロップ**: `.naiv4vibe`→インポート、画像→エンコード
8. **StylePresetModal**: Vibeサムネイルを一覧表示するスペース確保
9. **Vibeエンコード**: 画像+情報抽出度→vibeファイル変換（2アンラス消費）
10. **infoExtractedスライダー削除**: エンコード時に固定されるためサイドバーから除去

## 設計判断

### infoExtracted の扱い
- `information_extracted` はvibeファイルにベイクされており、ユーザーが変更するものではない
- **サイドバーのinfoExtractedスライダーを削除**（strengthスライダーのみ残す）
- 生成時: `services/generation.rs` でvibeファイルから `extract_encoding()` を呼び `information_extracted` を取得する
  - 現在: フロントエンドから `VibeReference.info_extracted` で渡している
  - 変更後: `process_vibes()` の `_file_info` を利用する代わりに、generation service側で `extract_encoding()` を呼んで取得
- `VibeReference` DTOから `info_extracted` フィールドを削除
- `SelectedVibe` から `infoExtracted` を削除、`updateVibeInfoExtracted` アクションも削除

### Vibeエンコード
- API: `novelai_api::client::NovelAIClient::encode_vibe(EncodeVibeParams)` は実装済み（`novelai_api_client/rust-api/src/client/mod.rs`）
- Service: `services/vibe.rs:80-89` がプレースホルダー（NotInitialized）→ 実装する
- Command: `encode_vibe` は既にコマンド登録済み（`commands/vibes.rs`）
- DTO: `EncodeVibeRequest` に `information_extracted: f64` を追加（現在は `image_path, model, name` のみ）
- UI: `VibeEncodeDialog` を新規作成
  - 画像選択（ファイルピッカー + ダイアログ内D&D）
  - 情報抽出度スライダー（0.0-1.0, default 1.0）
  - 名前入力（デフォルト: 画像ファイル名）
  - "Encode (2 Anlas)" ボタン（コスト明記）
- モデルはgeneration-params-storeの現在選択中モデルをデフォルト使用

### グローバルD&Dのファイル種別ルーティング
- `.naiv4vibe` → `VibeImportDialog`（名前・サムネイル入力）
- `.png/.jpg/.jpeg/.webp` → `VibeEncodeDialog`（エンコード画面）
- ドラッグ中はオーバーレイ表示

### サムネイル画像の保存方式
- `vibes`テーブルに `thumbnail_path TEXT` 列を追加（NULL許容）
- サムネイル画像は `$APPDATA/novelai-desktop/vibe-thumbnails/{vibe_id}.png` に保存
- インポート時に画像ファイル（png/jpg/webp）を選択可能。未指定の場合はNULL
- フロントエンドでは `convertFileSrc`（Tauri）でローカルファイルパスをURL化して`<img>`に表示
- サムネイルがない場合はプレースホルダーアイコンを表示

### プロジェクト × Vibe の管理
- 新テーブル `project_vibes(project_id, vibe_id, is_visible, added_at)` を追加
  - `is_visible`: 1=サイドバーに表示、0=非表示（importはされているがサイドバーに出さない）
- サイドバーには `project_vibes` で `is_visible = 1` のVibeのみ表示
- 「プロジェクトにVibeを追加」はVibe管理画面（VibeModal）から行う方式を採用
  - 理由: サイドバーにボタンを増やすとスペースが圧迫される。VibeModalの各Vibe行に「プロジェクトに追加/削除」トグルを付けることで、一覧性と操作性を両立できる

### Vibe管理画面のレイアウト
- グリッド表示に変更（サムネイルカード形式、縦横可変）
- 右クリックでコンテキストメニュー（名前編集、サムネイル変更、削除）
- モーダルサイズを拡大（`max-w-md` → `max-w-3xl`）
- 「Encode」ボタンを「Import」ボタンの横に追加

### StylePresetModal のレイアウト
- 現在の左右分割（プリセットリスト | エディタ）を維持
- エディタ内のVibeセクションをサムネイル付きグリッドに変更
- モーダルサイズは現在の `max-w-2xl` で十分

### インポートダイアログ
- Vibeファイル選択後に「名前」「サムネイル画像（任意）」を入力するサブダイアログを表示
- 名前のデフォルト値はファイル名（.naiv4vibe拡張子を除いたもの）

## ステップ

### Step 0: ブランチ作成 & プラン配置 ✅
- `feat/vibe-ux-enhancement` ブランチを作成
- このプラン内容で `docs/exec-plans/active/vibe-ux-enhancement.md` を更新
- **ファイル**: `docs/exec-plans/active/vibe-ux-enhancement.md`

### Step 1: DB マイグレーション & Rust Repository 層 ✅
- **内容**:
  - `002_vibe_ux.sql` マイグレーション作成:
    - `ALTER TABLE vibes ADD COLUMN thumbnail_path TEXT`
    - `CREATE TABLE project_vibes (project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, vibe_id TEXT NOT NULL REFERENCES vibes(id) ON DELETE CASCADE, is_visible INTEGER NOT NULL DEFAULT 1, added_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (project_id, vibe_id))`
  - `db.rs` にマイグレーション実行を追加（version < 2 で実行）
  - `repositories/vibe.rs` に追加:
    - `update_name(conn, id, name)` — 名前更新
    - `update_thumbnail(conn, id, thumbnail_path: Option<&str>)` — サムネイルパス更新
  - `repositories/project_vibe.rs` 新規作成:
    - `add_to_project(conn, project_id, vibe_id)` — プロジェクトにVibe追加
    - `remove_from_project(conn, project_id, vibe_id)` — プロジェクトからVibe削除
    - `set_visibility(conn, project_id, vibe_id, is_visible)` — 表示/非表示切替
    - `list_by_project(conn, project_id, visible_only: bool)` — プロジェクトのVibe ID一覧取得
  - Repository テスト追加
- **受け入れ基準**:
  - マイグレーションが正常に実行される
  - 既存データが破壊されない（ALTER TABLE ADD COLUMNはSQLiteで安全）
  - 全repositoryテスト通過
- **依存**: なし

### Step 2: Rust DTO・Service・Command 層 ✅
- **内容**:
  - **DTO変更** (`models/dto.rs`):
    - `VibeRow`, `VibeDto` に `thumbnail_path` 追加
    - `EncodeVibeRequest` に `information_extracted: f64` 追加
    - `VibeReference` から `info_extracted` 削除
    - `AddVibeRequest` に `thumbnail_path: Option<String>` 追加
    - `UpdateVibeNameRequest { id, name }`, `UpdateVibeThumbnailRequest { id, thumbnail_path }` 新規追加
    - `ProjectVibeDto { vibe_id, vibe_name, thumbnail_path, model, is_visible, added_at }` 新規追加
  - **Service** (`services/vibe.rs`):
    - `update_vibe_name(conn, id, name)` — バリデーション + repo呼び出し
    - `update_vibe_thumbnail(conn, id, thumbnail_path)` — 画像を `$APPDATA/vibe-thumbnails/{id}.ext` にコピー + repo更新
    - `add_vibe()` 拡張: `thumbnail_path` オプション受け取り
    - **`encode_vibe()` 実装**:
      1. APIクライアントロック、未初期化ならエラー
      2. `EncodeVibeParams` 構築（`ImageInput::FilePath`, model, `information_extracted`, `SaveTarget::Directory` で vibes dir へ保存）
      3. `client.encode_vibe(&params).await`
      4. 結果の `.saved_path` からvibeファイルパス取得
      5. DB insert → `VibeDto` 返却
  - **Generation service** (`services/generation.rs:174-184`):
    - vibeファイルから `novelai_api::utils::vibe::load_vibe_file()` + `extract_encoding()` で `information_extracted` を取得
    - `VibeConfig.info_extracted` にファイルの値を設定（フロントエンドからの値ではなく）
  - **Service** (`services/project_vibe.rs` 新規):
    - `add_vibe_to_project(conn, project_id, vibe_id)`
    - `remove_vibe_from_project(conn, project_id, vibe_id)`
    - `set_vibe_visibility(conn, project_id, vibe_id, is_visible)`
    - `list_project_vibes(conn, project_id)` → `Vec<VibeDto>`（visible_only=trueのVibeをJOINで取得）
    - `list_project_vibes_all(conn, project_id)` → `Vec<ProjectVibeDto>`（is_visible含む全件）
  - **Commands** (`commands/vibes.rs`):
    - `update_vibe_name`, `update_vibe_thumbnail` 追加
    - `add_vibe_to_project`, `remove_vibe_from_project`, `set_vibe_visibility` 追加
    - `list_project_vibes`, `list_project_vibes_all` 追加
  - clippy + test 通過確認
- **受け入れ基準**:
  - 全コマンドが正しくInvokeハンドラに登録される
  - `cargo clippy --all-targets` 警告なし
  - `cargo test` 全通過
- **依存**: Step 1

### Step 3: Frontend 型定義・IPC・Store・i18n ✅
- **内容**:
  - **型** (`types/index.ts`):
    - `VibeDto` に `thumbnailPath: string | null` 追加
    - `EncodeVibeRequest` に `informationExtracted: number` 追加
    - `VibeReference` から `infoExtracted` 削除
    - `AddVibeRequest` に `thumbnailPath?: string` 追加
    - `UpdateVibeNameRequest { id: string; name: string }` 追加
    - `UpdateVibeThumbnailRequest { id: string; thumbnailPath: string }` 追加
    - `ProjectVibeDto { vibeId, vibeName, thumbnailPath, model, isVisible, addedAt }` 追加
  - **IPC** (`lib/ipc.ts`):
    - `updateVibeName(req)`, `updateVibeThumbnail(req)`
    - `addVibeToProject(projectId, vibeId)`
    - `removeVibeFromProject(projectId, vibeId)`
    - `setVibeVisibility(projectId, vibeId, isVisible)`
    - `listProjectVibes(projectId)` → `VibeDto[]`
    - `listProjectVibesAll(projectId)` → `ProjectVibeDto[]`
  - **Store** (`generation-params-store.ts`):
    - `SelectedVibe` から `infoExtracted` 削除
    - `updateVibeInfoExtracted` アクション削除
    - `addVibe` の初期値から `infoExtracted` 削除
    - `applyStylePreset` の `infoExtracted` 設定を削除
  - **i18n** (ja.json, en.json): キー追加
    - `vibe.encode`, `vibe.encodeCost`, `vibe.informationExtracted`, `vibe.encodeImageLabel`, `vibe.encodeDragHint`, `vibe.encodeSuccess`
    - `vibe.importDialog`, `vibe.nameLabel`, `vibe.namePlaceholder`, `vibe.thumbnailLabel`, `vibe.changeThumbnail`
    - `vibe.addToProject`, `vibe.removeFromProject`, `vibe.hide`, `vibe.show`, `vibe.editName`, `vibe.editThumbnail`
- **受け入れ基準**:
  - TypeScript型チェック通過
  - 全IPC関数がバックエンドコマンドと対応
- **依存**: Step 2

### Step 4: VibeImportDialog・VibeEncodeDialog・グローバルD&D ✅
- **内容**:
  - `VibeImportDialog.tsx` 新規作成（shadcn/ui Dialog）:
    - ファイル選択後に表示されるサブダイアログ
    - 名前入力フィールド（デフォルト: ファイル名）
    - サムネイル画像選択（任意、ファイルピッカーでpng/jpg/webp）
    - サムネイルプレビュー表示
    - 「インポート」「キャンセル」ボタン
  - `VibeEncodeDialog.tsx` 新規作成（shadcn/ui Dialog）:
    - 画像ドロップゾーン（破線ボーダー + ファイルピッカーボタン）+ プレビュー
    - ダイアログ内D&D対応（png/jpg/webp）
    - Information Extracted スライダー（0.0-1.0, step 0.01, default 1.0）
    - 名前入力フィールド（デフォルト: 画像ファイル名）
    - 「Encode (2 Anlas)」ボタン（コスト明記）
    - ローディング状態（エンコード中はスピナー + ボタン無効化）
    - 成功時: ダイアログ閉じる + トースト + vibe一覧リフレッシュ
  - グローバルD&Dハンドラー（`App.tsx` or `GenerationPage.tsx`）:
    - Tauri のファイルドロップイベント使用
    - ファイル拡張子で振り分け: `.naiv4vibe` → VibeImportDialog, `.png/.jpg/.jpeg/.webp` → VibeEncodeDialog
    - ドラッグ中のオーバーレイ表示（画面全体に薄いオーバーレイ + アイコン）
  - `VibeModal.tsx` のインポートフロー修正:
    - ファイルピッカー → VibeImportDialog表示 → 確認後にipc.addVibe呼び出し
- **受け入れ基準**:
  - ファイルピッカー経由のインポートで名前・サムネイル設定可能
  - D&Dで`.naiv4vibe`→ImportDialog、画像→EncodeDialog が正しくルーティング
  - エンコード成功後にvibe一覧に追加される
  - サムネイル未設定でもインポート可能
- **依存**: Step 3

### Step 5: VibeSection（左サイドバー）リニューアル ✅
- **内容**:
  - `VibeSection.tsx` を改修:
    - `listVibes()` → `listProjectVibesAll(projectId)` に切り替え
    - `is_visible = true` のVibeのみメインリストに表示
    - 各Vibeにサムネイル表示（小サイズ、32x32程度）
    - ON/OFFトグル（生成に使うかどうか）は既存のまま
    - **infoExtractedスライダー削除**（strengthスライダーのみ残す）
    - 「非表示にする」操作: Vibeカード右端の「目」アイコン
      - `setVibeVisibility(projectId, vibeId, false)` → リストから消える
    - 「Vibeを管理」ボタン（既存）→ VibeModal を開く
  - `generation-params-store` の selectedVibes はプロジェクトVibeのみを対象とするよう調整
- **受け入れ基準**:
  - サイドバーにサムネイル付きでVibeが表示される
  - infoExtractedスライダーがない（strengthのみ）
  - 非表示操作でサイドバーから消える（importは残る）
  - 「Vibeを管理」から復元可能
- **依存**: Step 3

### Step 6: VibeModal（管理画面）リニューアル ✅
- **内容**:
  - `VibeModal.tsx` を改修:
    - モーダルサイズ拡大（`max-w-md` → `max-w-3xl`）
    - グリッドレイアウト（サムネイルカード形式、3-4列）
    - 各カード: サムネイル画像（大きめ）、名前、モデル
    - 右クリックでコンテキストメニュー（shadcn/ui `ContextMenu`）:
      - 名前を編集 → インライン編集またはサブダイアログ
      - サムネイルを変更 → ファイルピッカー
      - プロジェクトに追加/削除（現在のプロジェクトがある場合）
      - 表示/非表示を切り替え（プロジェクトに追加済みの場合）
      - 削除 → 確認ダイアログ
    - **「Encode」ボタン追加**（「Import」ボタンの横）→ VibeEncodeDialog を開く
    - プロジェクトに追加済みかどうかをカード上に視覚的表示（チェックマークなど）
  - shadcn/ui `ContextMenu` コンポーネントの追加（`npx shadcn@latest add context-menu --yes`）
- **受け入れ基準**:
  - グリッド表示でサムネイルが見える
  - 右クリックメニューから全操作が可能
  - 名前・サムネイルの編集が動作
  - プロジェクトへの追加/削除が動作
  - Encodeボタン → VibeEncodeDialog表示
- **依存**: Step 4, 5

### Step 7: StylePresetModal のVibe表示改善 ✅
- **内容**:
  - `StylePresetModal.tsx` のVibeセクションを改修:
    - チェックリスト形式 → サムネイル付きグリッド形式に変更
    - 各Vibeカード: サムネイル（小）、名前、チェックボックス
    - Vibeが多い場合はScrollAreaで対応
  - エディタ部分のレイアウト調整（Vibeセクションの高さ確保）
- **受け入れ基準**:
  - Vibeサムネイルが表示される
  - チェック操作は従来通り動作
  - レイアウトが崩れない
- **依存**: Step 3

### Step 8: 統合テスト & 最終確認 ✅
- **内容**:
  - `cargo clippy --all-targets` 警告なし
  - `cargo test` 全通過
  - `npm run build` 成功
  - 300行制限チェック（超過ファイルの分割）
  - i18n の抜け漏れチェック（ja/en両方）
  - generation-params-store テスト追加（infoExtracted削除関連）
- **受け入れ基準**:
  - 全テスト・lint・ビルド通過
  - 300行超過ファイルなし
  - 全i18nキーが両言語に存在
- **依存**: Step 1-7

## 意思決定ログ
| 日付 | 判断 | 理由 |
|------|------|------|
| 2026-04-09 | サムネイルはファイルとして保存し、DBにパスを格納 | BLOBでDB肥大化を避ける。Tauri `convertFileSrc` でローカルパスをimg src化できる |
| 2026-04-09 | プロジェクトへのVibe追加はVibeModal（管理画面）から行う | サイドバーにボタンを増やすとスペース圧迫。管理画面なら全Vibeの一覧を見ながら追加/削除できて一覧性が高い |
| 2026-04-09 | `project_vibes.is_visible` で非表示機能を実現 | Vibeを「プロジェクトから削除」ではなく「非表示にする」ことで、再表示時にstrength等のパラメータを保持できる |
| 2026-04-09 | VibeModalをグリッド表示に変更（リスト→カード） | サムネイルを効果的に表示するにはカード形式が適している。右クリックメニューとの相性も良い |
| 2026-04-09 | StylePresetModalは `max-w-2xl` のまま維持 | エディタ内のVibeセクションを小サムネイルグリッドにすれば現サイズで収まる |
| 2026-04-09 | D&Dは画面全体で受け付け、拡張子で振り分け | `.naiv4vibe`→Import、画像→Encode。直感的で発見性が高い |
| 2026-04-09 | infoExtractedスライダーをサイドバーから削除 | vibeファイルにベイクされた固定値であり、ユーザーが変更する必要がない。生成時はファイルから読み取る |
| 2026-04-09 | Vibeエンコードボタンを管理画面に配置 | インポートとエンコードは関連操作。管理画面で一元的にVibe作成・管理できる |
| 2026-04-09 | エンコードコスト(2 Anlas)をボタンに明記 | ユーザーがコストを認識した上で操作できるようにする |

## チェックポイント（最終更新: 2026-04-10）
- **現在のステップ**: 全ステップ完了 + レビュー修正完了
- **状態**: 全テスト・lint・ビルド通過。コミット待ち
- **レビュー修正内容**:
  - `normalize-strength.ts` テスト追加（10テスト）
  - サムネイル拡張子ホワイトリスト検証（`vibe.rs`, `style_preset.rs`）
  - `project_vibe.rs` N+1クエリ修正（JOINクエリ導入）
  - `StylePresetEditorModal.tsx` 300行以下に分割（`ArtistTagInput.tsx` 抽出）
  - `vibe.rs` サムネイルコピーロジック共通化（`copy_thumbnail` ヘルパー）
  - ドキュメント更新（contracts.md, domain-model.md, ARCHITECTURE.md）
  - 未使用インポート修正（`RandomPresetSettingsDialog.tsx`）
- **ブロッカー**: なし
