# NovelAI Desktop App

NovelAI API を利用した AI イラスト生成・管理デスクトップアプリケーション。

## 技術スタック

- **デスクトップシェル**: Tauri 2
- **バックエンド**: Rust (Tauri commands)
- **フロントエンド**: React + TypeScript
- **UI**: Tailwind CSS 4 + shadcn/ui (New York)
- **状態管理**: Zustand
- **ルーティング**: react-router-dom 7 (MemoryRouter)
- **i18n**: react-i18next (ja/en)
- **アイコン**: Lucide React
- **トースト**: Sonner
- **DB**: SQLite (rusqlite, bundled)
- **API クライアント**: novelai-api crate (`novelai_api_client/rust-api`)

## リポジトリ構成

```
.
├── docs/                      # 設計ドキュメント
│   ├── architecture/          # ARCHITECTURE.md, implementation-plan.md, SECURITY.md
│   ├── contracts/             # contracts.md, test-strategy.md
│   ├── requirements/          # REQUIREMENTS.md, domain-model.md
│   └── guidelines/            # coding-guidelines.md, QUALITY_SCORE.md, PLANS.md, WORKFLOWS.md
├── novelai_api_client/        # git submodule (API クライアント実装)
│   ├── rust-api/              # Rust 実装 (本アプリで使用)
│   ├── ts-api/                # TypeScript 実装
│   ├── swift-api/             # Swift 実装
│   └── docs/                  # API プロトコル・コスト計算ドキュメント
├── src-tauri/                 # [計画] Rust バックエンド
└── src/                       # [計画] React フロントエンド
```

## 計画済みディレクトリ構成

### Rust (src-tauri/src/)

```
main.rs, state.rs, error.rs, db.rs
├── commands/       # 8モジュール (settings, project, image, generation, prompt_group, genre, vibe, style_preset)
├── services/       # 8モジュール (同上 + system_prompt)
├── repositories/   # 7モジュール (settings, project, image, prompt_group, genre, vibe, style_preset)
└── models/dto.rs   # Row 構造体 + IPC 用 DTO
```

### Frontend (src/)

```
main.tsx, App.tsx
├── lib/            # ipc.ts, cost.ts, constants.ts
├── types/          # 型定義
├── stores/         # 5 stores (settings, project, generation, prompt, vibe)
├── hooks/          # use-debounce, use-autocomplete, use-cost
├── components/     # 25+ コンポーネント
└── pages/          # GenerationPage, SettingsPage
```

## アーキテクチャ概要

- **Rust**: Commands → Services → Repositories → Models/DTO（skip 禁止）
- **React**: Pages → Components → Hooks → Stores → lib/ipc → types
- **AppState**: `Mutex<Connection>` + `Mutex<Option<NovelAIClient>>` + `SystemPromptDB`（immutable）
- **エラー**: `AppError` enum（6 バリアント）+ `#[serde(tag = "kind")]`

## ドキュメント参照

必要に応じて対応中の問題に関連するドキュメントのみ参照してください。

- `docs/requirements/REQUIREMENTS.md` — 機能要件（F1〜F11）
- `docs/requirements/domain-model.md` — ER 図・SQLite スキーマ・データフロー
- `docs/architecture/ARCHITECTURE.md` — レイヤー設計・AppState・エラーハンドリング
- `docs/architecture/SECURITY.md` — セキュリティ方針・CSP・脅威モデル
- `docs/contracts/contracts.md` — DTO 定義・Repository/Service/Command 署名
- `docs/contracts/test-strategy.md` — テスト方針・テストケース一覧
- `docs/guidelines/coding-guidelines.md` — コーディング規約
- `docs/guidelines/QUALITY_SCORE.md` — 品質スコアリング基準
- `docs/guidelines/PLANS.md` — 計画管理方法論
- `docs/guidelines/WORKFLOWS.md` — 実装・レビュー・メンテナンスワークフロー

## 主要パターン

