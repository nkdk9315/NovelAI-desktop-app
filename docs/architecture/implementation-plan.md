# 実装計画

## 1. ディレクトリ構成

```
src-tauri/
├── Cargo.toml
├── tauri.conf.json
├── build.rs
├── resources/
│   └── danbooru_tags.csv                # バンドルCSV (167,907件)
├── migrations/
│   └── 001_init.sql                     # フルスキーマ (9テーブル)
└── src/
    ├── main.rs                          # Tauri bootstrap, state登録, command登録
    ├── state.rs                         # AppState定義
    ├── error.rs                         # AppError (thiserror + Serialize)
    ├── db.rs                            # DB接続, WAL, FK, マイグレーション
    ├── commands/
    │   ├── mod.rs                       # re-export + register_commands()
    │   ├── settings.rs                  # get_settings, set_setting, initialize_client, get_anlas_balance
    │   ├── projects.rs                  # list/create/open/delete_project
    │   ├── images.rs                    # generate_image, estimate_cost, save/delete/get/cleanup
    │   ├── prompt_groups.rs             # list/get/create/update/delete_prompt_group
    │   ├── genres.rs                    # list/create/delete_genre
    │   ├── vibes.rs                     # list/add/delete/encode_vibe
    │   ├── style_presets.rs             # list/create/update/delete_style_preset
    │   └── system_prompts.rs            # get_categories, search
    ├── services/
    │   ├── mod.rs
    │   ├── settings.rs                  # KVS操作, クライアント初期化
    │   ├── project.rs                   # CRUD + クリーンアップ
    │   ├── generation.rs                # パラメータ組立, API呼出, ファイル書込, DB挿入
    │   ├── prompt_group.rs              # CRUD, デフォルト制御
    │   ├── genre.rs                     # CRUD, システムジャンル保護
    │   ├── vibe.rs                      # import, ファイルコピー, encode
    │   ├── style_preset.rs             # CRUD + Vibe junction
    │   └── system_prompt.rs             # CSV読込, インメモリ検索
    ├── repositories/
    │   ├── mod.rs
    │   ├── settings.rs                  # settings KVS
    │   ├── project.rs                   # projects テーブル
    │   ├── image.rs                     # generated_images テーブル
    │   ├── prompt_group.rs              # prompt_groups + prompt_group_tags
    │   ├── genre.rs                     # genres テーブル
    │   ├── vibe.rs                      # vibes テーブル
    │   └── style_preset.rs             # style_presets + style_preset_vibes
    └── models/
        ├── mod.rs
        └── dto.rs                       # IPC用DTO (Serialize/Deserialize)

src/
├── main.tsx                             # Reactエントリ, ルーター
├── App.tsx                              # ルートレイアウト (Header + 3パネル)
├── lib/
│   ├── ipc.ts                           # typed invoke() wrapper (全コマンド1:1対応)
│   ├── cost.ts                          # Anlasコスト計算 (pure function)
│   └── constants.ts                     # モデル, サンプラー, デフォルト値, 制約
├── types/
│   └── index.ts                         # 全TS型定義 (Rust DTOミラー)
├── stores/
│   ├── settings-store.ts                # APIキー, デフォルトパラメータ, Anlas残高, tier
│   ├── project-store.ts                 # プロジェクト一覧, 現在のプロジェクト
│   ├── generation-store.ts              # プロンプト, キャラクター, Vibe, パラメータ, isGenerating
│   ├── history-store.ts                 # 生成画像一覧, 選択中画像
│   └── prompt-group-store.ts            # ジャンル, グループ (ピッカー/マネージャー用)
├── hooks/
│   ├── use-debounce.ts
│   ├── use-autocomplete.ts              # デバウンス付きシステムプロンプト検索
│   └── use-cost-estimate.ts             # パラメータからリアクティブにコスト計算
├── components/
│   ├── ui/                              # shadcn/ui primitives (Button, Input, Slider, Dialog...)
│   ├── header/
│   │   ├── Header.tsx                   # ヘッダーバー全体
│   │   ├── AnlasDisplay.tsx             # Anlas残高表示
│   │   ├── ModelSelector.tsx            # モデル選択ドロップダウン
│   │   ├── SizeSelector.tsx             # 幅×高さ設定
│   │   ├── ParamControls.tsx            # サンプラー, ステップ, スケール, 枚数
│   │   └── CostEstimate.tsx             # コスト予測表示
│   ├── left-panel/
│   │   ├── LeftPanel.tsx                # スクロール可能コンテナ
│   │   ├── MainPromptSection.tsx        # メインプロンプト + ネガティブ + グループ
│   │   ├── PromptTextarea.tsx           # オートコンプリート付きテキストエリア
│   │   ├── CharacterAddButtons.tsx      # ジャンル別追加ボタン群
│   │   ├── CharacterSection.tsx         # キャラクターごとのUI
│   │   ├── PromptGroupPicker.tsx        # グループ選択UI
│   │   ├── ArtistStyleSection.tsx       # アーティストタグ + スタイルプリセット
│   │   └── VibeSection.tsx              # Vibe一覧 + ON/OFF + スライダー
│   ├── center-panel/
│   │   ├── CenterPanel.tsx
│   │   ├── ImageViewer.tsx              # 生成画像表示
│   │   ├── GenerateButton.tsx           # 生成ボタン + ローディング
│   │   └── SaveControls.tsx             # 保存/破棄コントロール
│   ├── right-panel/
│   │   ├── RightPanel.tsx               # 縦スクロールコンテナ
│   │   └── HistoryItem.tsx              # サムネイル + 保存状態
│   └── modals/
│       ├── SettingsDialog.tsx
│       ├── PromptGroupManager.tsx       # グループCRUD管理モーダル
│       ├── VibeManager.tsx
│       ├── StylePresetManager.tsx
│       └── ProjectCreateDialog.tsx
├── pages/
│   ├── ProjectListPage.tsx              # プロジェクト選択/作成
│   └── GenerationPage.tsx               # メイン3パネルワークスペース
└── index.css                            # Tailwindディレクティブ
```

