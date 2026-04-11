# Prompt Group System Overhaul - Multi-Session Implementation Plan

## Context

現在のプロンプトグループは「グループ選択→全タグ一括適用」の仕組みで、キャラクタープロンプトでは使えず、ジャンルは単なる分類でしかない。この改修で以下を実現する:

1. プロンプトグループ内のタグを個別選択可能にする
2. キャラクター・メインプロンプト両方でグループを利用可能にする
3. ジャンルをキャラクタージャンル（犬、ゴブリン等）として再定義し、アイコン・色を持たせる
4. タグに強度(-10~10)とサムネイル画像を設定可能にする
5. ポジション設定をアスペクト比反映の2D矩形UIに刷新する
6. システムプロンプトグループ(CSV由来)を不変グループとして提供する
7. グループ管理画面をカードグリッド+個別モーダルに刷新する
8. タグ追加時にシステムプロンプト予測変換（オートコンプリート）を機能させる

---

## Session 1: DB Migration + Genre/PromptGroup Backend Enhancement

**Goal**: スキーマ変更、Genre更新API追加、PromptGroup新フィールド対応。全テスト通過。フロントエンド変更なし。

### DB Migration (`src-tauri/migrations/009_prompt_group_overhaul.sql`)

```sql
-- Genre: アイコン・色追加
ALTER TABLE genres ADD COLUMN icon TEXT NOT NULL DEFAULT 'user';
ALTER TABLE genres ADD COLUMN color TEXT NOT NULL DEFAULT '#888888';
UPDATE genres SET icon = 'user-round', color = '#3b82f6' WHERE id = 'genre-male';
UPDATE genres SET icon = 'user-round', color = '#ef4444' WHERE id = 'genre-female';
UPDATE genres SET icon = 'circle-help', color = '#888888' WHERE id = 'genre-other';

-- PromptGroup: サムネイル、is_default追加
ALTER TABLE prompt_groups ADD COLUMN thumbnail_path TEXT;
ALTER TABLE prompt_groups ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0;
ALTER TABLE prompt_groups ADD COLUMN category INTEGER;
UPDATE prompt_groups SET is_default = is_default_for_genre;

-- PromptGroupTag: 強度、サムネイル追加
ALTER TABLE prompt_group_tags ADD COLUMN default_strength INTEGER NOT NULL DEFAULT 0;
ALTER TABLE prompt_group_tags ADD COLUMN thumbnail_path TEXT;
```

### Rust Backend Changes

**Models** (`src-tauri/src/models/dto.rs`):
- `GenreRow/GenreDto`: add `icon: String`, `color: String`
- `PromptGroupRow/PromptGroupDto`: add `thumbnail_path`, `is_default`, `category`
- `PromptGroupTagRow/PromptGroupTagDto`: add `default_strength: i32`, `thumbnail_path: Option<String>`
- New `UpdateGenreRequest { id, name?, icon?, color? }`
- New `TagInput { tag, default_strength?, thumbnail_path? }` for create/update requests
- `CreatePromptGroupRequest`: remove `usage_type`, tags を `Vec<TagInput>` に変更
- `UpdatePromptGroupRequest`: `is_default_for_genre` → `is_default`

**Repositories**:
- `genre.rs`: SELECT に `icon, color` 追加。`update()` 関数追加
- `prompt_group.rs`: SELECT に `thumbnail_path, is_default, category` 追加。`replace_tags` が `default_strength`, `thumbnail_path` を受け取るように変更

**Services**:
- `genre.rs`: `update_genre()` 追加。`create_genre()` に icon/color 対応
- `prompt_group.rs`: 新フィールド対応。`is_default_for_genre` ロジックを `is_default` に置換。排他制約削除（1ジャンルに複数デフォルト可。`clear_default_for_genre()` は不要になる）

**Commands**:
- `genres.rs`: `update_genre` コマンド追加
- `lib.rs`: 新コマンド登録

