# Frontend Types & Utilities (TypeScript)

## 5.1 型定義

```typescript
// --- src/types/index.ts ---

// ---- Entities ----

export interface ProjectDto {
  id: string;
  name: string;
  projectType: string;
  directoryPath: string;
  thumbnailPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GenreDto {
  id: string;
  name: string;
  isSystem: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface PromptGroupDto {
  id: string;
  name: string;
  defaultGenreIds: string[];
  isSystem: boolean;
  usageType: "main" | "character" | "both";
  tags: PromptGroupTagDto[];
  createdAt: string;
  updatedAt: string;
  thumbnailPath: string | null;
  isDefault: boolean;
  category: number | null;
  defaultStrength: number;
  randomMode: boolean;
  randomCount: number;
  randomSource: string;
  wildcardToken: string | null;
}

export interface PromptGroupTagDto {
  id: string;
  name: string;
  tag: string;
  sortOrder: number;
  defaultStrength: number;
  thumbnailPath: string | null;
}

export interface GeneratedImageDto {
  id: string;
  projectId: string;
  filePath: string;
  seed: number;
  promptSnapshot: Record<string, unknown>;
  width: number;
  height: number;
  model: string;
  isSaved: boolean;
  createdAt: string;
}

export interface VibeDto {
  id: string;
  name: string;
  filePath: string;
  model: string;
  createdAt: string;
}

export interface StylePresetDto {
  id: string;
  name: string;
  artistTags: string[];
  vibeIds: string[];
  createdAt: string;
}

export interface AnlasBalanceDto {
  anlas: number;
  tier: number;
}

export interface CostResultDto {
  totalCost: number;
  isOpusFree: boolean;
}

export interface CategoryDto {
  id: number;
  name: string;
  count: number;
}

export interface SystemTagDto {
  name: string;
  category: number;
  postCount: number;
  aliases: string[];
}

// ---- Requests ----

export interface CreateProjectRequest {
  name: string;
  projectType: string;
  directoryPath?: string; // 省略時はバックエンドでデフォルトパスを自動計算
  thumbnailPath?: string | null;
}

export interface UpdateProjectRequest {
  id: string;
  name?: string;
  thumbnailPath?: string | null; // null = クリア, string = セット, undefined = 変更なし
}

export interface GenerateImageRequest {
  projectId: string;
  prompt: string;
  negativePrompt?: string;
  characters?: CharacterRequest[];
  vibes?: VibeReference[];
  width: number;
  height: number;
  steps: number;
  scale: number;
  cfgRescale: number;
  seed?: number;
  sampler: string;
  noiseSchedule: string;
  model: string;
  action: GenerateActionRequest;
}

export interface CharacterRequest {
  prompt: string;
  centerX: number;
  centerY: number;
  negativePrompt: string;
}

export interface VibeReference {
  vibeId: string;
  strength: number;
  infoExtracted: number;
}

export type GenerateActionRequest =
  | { type: "generate" }
  | { type: "img2Img"; sourceImageBase64: string; strength: number; noise: number }
  | { type: "infill"; sourceImageBase64: string; maskBase64: string; maskStrength: number; colorCorrect: boolean };

export interface GenerateImageResponse {
  id: string;
  base64Image: string;
  seed: number;
  filePath: string;
  anlasRemaining?: number;
  anlasConsumed?: number;
}

export interface CostEstimateRequest {
  width: number;
  height: number;
  steps: number;
  vibeCount: number;
  hasCharacterReference: boolean;
  tier: number;
}

export interface TagInput { name?: string; tag: string; negativePrompt?: string; defaultStrength?: number; thumbnailPath?: string; }

export interface CreatePromptGroupRequest {
  name: string;
  defaultGenreIds: string[];
  tags: TagInput[];
  defaultStrength?: number;
}

export interface UpdatePromptGroupRequest {
  id: string;
  name?: string;
  defaultGenreIds?: string[];
  tags?: TagInput[];
  isDefault?: boolean;
  thumbnailPath?: string | null;
  defaultStrength?: number;
  randomMode?: boolean;
  randomCount?: number;
  randomSource?: string;
  wildcardToken?: string | null;
}

export interface CreateGenreRequest {
  name: string;
}

export interface AddVibeRequest {
  filePath: string;
  name: string;
}

export interface EncodeVibeRequest {
  imagePath: string;
  model: string;
  name: string;
}

export interface CreateStylePresetRequest {
  name: string;
  artistTags: string[];
  vibeIds: string[];
}

export interface UpdateStylePresetRequest {
  id: string;
  name?: string;
  artistTags?: string[];
  vibeIds?: string[];
}

// ---- Error ----

export interface AppError {
  kind: "NotFound" | "Validation" | "Database" | "ApiClient" | "Io" | "NotInitialized";
  message: string;
}
```

