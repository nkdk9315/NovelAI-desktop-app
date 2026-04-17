# 実装計画

## 1. ディレクトリ構成

> 本ディレクトリツリーは `src-tauri/src/{commands,services,repositories}/mod.rs` および `src/{stores,lib,components,hooks,pages}` の実体を単一真実源とする。テスト専用 `*_tests.rs` は除外して数える。

**モジュール数サマリ**: commands 17 / services 22 / repositories 17 / frontend stores 12 / ipc modules 5

```
src-tauri/
├── Cargo.toml
├── tauri.conf.json
├── build.rs
├── resources/
│   └── danbooru_tags.csv                # バンドルCSV
├── migrations/
│   └── 001_init.sql 〜 026_*.sql         # 順次追加（現在 026 まで）
└── src/
    ├── main.rs / state.rs / error.rs / db.rs
    ├── commands/                        # 17 モジュール
    │   ├── settings.rs                  # KVS, APIクライアント初期化, Anlas
    │   ├── projects.rs                  # Project CRUD / open / cleanup
    │   ├── images.rs                    # generate / estimate_cost / save / delete
    │   ├── prompt_groups.rs             # PromptGroup CRUD + タグ差し替え
    │   ├── prompt_group_folders.rs      # PromptGroup 用フォルダ木 CRUD
    │   ├── genres.rs                    # Genre CRUD + デフォルト紐付け
    │   ├── vibes.rs                     # Vibe import/delete/encode
    │   ├── vibe_folders.rs              # Vibe 用フォルダ木 CRUD
    │   ├── style_presets.rs             # StylePreset CRUD + Vibe junction
    │   ├── style_preset_folders.rs      # StylePreset 用フォルダ木 CRUD
    │   ├── system_group_settings.rs     # system グループ is_enabled 上書き
    │   ├── system_prompts.rs            # 内蔵プロンプト検索
    │   ├── tags.rs                      # Tag DB 検索・お気に入り・グループ
    │   ├── tokens.rs                    # CLIP トークンカウント
    │   ├── prompt_presets.rs            # PromptPreset + キャラクタースロット
    │   ├── preset_folders.rs            # PromptPreset 用フォルダ木 CRUD
    │   └── sidebar_preset_groups.rs     # サイドバープリセットグループ
    ├── services/                        # 22 モジュール（テスト除く）
    │   ├── settings / project / project_vibe / image / generation
    │   ├── prompt_group / prompt_group_folder / prompt_preset / preset_folder
    │   ├── genre / system_prompt / system_group_settings
    │   ├── vibe / vibe_encode / vibe_folder
    │   ├── style_preset / style_preset_folder
    │   ├── sidebar_preset_group
    │   ├── tag / tag_seed / tag_seed_csv
    │   └── tokens
    ├── repositories/                    # 17 モジュール（テスト除く）
    │   ├── settings / project / project_vibe / image
    │   ├── prompt_group / prompt_group_folder / prompt_preset / preset_folder
    │   ├── genre / system_group_settings
    │   ├── vibe / vibe_folder
    │   ├── style_preset / style_preset_folder
    │   ├── sidebar_preset_group
    │   └── tag / tag_favorite
    └── models/
        ├── mod.rs
        └── dto.rs                       # IPC用DTO (Serialize/Deserialize)

src/
├── main.tsx / App.tsx / index.css
├── lib/                                 # 5 IPC + ユーティリティ
│   ├── ipc.ts / ipc-assets.ts / ipc-preset.ts / ipc-prompt.ts / ipc-tags.ts
│   ├── cost.ts / constants.ts / utils.ts
│   ├── prompt-assembly.ts / preset-contributions.ts / preset-positions.ts
│   ├── normalize-strength.ts / random-preset.ts / vibe-utils.ts
│   ├── genre-icons.ts / toast-error.ts
├── types/index.ts                       # 全TS型定義
├── stores/                              # 12 stores
│   ├── settings-store / project-store
│   ├── generation-store / generation-params-store
│   ├── history-store / prompt-store / preset-store
│   ├── sidebar-prompt-store / sidebar-preset-group-store / sidebar-artist-tags-store
│   ├── layout-store                     # サイドバー幅（動的リサイズ, PR #25）
│   └── theme-store                      # ダーク/ライト切替
├── hooks/                               # use-debounce / use-autocomplete / use-cost-estimate /
│                                        # use-artist-tag-input / use-prompt-token-counts
├── components/                          # 100+ コンポーネント
│   ├── ui/                              # shadcn/ui primitives
│   ├── header/ / left-panel/ / center-panel/ / right-panel/ / modals/ / shared/
├── pages/
│   ├── ProjectListPage.tsx / GenerationPage.tsx
└── i18n/                                # ja.json / en.json
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

### Phase 6: Folder 階層管理 ✅ 完了

PromptGroup / Vibe / StylePreset / PromptPreset をフォルダ木で整理。

- [x] migration: `prompt_group_folders`, `vibe_folders`, `style_preset_folders`, `preset_folders` テーブル（parent_id 自己参照）
- [x] repositories/services/commands: Folder 系 4 セット（共通 CRUD: list_tree / rename / move / reorder / delete_cascade）
- [x] Frontend: 各マネージャーモーダルのフォルダツリー UI 化

### Phase 7: Tag DB & Seed ✅ 完了

Danbooru タグを SQLite FTS5 に格納し全文検索。

- [x] migration 013-014: `tags` / `tags_fts` / `tag_groups` / `tag_group_members`
- [x] services/tag_seed + tag_seed_csv: 起動時 CSV → DB seed（進捗通知）
- [x] repositories/tag + tag_favorite
- [x] commands/tags: 検索・お気に入り・グループ操作
- [x] Frontend: useAutocomplete / sidebar-artist-tags-store を Tag DB 経由に移行

### Phase 8: Prompt Preset & Sidebar Preset Group ✅ 完了

複数キャラクタースロットを含むプロンプトプリセットと、サイドバーでの組合せ切替。

- [x] migration 022-026: `prompt_presets`, `preset_character_slots`, `sidebar_preset_group_instances`, `sidebar_preset_group_active_presets`, `sort_key`
- [x] repositories/services/commands: prompt_preset, preset_folder, sidebar_preset_group
- [x] Frontend: preset-store, sidebar-preset-group-store, PresetModalContent, サイドバーカードグループ

### Phase 9: Token Counter ✅ 完了

プロンプト token 数のリアルタイム表示。

- [x] services/tokens: CLIP トークナイザ
- [x] commands/tokens: count_tokens / get_max_prompt_tokens
- [x] Frontend: usePromptTokenCounts, TokenCounter コンポーネント

### Phase 10: UI Refresh (PR #22–#25) ✅ 完了

- [x] #22 (b7f044a): テーマ / タイポグラフィ刷新（IBM Plex Sans + Noto Sans JP + JetBrains Mono, Tailwind v4 `@theme`）
- [x] #23 (34162d1): Primary hue を cyan(195) → blue(230) に変更
- [x] #24 (1318294): カスタム画像サイズ入力 + グループ化プリセット
- [x] #25 (90e1ef2): サイドバードラッグリサイズ（layout-store, localStorage 永続化）

---

## 5. 変更履歴

| 日付 | 内容 |
|------|------|
| 2026-04-07 | 初版作成 |
| 2026-04-07 | Phase 0 (UI Scaffold) 追加・完了 |
| 2026-04-07 | Phase 1, 2 完了マーク |
| 2026-04-07 | Phase 3 完了マーク |
| 2026-04-08 | Phase 4 完了マーク |
| 2026-04-08 | Phase 5 完了マーク |
| 2026-04-17 | doc-refresh: ディレクトリ構成を実装（17/22/17）に正準化、Phase 6〜10 を追記 |