### Files
- **Create**: `src-tauri/migrations/009_prompt_group_overhaul.sql`
- **Modify**: `src-tauri/src/db.rs`, `src-tauri/src/models/dto.rs`, `src-tauri/src/repositories/genre.rs`, `src-tauri/src/repositories/prompt_group.rs`, `src-tauri/src/services/genre.rs`, `src-tauri/src/services/prompt_group.rs`, `src-tauri/src/commands/genres.rs`, `src-tauri/src/commands/prompt_groups.rs`, `src-tauri/src/lib.rs`, `src-tauri/src/test_utils.rs`

### Verification
- `cargo test` 全テスト通過（既存テスト更新含む）
- `cargo clippy --all-targets` 通過
- アプリ起動、既存UI動作確認

---

## Session 2: System Prompt Groups + Frontend Types Alignment

**Goal**: CSVカテゴリからシステムプロンプトグループをDB生成。フロントエンド型定義を新スキーマに合わせ、usage_type UIを除去。

### System Prompt Groups Design

168K件のタグを `prompt_group_tags` に入れるのは非効率。代わりに:
- DB には5つのシステムグループのメタデータのみ格納（`category` カラムでCSVカテゴリと紐付け）
- タグは既存の `SystemPromptDB`（インメモリ）からカテゴリ別にページネーション・検索で提供
- 新コマンド `list_system_group_tags(category, query?, offset, limit)` → `{ tags: SystemTagDto[], totalCount }`

### Rust Backend

**`services/system_prompt.rs`**:
- `seed_system_prompt_groups(conn)`: 初回起動時に5グループ作成 (General/Artist/Works/Character/Meta, category=0/1/3/4/5)
- `lib.rs` の setup で呼び出し

**`commands/system_prompts.rs`**:
- `list_system_group_tags` コマンド追加

### Frontend

**`src/types/index.ts`**:
- `GenreDto`: add `icon`, `color`
- `PromptGroupDto`: add `thumbnailPath`, `isDefault`, `category`. remove `usageType` 依存
- `PromptGroupTagDto`: add `defaultStrength`, `thumbnailPath`
- New `UpdateGenreRequest`, `TagInput`, `ListSystemGroupTagsResponse`

**`src/lib/ipc.ts`**:
- `updateGenre()`, `listSystemGroupTags()` 追加
- `listPromptGroups()` から `usageType` パラメータ除去
- `createPromptGroup()`, `updatePromptGroup()` シグネチャ更新

**`src/stores/prompt-store.ts`**:
- `updateGenre` アクション追加、`usageType` 関連除去

**UI最小修正**:
- `PromptGroupForm.tsx`: usage_type セレクタ除去
- `GenreTabs.tsx`: ジャンルCRUD除去（フィルタタブのみ残す、ジャンルCRUDはSession 4でサイドバーに移動）

### Files
- **Modify**: `src-tauri/src/services/system_prompt.rs`, `src-tauri/src/commands/system_prompts.rs`, `src-tauri/src/lib.rs`, `src-tauri/src/db.rs`, `src/types/index.ts`, `src/lib/ipc.ts`, `src/stores/prompt-store.ts`, `src/components/modals/prompt-group/PromptGroupForm.tsx`, `src/components/modals/prompt-group/GenreTabs.tsx`

### Verification
- `cargo test` 通過（システムグループシーディングテスト含む）
- `npm run test` 通過
- アプリ起動、システムグループがリストに表示される
- `listSystemGroupTags` が正しくページネーション結果を返す

---

## Session 3: Sidebar Prompt Store + Prompt Assembly Logic

**Goal**: サイドバーのプロンプトグループ選択状態を管理する新ストアと、タグを強度付きで連結するプロンプト組立ユーティリティ。UIなし、データモデル+ロジック+テストのみ。

### New Store (`src/stores/sidebar-prompt-store.ts`)