## 5.2 IPC Wrapper

```typescript
// --- src/lib/ipc.ts ---

import { invoke } from "@tauri-apps/api/core";
import type {
  ProjectDto, GenreDto, PromptGroupDto, GeneratedImageDto,
  VibeDto, StylePresetDto, AnlasBalanceDto, CostResultDto,
  CategoryDto, SystemTagDto, GenerateImageResponse,
  CreateProjectRequest, UpdateProjectRequest, GenerateImageRequest, CostEstimateRequest,
  CreatePromptGroupRequest, UpdatePromptGroupRequest, CreateGenreRequest,
  AddVibeRequest, EncodeVibeRequest, CreateStylePresetRequest,
  UpdateStylePresetRequest,
} from "@/types";

// ---- Settings ----

export function getSettings(): Promise<Record<string, string>> {
  return invoke("get_settings");
}

export function setSetting(key: string, value: string): Promise<void> {
  return invoke("set_setting", { key, value });
}

export function initializeClient(apiKey: string): Promise<void> {
  return invoke("initialize_client", { apiKey });
}

export function getAnlasBalance(): Promise<AnlasBalanceDto> {
  return invoke("get_anlas_balance");
}

// ---- Projects ----

export function listProjects(search?: string, projectType?: string): Promise<ProjectDto[]> {
  return invoke("list_projects", { search, projectType });
}

export function createProject(req: CreateProjectRequest): Promise<ProjectDto> {
  return invoke("create_project", { req });
}

export function updateProject(req: UpdateProjectRequest): Promise<ProjectDto> {
  return invoke("update_project", { req });
}

export function updateProjectThumbnail(id: string, thumbnailPath?: string | null): Promise<ProjectDto> {
  return invoke("update_project_thumbnail", { id, thumbnailPath });
}

export function getDefaultProjectDir(projectType: string, name: string): Promise<string> {
  return invoke("get_default_project_dir", { projectType, name });
}

export function openProject(id: string): Promise<ProjectDto> {
  return invoke("open_project", { id });
}

export function deleteProject(id: string): Promise<void> {
  return invoke("delete_project", { id });
}

// ---- Images ----

export function generateImage(req: GenerateImageRequest): Promise<GenerateImageResponse> {
  return invoke("generate_image", { req });
}

export function estimateCost(req: CostEstimateRequest): Promise<CostResultDto> {
  return invoke("estimate_cost", { req });
}

export function saveImage(imageId: string): Promise<void> {
  return invoke("save_image", { imageId });
}

export function saveAllImages(projectId: string): Promise<void> {
  return invoke("save_all_images", { projectId });
}

export function deleteImage(imageId: string): Promise<void> {
  return invoke("delete_image", { imageId });
}

export function getProjectImages(
  projectId: string,
  savedOnly?: boolean,
): Promise<GeneratedImageDto[]> {
  return invoke("get_project_images", { projectId, savedOnly });
}

export function cleanupUnsavedImages(projectId: string): Promise<void> {
  return invoke("cleanup_unsaved_images", { projectId });
}

// ---- Prompt Groups ----

export function listPromptGroups(
  genreId?: string,
  usageType?: string,
  search?: string,
): Promise<PromptGroupDto[]> {
  return invoke("list_prompt_groups", { genreId, usageType, search });
}

export function getPromptGroup(id: string): Promise<PromptGroupDto> {
  return invoke("get_prompt_group", { id });
}

export function createPromptGroup(req: CreatePromptGroupRequest): Promise<PromptGroupDto> {
  return invoke("create_prompt_group", { req });
}

export function updatePromptGroup(req: UpdatePromptGroupRequest): Promise<void> {
  return invoke("update_prompt_group", { req });
}

export function deletePromptGroup(id: string): Promise<void> {
  return invoke("delete_prompt_group", { id });
}

// ---- Genres ----

export function listGenres(): Promise<GenreDto[]> {
  return invoke("list_genres");
}

export function createGenre(req: CreateGenreRequest): Promise<GenreDto> {
  return invoke("create_genre", { req });
}

export function deleteGenre(id: string): Promise<void> {
  return invoke("delete_genre", { id });
}

// ---- Vibes ----

export function listVibes(): Promise<VibeDto[]> {
  return invoke("list_vibes");
}

export function addVibe(req: AddVibeRequest): Promise<VibeDto> {
  return invoke("add_vibe", { req });
}

export function deleteVibe(id: string): Promise<void> {
  return invoke("delete_vibe", { id });
}

export function encodeVibe(req: EncodeVibeRequest): Promise<VibeDto> {
  return invoke("encode_vibe", { req });
}

// ---- Style Presets ----

export function listStylePresets(): Promise<StylePresetDto[]> {
  return invoke("list_style_presets");
}

export function createStylePreset(req: CreateStylePresetRequest): Promise<StylePresetDto> {
  return invoke("create_style_preset", { req });
}

export function updateStylePreset(req: UpdateStylePresetRequest): Promise<void> {
  return invoke("update_style_preset", { req });
}

export function deleteStylePreset(id: string): Promise<void> {
  return invoke("delete_style_preset", { id });
}

// ---- System Prompts ----

export function getSystemPromptCategories(): Promise<CategoryDto[]> {
  return invoke("get_system_prompt_categories");
}

export function searchSystemPrompts(
  query: string,
  category?: number,
  limit?: number,
): Promise<SystemTagDto[]> {
  return invoke("search_system_prompts", { query, category, limit });
}
```

