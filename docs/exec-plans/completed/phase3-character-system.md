# 実行プラン: Phase 3 — キャラクターシステム (F6)

## 概要
- **目標**: マルチキャラクター対応を実装する。最大6人のキャラクターを追加し、各キャラクターにプロンプト・ネガティブプロンプト・画像内位置（center_x, center_y）を設定して画像生成に反映できるようにする
- **背景**: Phase 2 で単一プロンプトによる画像生成が完成。NovelAI API の `v4_prompt` は `char_captions` 配列でマルチキャラクターをサポートしており、Rust 側の `services/generation.rs` は既に `CharacterConfig` マッピングを実装済み。フロントエンド側のキャラクター管理 UI とストアが未実装
- **作成日**: 2026-04-07
- **見積ステップ数**: 8
- **ブランチ**: `feat/phase3-character-system`
- **方針**: TDD（テストファースト）— 各ステップでテストを先に書き、実装で通す

## 現状分析

### 実装済み（Phase 2 完了時点）
- **Rust DTO**: `CharacterRequest` (prompt, center_x, center_y, negative_prompt) 定義済み
- **Rust service**: `services/generation.rs` で `req.characters` → `CharacterConfig` マッピング済み
- **Frontend types**: `CharacterRequest` インターフェース定義済み
- **Constants**: `MAX_CHARACTERS = 6` 定義済み
- **i18n**: `character.add`, `character.position`, `character.positionX`, `character.positionY` 定義済み
- **Component skeletons**: `CharacterAddButtons.tsx`, `CharacterSection.tsx` がTODO状態で存在

### 未実装（Phase 3 スコープ）
- **generation-params-store**: `characters` 配列フィールド、add/remove/update actions
- **CharacterAddButtons**: ジャンル別追加ボタン（男/女/その他）の実装
- **CharacterSection**: プロンプト入力、ネガティブプロンプト、位置スライダー UI
- **LeftPanel**: CharacterSection リストのレンダリング
- **ActionBar**: characters を GenerateImageRequest に含める
- **バリデーション**: 6キャラクター上限の UI 制御とサービス層バリデーション
- **Rust service**: 6キャラクター上限バリデーション（現状バリデーションなし）
- **prompt_snapshot**: キャラクター情報のスナップショット保存

## ステップ

### Step 1: Rust — キャラクター上限バリデーション（テスト先行） ✅
- **内容**: `services/generation.rs` に6キャラクター上限バリデーションを追加。テストを先に書く
- **受け入れ基準**:
  - テスト: `test_max_characters_exceeded` — 7キャラクターの `CostEstimateRequest` or mock で `AppError::Validation` 返却を確認
  - テスト: `test_zero_characters_ok` — 0キャラクターで正常動作
  - テスト: `test_six_characters_ok` — 6キャラクターで正常動作
  - 実装: `generate_image` 関数内で `characters.len() > MAX_CHARACTERS` チェック追加
  - `MAX_CHARACTERS` 定数を Rust 側に追加（`src-tauri/src/lib.rs` or `constants` 相当）
- **依存**: なし
- **対象ファイル**: `src-tauri/src/services/generation.rs`

### Step 2: Rust — prompt_snapshot にキャラクター情報を含める ✅
- **内容**: `generate_image` の `prompt_snapshot` JSON にキャラクター配列を追加。テストを先に書く
- **受け入れ基準**:
  - テスト: prompt_snapshot に `characters` キーが含まれ、各キャラクターの prompt/center_x/center_y/negative_prompt が記録される
  - 実装: `serde_json::json!` マクロで `"characters"` フィールド追加
- **依存**: Step 1
- **対象ファイル**: `src-tauri/src/services/generation.rs`

### Step 3: Frontend — generation-params-store キャラクター管理（テスト先行） ✅
- **内容**: `generation-params-store.ts` に `characters` 配列と CRUD actions を追加。テストを先に書く
- **受け入れ基準**:
  - テスト (`src/stores/__tests__/generation-params-store.test.ts`):
    - `addCharacter`: デフォルト値でキャラクター追加、ジャンル名付与
    - `removeCharacter`: index 指定で削除
    - `updateCharacter`: index + 部分更新
    - `addCharacter` が MAX_CHARACTERS=6 超過時に追加しない
    - `clearCharacters`: 全キャラクタークリア
  - 実装:
    - `Character` 型: `{ prompt: string; negativePrompt: string; centerX: number; centerY: number; genreName: string }`
    - `characters: Character[]` フィールド追加
    - `addCharacter(genreName: string)`: デフォルト値で追加（centerX: 0.5, centerY: 0.5）
    - `removeCharacter(index: number)`: index で削除
    - `updateCharacter(index: number, partial: Partial<Character>)`: 部分更新
    - `clearCharacters()`: 全削除
- **依存**: なし
- **対象ファイル**: `src/stores/generation-params-store.ts`, `src/stores/__tests__/generation-params-store.test.ts`