```typescript
// タグの選択状態（サイドバー上のエフェメラルな状態）
interface SidebarPromptTag {
  tagId: string;           // PromptGroupTagDto.id
  tag: string;             // タグテキスト
  enabled: boolean;        // ON/OFF
  strength: number;        // -10~10（デフォルト値から上書き可能）
  defaultStrength: number; // グループ設定のデフォルト強度
  thumbnailPath: string | null;
}

interface SidebarPromptGroup {
  groupId: string;
  groupName: string;
  isSystem: boolean;
  category: number | null;
  tags: SidebarPromptTag[];
  expanded: boolean;       // UIの展開/折りたたみ状態
}

interface TargetPromptState {
  groups: SidebarPromptGroup[];
  freeText: string;  // グループ選択とは別の手動追記プロンプト
}

// Key: "main" = メインプロンプト, character.id = キャラクター
targets: Record<string, TargetPromptState>
```

Actions: `addGroupToTarget`, `removeGroupFromTarget`, `toggleTag`, `setTagStrength`, `toggleGroupExpanded`, `initTarget`, `removeTarget`, `addSystemTag`, `removeSystemTag`, `setFreeText`

### Prompt Assembly (`src/lib/prompt-assembly.ts`)

```typescript
// 強度フォーマット: コロン構文
// strength 3 → "3::smile::"、strength -2 → "-2::smile::"、strength 0 → "smile"
function formatTagWithStrength(tag: string, strength: number): string;
function assemblePrompt(groups: SidebarPromptGroup[]): string;
// フリーテキスト + グループタグを連結
function assembleFullPrompt(freeText: string, groups: SidebarPromptGroup[]): string;
```

### Files
- **Create**: `src/stores/sidebar-prompt-store.ts`, `src/lib/prompt-assembly.ts`, テストファイル
- **Reuse**: `src/hooks/use-autocomplete.ts` (既存、Session 4/6 のUI実装で活用)

### Verification
- `npm run test` 新規テスト全通過
- `npm run build` コンパイルエラーなし

---

## Session 4: Sidebar Character Section Overhaul + Genre CRUD

**Goal**: キャラクター追加UIをジャンル対応に刷新。ジャンルCRUDをサイドバーに移動。キャラクターにグループ選択UIを追加。

### Genre Icons & Colors (`src/lib/genre-icons.ts`)
- `GENRE_ICONS`: ~30個のLucideアイコン（user, cat, dog, bird, skull, crown, heart, star, ghost, bug, fish, rabbit, snail, squirrel, turtle, etc.）
- `GENRE_COLORS`: ~12色の定義済みカラーパレット

### New/Modified Components

**`GenreEditorPopover.tsx`** (新規):
- ジャンル作成/編集ポップオーバー: 名前、アイコンピッカー（グリッド）、カラーピッカー

**`CharacterAddButtons.tsx`** (大幅改修):
- Male/Female 直接ボタン
- "その他" → DropdownMenu でユーザー追加ジャンル表示
- "+" ボタンで GenreEditorPopover 表示
- キャラクター追加時: `sidebar-prompt-store.initTarget(char.id, defaultGroups)` 呼び出し

**`CharacterSection.tsx`** (分割・改修):
- `CharacterHeader.tsx`: 折りたたみヘッダー（ジャンルアイコン+色、ラベル、折りたたみ/削除ボタン）
- `CharacterPromptGroups.tsx`: アクティブグループ一覧、タグON/OFF・強度スライダー、グループ追加/削除、プロンプトプレビュー（折りたたみ可）、フリーテキスト追記欄（グループタグ + 手動プロンプトのハイブリッド）。フリーテキスト追記欄では `useAutocomplete` フック (`src/hooks/use-autocomplete.ts`) によるシステムプロンプト予測変換が動作する
- `CharacterSection.tsx`: 上記をコンポーズ

**`GroupBrowserModal.tsx`** (新規):
- グループをターゲット（キャラクター or メインプロンプト）に追加するモーダル
- ジャンルフィルタ → グループ一覧 → タグ一覧の階層展開
- システムグループ: 検索フィールド + ページネーション結果