## 5.3 IPC ラッパー — Tag DB (`src/lib/ipc-tags.ts`)

| 関数 | 引数 | 戻り値 | 説明 |
|---|---|---|---|
| `searchTags` | query, groupId?, limit? | `TagDto[]` | FTS5 trigram 検索 |
| `searchTagsWithGroups` | query, limit? | `TagWithGroupsDto[]` | グローバル検索（所属グループ付き） |
| `listTagGroupRoots` | — | `TagGroupDto[]` | ルートグループ一覧 |
| `getTagGroup` | groupId | `TagGroupDto` | 単一グループ取得 |
| `listTagGroupChildren` | parentId | `TagGroupDto[]` | 子グループ一覧 |
| `listTagGroupTags` | groupId, limit? | `TagDto[]` | グループのタグ一覧 |
| `listUnclassifiedCharacterTags` | limit? | `TagDto[]` | 未分類キャラタグ一覧 |
| `listOrphanTagsByCategory` | csvCategory, letterBucket?, limit? | `TagDto[]` | カテゴリ別孤立タグ一覧 |
| `createUserTagGroup` | parentId?, title | `TagGroupDto` | ユーザグループ作成 |
| `renameTagGroup` | groupId, title | `void` | グループ名変更 |
| `deleteTagGroup` | groupId | `void` | グループ削除 |
| `moveTagGroup` | groupId, newParentId? | `void` | グループ移動 |
| `addTagsToGroup` | groupId, tagIds | `number` | タグをグループに追加 |
| `removeTagsFromGroup` | groupId, tagIds | `number` | タグをグループから削除 |
| `listFavoriteTagGroupRoots` | — | `TagGroupDto[]` | お気に入りルートグループ一覧 |
| `listFavoriteTagGroupChildren` | parentId | `TagGroupDto[]` | お気に入り子グループ一覧 |
| `toggleTagGroupFavorite` | groupId | `boolean` | お気に入りトグル（新状態を返す） |
| `countTagMembersPerGroup` | — | `CountByIdDto[]` | グループ別メンバータグ数 |
| `countFavoriteDescendantsPerGroup` | — | `CountByIdDto[]` | グループ別お気に入り子孫数 |

---

## 6.1 Sidebar Prompt Store (`src/stores/sidebar-prompt-store.ts`)

### SidebarPromptTag

```typescript
export interface SidebarPromptTag {
  tagId: string;
  name: string;
  tag: string;
  negativePrompt: string;   // 021: per-entry negative prompt
  enabled: boolean;
  strength: number;
  defaultStrength: number;
  thumbnailPath: string | null;
}
```

### TargetPromptState

```typescript
export interface TargetPromptState {
  groups: SidebarPromptGroup[];
  freeText: string;
  promptOverride: string | null;
  negativeOverride: string | null;  // 021: negative prompt override per target
}
```

### useSidebarPromptStore — アクション (抜粋)

```typescript
setNegativeOverride(targetId: string, text: string): void
clearNegativeOverride(targetId: string): void
```