### Step 4: Frontend — CharacterAddButtons 実装（テスト先行） ✅
- **内容**: システムジャンル（男/女/その他）ごとの追加ボタンを実装。テストを先に書く
- **受け入れ基準**:
  - テスト (`src/components/left-panel/__tests__/CharacterAddButtons.test.tsx`):
    - 「男」「女」「その他」の3ボタンが表示される
    - ボタンクリックで `addCharacter` が呼ばれる
    - characters.length >= 6 のとき全ボタンが disabled
  - 実装:
    - システムジャンル3種のボタンを横並びで表示
    - 各ボタンに `UserPlus` アイコン + ジャンル名
    - MAX_CHARACTERS 到達時は disabled + ツールチップ
  - i18n: `character.male`, `character.female`, `character.other`, `character.maxReached` キー追加
- **依存**: Step 3
- **対象ファイル**: `src/components/left-panel/CharacterAddButtons.tsx`, `src/components/left-panel/__tests__/CharacterAddButtons.test.tsx`, `src/i18n/ja.json`, `src/i18n/en.json`

### Step 5: Frontend — CharacterSection 実装（テスト先行） ✅
- **内容**: 個別キャラクターの編集 UI。プロンプト、ネガティブプロンプト、位置スライダー、削除ボタン。テストを先に書く
- **受け入れ基準**:
  - テスト (`src/components/left-panel/__tests__/CharacterSection.test.tsx`):
    - プロンプト textarea が表示され、入力で `updateCharacter` が呼ばれる
    - ネガティブプロンプトが折りたたみで表示される
    - X/Y スライダー (0.0-1.0, step 0.01) が表示される
    - 削除ボタンクリックで `removeCharacter` が呼ばれる
    - ジャンル名がヘッダーに表示される
  - 実装:
    - ヘッダー: `Character {index+1} ({genreName})` + 削除ボタン (X icon)
    - PromptTextarea: キャラクタープロンプト入力
    - 折りたたみ: ネガティブプロンプト入力
    - Slider x2: center_x, center_y (0.0-1.0, step 0.01)
    - store の `updateCharacter` / `removeCharacter` を使用
- **依存**: Step 3
- **対象ファイル**: `src/components/left-panel/CharacterSection.tsx`, `src/components/left-panel/__tests__/CharacterSection.test.tsx`

### Step 6: Frontend — LeftPanel + ActionBar 統合 ✅
- **内容**: LeftPanel に CharacterSection リストを追加。ActionBar の生成リクエストにキャラクター配列を含める
- **受け入れ基準**:
  - LeftPanel: `characters` 配列を map して CharacterSection をレンダリング
  - ActionBar: `handleGenerate` 内で `params.characters` を `CharacterRequest[]` に変換して `GenerateImageRequest.characters` に設定
  - characters が空の場合は `characters` フィールドを省略（undefined）
- **依存**: Step 4, Step 5
- **対象ファイル**: `src/components/left-panel/LeftPanel.tsx`, `src/components/center-panel/ActionBar.tsx`

### Step 7: i18n 整備 + スタイル調整 ✅
- **内容**: 不足している i18n キーの追加、UI のスタイル微調整
- **受け入れ基準**:
  - ja.json / en.json に必要なキーがすべて追加されている
  - CharacterSection のボーダー、パディング、ジャンル色分け等の視覚的区別
  - キャラクター間のスペーシングが適切
- **依存**: Step 6
- **対象ファイル**: `src/i18n/ja.json`, `src/i18n/en.json`, 各コンポーネント

### Step 8: 統合テスト + ビルド確認 ✅
- **内容**: 全テスト・lint・ビルドを通過させる
- **受け入れ基準**:
  - `cargo check` 成功
  - `cargo test` 全テストパス（既存 + 新規キャラクターバリデーション）
  - `npm run build` 成功
  - `npm run test` 全テストパス（既存 + 新規ストア・コンポーネントテスト）
  - `bash scripts/lint/run-all.sh` 全 linter パス
- **依存**: Step 1-7
- **対象ファイル**: 全体

## 意思決定ログ
| 日付 | 判断 | 理由 |
|------|------|------|
| 2026-04-07 | TDD アプローチ採用 | ユーザーリクエスト。各ステップでテストを先に書き、実装で通す |
| 2026-04-07 | ジャンルはシステムジャンル3種（男/女/その他）のみハードコード | Phase 4 でジャンル CRUD を実装するため、Phase 3 ではシステムジャンルのみ。カスタムジャンルはPhase 4で追加ボタンに反映 |
| 2026-04-07 | Rust 側のキャラクター処理は既存を活用 | `services/generation.rs` は既に `CharacterConfig` マッピングを実装済み。バリデーションと snapshot 拡張のみ追加 |
| 2026-04-07 | `generation-params-store` に characters を追加（新ストアは作らない） | キャラクターは生成パラメータの一部。store 分割は行数制限に達した場合に検討 |

## チェックポイント（最終更新: 2026-04-07）
- **現在のステップ**: 全 Step 完了
- **結果**: cargo test 35パス、npm test 164パス、ESLint クリーン、build 成功
- **ブロッカー**: なし