**`generation-params-store.ts`** 更新:
- `Character` に `genreId`, `genreIcon`, `genreColor` 追加
- `addCharacter` がジャンルオブジェクトを受け取るように変更

### Files
- **Create**: `src/lib/genre-icons.ts`, `src/components/left-panel/GenreEditorPopover.tsx`, `src/components/left-panel/CharacterHeader.tsx`, `src/components/left-panel/CharacterPromptGroups.tsx`, `src/components/modals/GroupBrowserModal.tsx`
- **Modify**: `src/components/left-panel/CharacterAddButtons.tsx`, `src/components/left-panel/CharacterSection.tsx`, `src/stores/generation-params-store.ts`, `src/i18n/ja.json`, `src/i18n/en.json`

### Verification
- ジャンル作成/編集がサイドバーから可能
- キャラクター追加でデフォルトグループが表示される
- グループ展開、タグON/OFF、強度調整が動作
- フリーテキスト追記欄で予測変換が動作する
- プロンプトプレビューが正しく表示される

---

## Session 5: Main Prompt Section + Position UI

**Goal**: メインプロンプトにもグループ選択機構を追加（ハイブリッド: フリーテキスト + グループ）。ポジション設定をアスペクト比反映2D矩形UIに刷新。

### MainPromptSection.tsx 改修
- フリーテキスト textarea は維持（`useAutocomplete` による予測変換付き、既存 `PromptTextarea` を活用）
- その下にアクティブグループ一覧（CharacterPromptGroups と同じ仕組み、target="main"）
- "グループ追加" ボタン → GroupBrowserModal (target="main")
- 折りたたみ可能な最終プロンプトプレビュー（フリーテキスト + グループタグ連結）
- 既存 `PromptGroupPicker.tsx` は削除（新グループ選択システムに置換）

### PositionEditor.tsx (新規、PositionSliders.tsx を置換)
- 生成パラメータの width/height からアスペクト比を算出した矩形を表示
- 上辺に X スライダー、左辺に Y スライダー
- 矩形内にキャラクターアイコンを座標位置に表示（ジャンルの icon + color 使用）
- Female=赤、Male=青、カスタムジャンル=ユーザー設定アイコン+色
- 全キャラクターの位置が全てのキャラクターの矩形に反映
- 現在のキャラクターはハイライト/大きめ表示
- 矩形内クリックで座標設定可能
- キャラクターセクション、ポジション表示はそれぞれ折りたたみ可能

### Files
- **Create**: `src/components/left-panel/PositionEditor.tsx`
- **Modify**: `src/components/left-panel/MainPromptSection.tsx`, `src/components/left-panel/CharacterSection.tsx`
- **Delete**: `src/components/left-panel/PromptGroupPicker.tsx`, `src/components/left-panel/PositionSliders.tsx`

### Verification
- メインプロンプト: フリーテキスト + グループ選択のハイブリッド動作
- フリーテキスト入力時に予測変換が動作する
- ポジションエディタ: アスペクト比反映、アイコン表示、クリック配置
- 全キャラクターの位置が相互に表示される

---

## Session 6: Prompt Group Management UI Overhaul

**Goal**: グループ管理画面をカードグリッド+個別モーダルに刷新。サムネイル、タグ別サムネイル、デフォルト強度の管理UI。タグ追加時に予測変換。

### Backend
- `services/prompt_group.rs`: `update_prompt_group_thumbnail` 追加
- `commands/prompt_groups.rs`: `update_prompt_group_thumbnail` コマンド追加
- タグサムネイル更新: `update_prompt_group` の tags 更新時に `thumbnail_path` も受け取る

### Frontend Components (全面刷新)