- **AppError**: thiserror + serde(tag="kind") — NotFound / Validation / Database / ApiClient / Io / NotInitialized
- **SecretString**: API キーのメモリ保持（Debug 出力でマスク）
- **UUID**: Rust 側で `uuid::Uuid::new_v4()` 生成、TEXT 型保存
- **300 行制限**: 超過時はドメイン別分割
- **IPC DTO**: `#[serde(rename_all = "camelCase")]` で Frontend と連携

## 命名規則

| 対象 | Rust | TypeScript | DB |
|------|------|-----------|-----|
| ファイル | snake_case | kebab-case / PascalCase.tsx | — |
| 構造体/型 | PascalCase | PascalCase | — |
| 関数 | snake_case | camelCase | — |
| テーブル | — | — | snake_case |
| IPC フィールド | camelCase (serde) | camelCase | — |

## 実装フェーズ

1. **基盤** (F1, F10, F11): Tauri 初期化、Settings、Projects、Anlas
2. **コア** (F2, F3): 画像生成、履歴、コスト計算、3 パネル UI
3. **キャラクター** (F6): マルチキャラクター、ポジションスライダー
4. **グループ** (F4, F5, F7): Genre、PromptGroup、システムプロンプト
5. **Vibe** (F8, F9): Vibe インポート/管理、スタイルプリセット

## 開発コマンド

```bash
# バックエンド
cargo test                          # テスト実行
cargo clippy --all-targets          # Lint
cargo tauri dev                     # 開発サーバー起動

# フロントエンド
npm install                         # 依存インストール
npm run dev                         # Vite 開発サーバー
npm run test                        # Vitest 実行
npm run build                       # プロダクションビルド

# サブモジュール
git submodule update --init --recursive
```

## アプリアイコン

- **ソースファイル**: `src-tauri/icons/source_icon.png`（1024x1024, RGBA, オリジナル）
- **macOS 用ソース**: `src-tauri/icons/source_icon_filled.png`（1024x1024, RGB, 透明部分をグラデーションで埋めた版）
- **バンドル設定**: `src-tauri/tauri.conf.json` の `bundle.icon` で指定
- **注意**: `cargo tauri dev` は `.app` バンドルを生成しないため、macOS の squircle マスクは適用されない。アイコン表示の確認は `cargo tauri build --debug` で `.app` を生成して行う

### macOS アイコン再生成

macOS ネイティブツール（`sips` + `iconutil`）を使用:

```bash
# source_icon_filled.png から icon.icns を再生成
ICONSET=src-tauri/icons/icon.iconset
mkdir -p "$ICONSET"
for size in 16,16x16 32,16x16@2x 32,32x32 64,32x32@2x 128,128x128 256,128x128@2x 256,256x256 512,256x256@2x 512,512x512 1024,512x512@2x; do
  IFS=',' read -r px name <<< "$size"
  sips -z $px $px src-tauri/icons/source_icon_filled.png --out "$ICONSET/icon_${name}.png"
done
iconutil -c icns "$ICONSET" -o src-tauri/icons/icon.icns
rm -rf "$ICONSET"
```

## UI 関連

### shadcn/ui コンポーネント追加

```bash
npx shadcn@latest add <component-name> --yes
```

`src/components/ui/` に生成される。このディレクトリのファイルは kebab-case（naming linter 除外済み）。

### デザイントークン

- 色・スペーシング: `src/index.css` の CSS 変数 + `@theme` ブロック
- 詳細仕様: `docs/ui/DESIGN_SYSTEM.md`
- コンポーネント階層: `docs/ui/ui-architecture.md`

### i18n

- 設定: `src/i18n/index.ts`
- 翻訳ファイル: `src/i18n/ja.json`, `src/i18n/en.json`
- 使い方: `const { t } = useTranslation()` → `t("common.save")`

### テーマ切替

- Store: `src/stores/theme-store.ts`（Zustand persist + localStorage）
- CSS: `:root`（ダーク）/ `.light`（ライト）クラスベース
- FOUC 防止: `onRehydrateStorage` で初回レンダリング前にクラス適用

## サブモジュール CLAUDE.md

- `novelai_api_client/CLAUDE.md` — 全実装の概要・共通パターン
- `novelai_api_client/rust-api/CLAUDE.md` — Rust API クライアントの詳細