---

## 2. 命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| Rustファイル名 | snake_case | `prompt_group.rs`, `style_preset.rs` |
| Rustモジュール | snake_case | `mod prompt_group;` |
| Rust構造体/enum | PascalCase | `PromptGroupDto`, `AppError` |
| Rust関数 | snake_case | `create_prompt_group()` |
| Rust定数 | SCREAMING_SNAKE_CASE | `MAX_CHARACTERS` |
| TSファイル名 | kebab-case | `settings-store.ts`, `use-debounce.ts` |
| TSコンポーネントファイル | PascalCase | `Header.tsx`, `ImageViewer.tsx` |
| TSコンポーネント | PascalCase | `export function Header()` |
| TS関数/変数 | camelCase | `generateImage()`, `isGenerating` |
| TS型/interface | PascalCase | `ProjectDto`, `AppError` |
| TSディレクトリ | kebab-case | `left-panel/`, `center-panel/` |
| DB テーブル名 | snake_case (複数形) | `prompt_groups`, `generated_images` |
| DB カラム名 | snake_case | `is_saved`, `created_at` |
| UUID | `uuid::Uuid::new_v4().to_string()` (Rust側で生成) | `"550e8400-e29b-..."` |
| タイムスタンプ | ISO 8601 (TEXT) | `"2026-04-07T12:00:00Z"` |
| IPC payload | camelCase (Tauriデフォルトserde rename) | `{ projectId, fileName }` |

---

## 3. ファイルサイズ制限

- **最大行数目安**: 300行/ファイル
- **超過時の対応**: ドメイン別にファイル分割
  - 例: `dto.rs` が300行超 → `dto/project.rs`, `dto/generation.rs` に分割
- **例外**: マイグレーションSQL、型定義ファイル（必要に応じて超過OK）

---

## 4. 実装優先順位

### Phase 0: UI Scaffold (完了)

デザイントークン、shadcn/ui、ルーティング、i18n、コンポーネント骨格の一括セットアップ。

- [x] npm パッケージ追加: フォント、shadcn 前提、react-router-dom、sonner、lucide-react、react-i18next
- [x] `components.json` + `src/lib/utils.ts` (cn 関数) 作成
- [x] `src/index.css`: デザイントークン全定義 (oklch, @theme カラー登録, ダーク/ライト, @layer base)
- [x] shadcn/ui 22 コンポーネント追加 (button, input, dialog, select, slider 等)
- [x] `src/stores/theme-store.ts`: Zustand persist + onRehydrateStorage (FOUC 防止)
- [x] `src/main.tsx`: フォントインポート (Inter, Noto Sans JP, JetBrains Mono) + i18n 初期化
- [x] `src/i18n/`: react-i18next 設定 + ja.json / en.json 翻訳ファイル
- [x] `src/App.tsx`: MemoryRouter + Routes + Toaster + TooltipProvider
- [x] 骨格テンプレート 31 ファイル: shared (3), header (5), left-panel (8), center-panel (4), right-panel (3), modals (6), pages (2)
- [x] `eslint-plugin-jsx-a11y` 追加
- [x] `scripts/lint/check-design-tokens.sh` (ハードコード色値検出)
- [x] `check-naming.sh` に `components/ui/` 除外追加
- [x] CLAUDE.md に UI 関連情報追記
- [x] ビルド・lint・カスタムリンター全通過確認