**`PromptGroupGrid.tsx`** (新規):
- カードグリッドレイアウト: サムネイル（or プレースホルダー）、名前、ジャンルバッジ、タグ数、デフォルトバッジ
- ジャンルフィルタドロップダウン（選択のみ、CRUD なし）
- 検索フィールド
- "グループ追加" ボタン

**`PromptGroupAddModal.tsx`** (新規):
- 名前、ジャンルセレクタ、サムネイルアップロード、デフォルト設定、TagEditor

**`PromptGroupEditModal.tsx`** (新規):
- 編集モーダル（追加モーダルと同様、既存値をプリポピュレート）
- 削除ボタン（非システムグループのみ、確認ダイアログ付き）

**`TagEditor.tsx`** (新規):
- 再利用可能なタグ管理コンポーネント
- タグ一覧: 名前、サムネイル（任意アップロード）、デフォルト強度スライダー (-10~+10)、削除ボタン
- **タグ追加: `useAutocomplete` フック (`src/hooks/use-autocomplete.ts`) を使用したシステムプロンプト予測変換付き入力**。既存の `PromptTextarea` や `ArtistTagInput` (`src/components/modals/ArtistTagInput.tsx`) の予測変換パターンを参考に実装
- カテゴリフィルタ対応（`useAutocomplete(delay, category)` の category パラメータを活用）

**`PromptGroupModal.tsx`** 改修:
- 外側の Dialog シェルのみ。PromptGroupGrid を含む
- サブモーダル（Add/Edit）を開く

### Existing Patterns to Reuse
- `src/hooks/use-autocomplete.ts`: debounced system prompt search hook
- `src/components/modals/ArtistTagInput.tsx`: autocomplete dropdown UI pattern (search input + results list + click to select)
- `src/components/shared/PromptTextarea.tsx`: inline autocomplete in textarea

### Files
- **Create**: `src/components/modals/prompt-group/PromptGroupGrid.tsx`, `src/components/modals/prompt-group/PromptGroupAddModal.tsx`, `src/components/modals/prompt-group/PromptGroupEditModal.tsx`, `src/components/modals/prompt-group/TagEditor.tsx`
- **Modify**: `src/components/modals/PromptGroupModal.tsx`, `src/lib/ipc.ts`, `src/types/index.ts`, `src-tauri/src/services/prompt_group.rs`, `src-tauri/src/commands/prompt_groups.rs`, `src-tauri/src/lib.rs`
- **Delete**: `src/components/modals/prompt-group/GenreTabs.tsx`, `src/components/modals/prompt-group/PromptGroupForm.tsx`

### Verification
- カードグリッド表示、サムネイル表示
- グループ作成/編集/削除
- **タグ追加時にシステムプロンプト予測変換が動作する**
- タグ別サムネイルアップロード
- デフォルト強度スライダー動作
- システムグループは表示のみ（編集/削除不可）

---

## Session 7: Generation Flow Integration + Persistence + Cleanup

**Goal**: 全体結合。サイドバーストアからプロンプト組立→生成API送信。状態永続化。不要コード除去。

### Generation Flow Integration
- 生成実行時にプロンプト組立:
  - メイン: `assembleFullPrompt(freeText, sidebarPromptStore.targets["main"].groups)`
  - キャラクター: `assembleFullPrompt(freeText, sidebarPromptStore.targets[char.id].groups)`
- バックエンドは組立済み文字列を受け取る（バックエンド変更なし）

### Sidebar State Persistence
- `sidebar-prompt-store.ts` に `saveSidebarPromptState(projectId)` / `loadSidebarPromptState(projectId)` 追加
- 既存の settings key-value ストアを使用（`sidebarPresets` と同パターン）
- プロジェクト切替時に load、状態変更時に debounced save

### Store Integration
- `addCharacter` 時に `sidebar-prompt-store.initTarget(charId, defaultGroups)` 呼び出し
- `removeCharacter` 時に `sidebar-prompt-store.removeTarget(charId)` 呼び出し