`negativeOverride` が `null` のとき `assembleNegativeFromGroups()` の結果がネガティブプロンプトとして使われる。非 `null` のとき override 値が優先される。

---

## 6.2 Prompt Assembly (`src/lib/prompt-assembly.ts`)

```typescript
export function assembleNegativeFromGroups(
  groups: SidebarPromptGroup[],
  opts?: AssembleOptions,
): string
```

各グループの有効タグ（`enabled: true`）から `negativePrompt` を収集し `, ` で結合して返す。
- 空文字列の `negativePrompt` はスキップ
- `mode: "generate"` かつ `randomMode: true` のグループはランダム選択ロジックを適用

---

## 6.3 toastError (`src/lib/toast-error.ts`)

```typescript
export function toastError(message: string): void
```

`toast.error()` を Sonner の `action` オプション付きでラップするヘルパー。

- アクションボタン: `lucide-react` の Copy アイコン（`React.createElement` で生成）
- クリック時: `navigator.clipboard.writeText(message)` → `toast.success(i18n.t("common.copied"))`
- 全モーダル・ページで `toast.error()` の代わりに使用する

---

## 6.4 useSidebarArtistTagsStore (`src/stores/sidebar-artist-tags-store.ts`)

プロジェクト別に永続化されるサイドバー直接入力アーティストタグを管理するストア。

| 状態 / アクション | 型 | 説明 |
|---|---|---|
| `sidebarArtistTags` | `ArtistTag[]` | 直接入力したアーティストタグ一覧 |
| `addSidebarArtistTag(name)` | `void` | タグを追加（重複は無視） |
| `removeSidebarArtistTag(name)` | `void` | タグを削除 |
| `updateSidebarArtistTagStrength(name, strength)` | `void` | 強度を更新 |
| `saveSidebarArtistTags(projectId)` | `void` | settings に保存（fire-and-forget） |
| `loadSidebarArtistTags(projectId)` | `Promise<void>` | settings から復元 |

---

## 6.5 useArtistTagInput (`src/hooks/use-artist-tag-input.ts`)

アーティストタグ入力のオートコンプリートロジックを共有するカスタムフック。
`SidebarArtistTagInput` と `PresetTweakPanel` で使用。

```typescript
function useArtistTagInput(onAdd: (name: string) => void): {
  tagInput: string;
  showSuggestions: boolean;
  highlightIndex: number;
  suggestionRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>;
  filteredSuggestions: AutocompleteResult[];
  handleInputChange: (value: string) => void;
  handleAdd: (name: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur: () => void;
}
```

- `onAdd`: タグ確定時に呼ばれるコールバック（重複チェック等のビジネスロジックは呼び出し元で実装）
- `handleAdd` はタグ確定・入力クリア・サジェスト非表示を一括処理
- キーボード操作: ArrowDown/Up・Tab（フォーカス移動）・Enter（確定）・Escape（閉じる）

---

## Tag DB — コンポーネント構成 (`src/components/modals/tag-database/`)

| ファイル | 役割 |
|---|---|
| `TagDatabaseModal.tsx` | モーダルシェル。検索バー + 2ペインレイアウト管理 |
| `TagGroupTreePane.tsx` | 左ペイン。お気に入りツリー / 全グループツリーの展開・お気に入りトグル |
| `TagContentPane.tsx` | 右ペイン。選択グループのタグ一覧。`@tanstack/react-virtual` でリスト仮想化 |
| `tag-db-utils.ts` | ツリー展開・カウントマップ構築等のユーティリティ |

## サイドバー — アーティストタグ関連コンポーネント

| ファイル | 役割 |
|---|---|
| `left-panel/SidebarArtistTagInput.tsx` | 直接アーティストタグ入力UI。オートコンプリート + チップ表示。`useArtistTagInput` を使用 |
| `left-panel/PresetTweakPanel.tsx` | プリセット個別調整パネル。アーティストタグ・Vibe 編集。`useArtistTagInput` を使用 |
| `left-panel/ArtistStyleSection.tsx` | スタイルセクション全体。`useSidebarArtistTagsStore` + `useGenerationParamsStore` を併用 |

## Tag DB — オートコンプリート経路 (`src/hooks/use-autocomplete.ts`)

- `category` 未指定時: `ipc-tags.searchTags` → Tag DB FTS5 trigram 検索（全カテゴリ横断）
- `category` 指定時: 従来の `ipc.searchSystemPrompts` にフォールバック（csv_category フィルタ対応）
- 結果は統一的に `TagDto[]` 形状で返す