### Phase 1: プロジェクト基盤 (F1, F11, F10) ✅ 完了

Tauri 2 + React初期化から、設定管理・API接続・Anlas表示まで。

- [x] Tauri 2 + React プロジェクト初期化 (`create-tauri-app`)
- [x] `Cargo.toml` に `novelai-api` path dependency追加
- [x] `main.rs`: Tauri bootstrap, AppState登録
- [x] `state.rs`: AppState定義
- [x] `error.rs`: AppError定義 + From実装
- [x] `db.rs`: SQLite接続, WAL, FK有効化, マイグレーション実行
- [x] `migrations/001_init.sql`: 全9テーブル作成 + システムジャンルシード
- [x] Settings: commands/services/repositories
- [x] `initialize_client`: APIキー → NovelAIClient生成
- [x] `get_anlas_balance`: subscription API呼出 → 残高取得
- [x] Project: commands/services/repositories (CRUD + cleanup)
- [x] Frontend: types, lib/ipc, lib/constants
- [x] Frontend: settings-store, project-store
- [x] Frontend: ProjectListPage, ProjectCreateDialog, SettingsDialog
- [x] Frontend: Header (AnlasDisplay, ModelSelector, SizeSelector, ParamControls)

### Phase 2: コア生成機能 (F2, F3) ✅ 完了

メインプロンプト入力 → 画像生成 → 表示 → 履歴。フルスタック垂直スライス。

- [x] models/dto: GenerateRequestDto, GenerateResultDto
- [x] services/generation: パラメータ組立, API呼出, ファイル書込, DB挿入
- [x] commands/images: generate_image, save/delete/get/cleanup
- [x] repositories/image: generated_images CRUD
- [x] Frontend: generation-store, history-store
- [x] Frontend: lib/cost (Anlasコスト計算pure function)
- [x] Frontend: hooks (use-cost-estimate)
- [x] Frontend: GenerationPage (3パネルレイアウト)
- [x] Frontend: LeftPanel (MainPromptSection, PromptTextarea)
- [x] Frontend: CenterPanel (ImageViewer, GenerateButton, SaveControls)
- [x] Frontend: RightPanel (HistoryItem)
- [x] Frontend: Header CostEstimate

### Phase 3: キャラクターシステム (F6) ✅ 完了

マルチキャラクター対応。Phase 2の拡張。

- [x] generation-params-store: characters配列管理 (add/remove/update) + ID付与
- [x] CharacterAddButtons, CharacterSection (プロンプト, ネガティブ, 位置スライダー)
- [x] PositionSliders: shadcn/ui Slider使用, aria-label対応
- [x] services/generation: マルチキャラクターのv4_prompt構築
- [x] 6キャラクター上限バリデーション (Rust service + Frontend)
- [x] Frontend テスト: Store CRUD + コンポーネント描画・操作

### Phase 4: プロンプトグループ (F4, F5, F7) ✅ 完了

ジャンル管理、グループCRUD、システムプロンプト。

- [x] services/system_prompt: CSV読込, インメモリ検索
- [x] resources/danbooru_tags.csv バンドル
- [x] commands/system_prompts: get_categories, search
- [x] repositories/genre, services/genre, commands/genres
- [x] repositories/prompt_group, services/prompt_group, commands/prompt_groups
- [x] Frontend: prompt-group-store
- [x] Frontend: PromptGroupPicker, PromptGroupManager modal
- [x] Frontend: hooks/use-autocomplete (デバウンス付き検索)
- [x] PromptTextareaにオートコンプリート統合
- [x] キャラクター追加時のデフォルトグループ自動適用

### Phase 5: Vibe & スタイル (F8, F9) ✅

Vibeインポート/管理、スタイルプリセット。

- [x] repositories/vibe, services/vibe, commands/vibes
- [x] repositories/style_preset, services/style_preset, commands/style_presets
- [x] services/vibe: .naiv4vibeパース, ファイルコピー, encode_vibe (API呼出 → todo!())
- [x] Frontend: VibeSection (ON/OFF, strength/info_extracted スライダー)
- [x] Frontend: VibeModal (インポート/削除)
- [x] Frontend: ArtistStyleSection, StylePresetModal
- [x] generation-params-store: selectedVibes, artistTags, selectedStylePresetId
- [x] ActionBar: Vibe統合 + artistTags → プロンプトプレフィックス

---

## 5. 変更履歴

| 日付 | 内容 |
|------|------|
| 2026-04-07 | 初版作成 |
| 2026-04-07 | Phase 0 (UI Scaffold) 追加・完了 |
| 2026-04-07 | Phase 1, 2 完了マーク |
| 2026-04-07 | Phase 3 完了マーク |
| 2026-04-08 | Phase 4 完了マーク |