### Cleanup
- フロントエンドから `usage_type` 参照を全除去
- `isDefaultForGenre` → `isDefault` 移行完了
- i18n: 未使用キー削除、新キー翻訳確認
- 不要コード（旧 handleInsertTags パターン等）除去
- 全テスト更新

### Files
- **Modify**: `src/stores/sidebar-prompt-store.ts`, `src/stores/generation-params-store.ts`, `src/components/left-panel/MainPromptSection.tsx`, `src/components/left-panel/CharacterSection.tsx`, `src/i18n/ja.json`, `src/i18n/en.json`, 各テストファイル

### Verification (End-to-End)
1. キャラクター追加 → ジャンル選択 → デフォルトグループ表示 → タグ選択 → 強度調整 → 画像生成 → API に正しいプロンプト送信
2. メインプロンプト: フリーテキスト + グループ選択 → 正しい組立結果
3. プロジェクト切替 → サイドバー状態復元
4. `npm run test`, `npm run build`, `cargo test`, `cargo clippy --all-targets` 全通過

---

## Key Design Decisions

| 決定事項 | 理由 |
|---------|------|
| システムグループはDBにメタデータのみ格納、タグはインメモリ検索 | 168K件をSQLiteに入れるのは非効率。既存 `SystemPromptDB` を活用 |
| サイドバー状態はフロントエンドのみ（settings KV で永続化） | 新DBテーブル不要。`sidebarPresets` と同パターン |
| プロンプト組立はフロントエンドで実行 | バックエンドは組立済み文字列を受け取る。変更最小化 |
| `usage_type` カラムはDB残置、コード上は無視 | 破壊的マイグレーション回避 |
| **強度フォーマット: コロン構文** `3::smile::` | ユーザー選択。強度0はプレーンタグ |
| タグ別サムネイルは `prompt_group_tags.thumbnail_path` に格納 | カスタムグループのタグのみ今回対応 |
| **システムタグのサムネイルは後回し** | 将来的に同梱 or 外部ストレージで対応（後日決定） |
| **is_default は1ジャンルに複数可** | 排他制約なし。キャラクター追加時に全デフォルトグループがサイドバーに表示される |
| **連結表示の編集はハイブリッド** | タグUI操作（ON/OFF・強度）+ フリーテキスト追記欄を併設。グループタグと手動追加プロンプトを両方サポート |
| **タグ追加時に予測変換** | 既存 `useAutocomplete` フック + `ArtistTagInput` パターンを再利用。TagEditor と フリーテキスト追記欄の両方で機能 |

## Existing Utilities to Reuse

| ユーティリティ | パス | 用途 |
|-------------|------|------|
| `useAutocomplete` | `src/hooks/use-autocomplete.ts` | システムプロンプト検索（debounced、カテゴリフィルタ対応） |
| `useDebounce` | `src/hooks/use-debounce.ts` | 値のデバウンス |
| `PromptTextarea` | `src/components/shared/PromptTextarea.tsx` | インライン予測変換付きテキストエリア |
| `ArtistTagInput` | `src/components/modals/ArtistTagInput.tsx` | ドロップダウン式予測変換タグ入力のUIパターン |
| `SystemPromptDB` | `src-tauri/src/services/system_prompt.rs` | インメモリタグDB（CSV由来） |
| `searchSystemPrompts` | `src/lib/ipc.ts` | IPC経由のシステムプロンプト検索 |

## Session Dependency Graph

```
Session 1 (DB + Backend)
    |
Session 2 (System Groups + Types)
    |
Session 3 (Store + Assembly Logic)
    |
Session 4 (Sidebar Characters + Genre CRUD)     Session 6 (Management UI)
    |                                              |
Session 5 (Main Prompt + Position UI)         (Session 2以降で独立して並行可能)
    |                                              |
    +----------------------------------------------+
    |
Session 7 (Integration + Cleanup)
```

Session 4 と Session 6 は互いに独立で並行実装可能。Session 7 は全セッション完了後の統合。
