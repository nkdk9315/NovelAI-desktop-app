# Frontend Types & Utilities (TypeScript)

> **Stores 一覧（`src/stores/`, 15 ストア）**: `settings-store`, `project-store`, `generation-store`, `generation-params-store`, `history-store`, `prompt-store`, `preset-store`, `sidebar-prompt-store`, `sidebar-preset-group-store`, `sidebar-artist-tags-store`, `layout-store`（サイドバー幅, PR #25）, `theme-store`（ダーク/ライト切替）, `image-edit-store`（Img2Img / Inpaint ベース画像・キャンバスエディタ）, `char-ref-store`（キャラクター参照）, `director-tools-store`（Director Tools ダイアログ）。
>
> **IPC モジュール（`src/lib/`, 5 ファイル）**: `ipc.ts`（基盤 + settings/projects/images/genres/system_prompts/tags/tokens 等）、`ipc-tags.ts`（Tag DB）、`ipc-prompt.ts`（Prompt Group + Folders + system_group_settings）、`ipc-assets.ts`（Vibe / Style Preset + 各 Folder）、`ipc-preset.ts`（Prompt Preset / Preset Folder / Sidebar Preset Group）。
>
> **Hooks（`src/hooks/`, 13 フック）**: `use-debounce`, `use-autocomplete`, `use-cost-estimate`（IPC 版見積もり。現在 `CostDisplay` は `use-generation-plan` を使用）, `use-artist-tag-input`, `use-prompt-token-counts`, `use-generation-plan`, `use-run-generation`, `use-image-source-actions`, `use-delete-images`, `use-project-prompt-persistence`, `use-sidebar-style-persistence`, `use-token-drag`, `use-zoom-pan`。


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
  opusUsage: OpusUsageDto | null; // V5 Opus 無料枠
}

export interface OpusUsageDto {
  remainingPercent: number;
  refillPercentPerDay: number;
  estimatedImagesRemaining: number;
  isLow: boolean;
  isExhausted: boolean;
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
  uiSnapshot?: UiSnapshotV1; // 履歴 Ctrl/Cmd+クリック復元用スナップショット
  transparentBackground?: boolean; // V5 のみ
  characterReference?: CharacterReferenceRequest; // V4.5 のみ。Vibe と併用不可
}

export type CharRefMode = "character" | "character&style" | "style";

export interface CharacterReferenceRequest {
  imageBase64: string;   // data URL 接頭辞なし
  strength: number;      // 0–1
  fidelity: number;      // 0–1
  mode: CharRefMode;
}

/** Director Tools (augment) の req_type */
export type AugmentTool =
  | "bg-removal" | "lineart" | "sketch" | "colorize"
  | "emotion" | "declutter" | "declutter-keep-bubbles";

export type ImageSourceRequest =
  | { type: "history"; imageId: string }
  | { type: "base64"; data: string };

export interface AugmentImageRequest {
  projectId: string;
  source: ImageSourceRequest;
  reqType: AugmentTool;
  prompt?: string;   // colorize: 任意 / emotion: 感情キーワード（`;;` は API クライアントが付与するため送らない）
  defry?: number;    // colorize / emotion: 0–5
}

export interface UpscaleImageRequest {
  projectId: string;
  source: ImageSourceRequest;
}

export interface ImageToolResponse {
  id: string;
  base64Image: string;
  filePath: string;
  width: number;
  height: number;
  anlasRemaining?: number;
  anlasConsumed?: number;
}

export interface ImageDataDto {
  base64: string;
  mime: string;   // image/png | image/jpeg | image/webp
}

/** 画像に埋め込まれた NovelAI 生成メタデータ */
export interface ImageMetadataDto {
  source: string | null;        // 例: "NovelAI Diffusion V4.5 4BDE2A90"
  software: string | null;
  description: string | null;
  comment: Record<string, unknown>;   // `Comment` JSON（リクエストパラメータ）
}

export interface ImportVibeEncodingRequest {
  name: string;
  modelKey: string;             // v4curated | v4full | v4-5curated | v4-5full
  encoding: string;
  informationExtracted: number;
  strength: number;
}

export interface ImportedVibeDto {
  vibe: VibeDto;
  existed: boolean;             // 同一エンコーディングが既にライブラリにあった
}

// 履歴画像から UI 状態を戻すためのスナップショット。Rust 側は不透明 JSON として
// prompt_snapshot 内に保持する。version フィールドで将来のマイグレーションを判別。
export interface UiSnapshotV1 {
  version: 1;
  negativePrompt: string;
  negativePreset: string;
  qualityTagsEnabled: boolean;      // 旧形式（qualityPreset !== "none"）。古いビルド向けに書き続ける
  qualityPreset?: QualityPresetId;  // 無ければ qualityTagsEnabled から standard / none に読み替え
  furryMode?: boolean;
  transparentBackground?: boolean;
  stripNoTextWithDialogue?: boolean;         // テキスト描画時に no text を外す（無ければ false）
  autoSfx?: boolean;                         // おまかせ効果音（`sound effects` タグ、無ければ false）
  normalizeVibeStrength: boolean;
  normalizeArtistStrength: boolean;
  characters: Character[];
  selectedVibes: SelectedVibe[];
  sidebarPresets: SidebarPreset[];
  sidebarArtistTags: ArtistTag[];
  sidebarPromptTargets: Record<string, unknown>; // sidebar-prompt-store の targets
  mangaPage?: MangaPage;                         // 漫画モードのページ（無ければ漫画モード OFF で復元）
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
  model?: string;               // V5 は 1.5 倍
  opusUsageExhausted?: boolean; // V5 Opus 無料枠切れ
  mode?: "txt2img" | "img2img" | "inpaint"; // 既定 txt2img。img2img / inpaint は strength 倍
  strength?: number;            // img2img strength / inpaint mask strength (0–1)
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

// ---- Prompt Presets & Sidebar Preset Groups (migrations 022–026) ----

export interface PromptPresetDto {
  id: string;
  name: string;
  folderId: number | null;
  sortKey: number;                        // migration 026
  slots: PresetCharacterSlotDto[];
  createdAt: string;
  updatedAt: string;
}

export interface ReorderPromptPresetsRequest {
  folderId: number | null;
  orderedIds: string[];
}

export interface PresetCharacterSlotDto {
  id: string;
  slotIndex: number;
  slotLabel: string;
  genreId: string | null;
  positivePrompt: string;
  negativePrompt: string;
  role: "target" | "source" | "none";
  positionX: number;                    // migration 025, 0.0..=1.0
  positionY: number;                    // migration 025
}

export interface PresetFolderDto {
  id: number;
  title: string;
  parentId: number | null;
  sortKey: number;
}

export interface SidebarPresetGroupActivePreset {
  presetId: string;
  positiveStrength: number | null;      // migration 024, null = インスタンス default 継承
  negativeStrength: number | null;
  activatedAt: string;                  // migration 025, last-activated-wins 用
}

export interface SidebarPresetGroupInstanceDto {
  id: string;
  projectId: string;
  folderId: number;
  sourceCharacterId: string;
  targetCharacterId: string;
  position: number;
  defaultPositiveStrength: number;      // migration 024
  defaultNegativeStrength: number;
  activePresets: SidebarPresetGroupActivePreset[];
  createdAt: string;
  updatedAt: string;
}

// Requests
export interface CreatePromptPresetRequest { name: string; folderId?: number | null; slots: PresetSlotInput[]; }
export interface UpdatePromptPresetRequest { id: string; name?: string; folderId?: number | null; slots?: PresetSlotInput[]; }
export interface PresetSlotInput {
  slotLabel: string; genreId?: string | null; positivePrompt: string; negativePrompt?: string;
  role: "target" | "source" | "none"; positionX: number; positionY: number;
}
export interface CreateSidebarPresetGroupInstanceRequest { projectId: string; folderId: number; sourceCharacterId: string; targetCharacterId: string; }
export interface UpdateSidebarPresetGroupPairRequest { id: string; sourceCharacterId: string; targetCharacterId: string; }
export interface SetSidebarPresetGroupActivePresetsRequest { id: string; presetIds: string[]; }
export interface ReorderSidebarPresetGroupInstancesRequest { projectId: string; orderedIds: string[]; }
export interface UpdateSidebarPresetGroupDefaultStrengthRequest { id: string; defaultPositiveStrength: number; defaultNegativeStrength: number; }
export interface SetSidebarPresetGroupPresetStrengthRequest { instanceId: string; presetId: string; positiveStrength: number | null; negativeStrength: number | null; }
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
  AugmentImageRequest, UpscaleImageRequest, ImageToolResponse, ImageDataDto, ImageMetadataDto,
  ImportVibeEncodingRequest, ImportedVibeDto,
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

// ---- Image Tools (commands/image_tools.rs) ----

export function augmentImage(req: AugmentImageRequest): Promise<ImageToolResponse> { return invoke("augment_image", { req }); }
export function upscaleImage(req: UpscaleImageRequest): Promise<ImageToolResponse> { return invoke("upscale_image", { req }); }
export function getImageData(imageId: string): Promise<ImageDataDto> { return invoke("get_image_data", { imageId }); }
export function readImageFile(path: string): Promise<ImageDataDto> { return invoke("read_image_file", { path }); }
export function readImageMetadata(path: string): Promise<ImageMetadataDto | null> { return invoke("read_image_metadata", { path }); }
export function importVibeEncoding(req: ImportVibeEncodingRequest): Promise<ImportedVibeDto> { return invoke("import_vibe_encoding", { req }); }

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

// ---- Tokens ----

export interface CountTokensResponse {
  counts: number[];
  maxTokens: number;
}

export function countTokens(texts: string[]): Promise<CountTokensResponse> {
  return invoke("count_tokens", { req: { texts } });
}

export function getMaxPromptTokens(): Promise<number> {
  return invoke("get_max_prompt_tokens");
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

## 5.3a IPC ラッパー — Prompt Group (`src/lib/ipc-prompt.ts`)

`prompt_groups` と `prompt_group_folders` の Tauri コマンドをラップする（`system_group_settings` も同ファイル内に同居）。関数名は Rust コマンドの camelCase 変換に従う：`listPromptGroups / listPromptGroupFolders / createPromptGroupFolder / renamePromptGroupFolder / movePromptGroupFolder / deletePromptGroupFolder / deletePromptGroupsInFolder / countGroupsInFolderSubtree / listPromptGroupDefaultGenres / setPromptGroupDefaultGenres / getPromptGroup / createPromptGroup / updatePromptGroup / updatePromptGroupThumbnail / deletePromptGroup / getSystemGroupGenreDefaults / setSystemGroupGenreDefaults / listDefaultSystemGroupsForGenre`。

## 5.3b IPC ラッパー — Assets (`src/lib/ipc-assets.ts`)

Vibe / StylePreset / 各 Folder 系コマンドを集約。`listVibes / addVibe / deleteVibe / encodeVibe / updateVibe* / toggleVibeFavorite / addVibeToProject / listProjectVibesAll` 等に加え、`listVibeFolderRoots / listVibeFolderChildren / createVibeFolder / renameVibeFolder / moveVibeFolder / deleteVibeFolder / setVibeFolder / countVibesPerFolder` と、対応する `*StylePresetFolder*` 一式を提供する。フォルダ系の戻り値は `AssetFolderDto` 共通型。

## 5.4 IPC ラッパー — Preset (`src/lib/ipc-preset.ts`)

`src/lib/ipc.ts` から re-export される。

| 関数 | 引数 | 戻り値 | 説明 |
|---|---|---|---|
| `listPromptPresets` | search? | `PromptPresetDto[]` | プリセット一覧 |
| `getPromptPreset` | id | `PromptPresetDto` | 単一取得 |
| `createPromptPreset` | req | `PromptPresetDto` | 作成（slot 最低 2） |
| `updatePromptPreset` | req | `void` | 更新 |
| `deletePromptPreset` | id | `void` | 削除 |
| `reorderPromptPresets` | req: `ReorderPromptPresetsRequest` | `void` | フォルダ内並び替え（ドラッグ&ドロップ） |
| `listPresetFolders` | — | `PresetFolderDto[]` | フォルダ一覧 |
| `createPresetFolder` | title, parentId? | `PresetFolderDto` | フォルダ作成 |
| `renamePresetFolder` | id, title | `void` | フォルダ名変更 |
| `movePresetFolder` | id, newParentId? | `void` | フォルダ移動（循環防止あり） |
| `deletePresetFolder` | id | `void` | フォルダ削除 |
| `countPresetsInFolder` | folderId | `number` | フォルダ内プリセット数 |
| `deletePresetsInFolder` | folderId | `number` | フォルダ内プリセットを一括削除 |
| `setPresetFolder` | presetId, folderId? | `void` | プリセットの所属フォルダ更新 |
| `listSidebarPresetGroupInstances` | projectId | `SidebarPresetGroupInstanceDto[]` | インスタンス一覧 |
| `createSidebarPresetGroupInstance` | req | `SidebarPresetGroupInstanceDto` | インスタンス作成 |
| `updateSidebarPresetGroupPair` | req | `void` | source/target ペア更新 |
| `setSidebarPresetGroupActivePresets` | req | `void` | アクティブプリセット ID セット更新（差分適用） |
| `deleteSidebarPresetGroupInstance` | id | `void` | インスタンス削除 |
| `reorderSidebarPresetGroupInstances` | req | `void` | 並び替え（トランザクション内） |
| `updateSidebarPresetGroupDefaultStrength` | req | `void` | デフォルト強度更新 |
| `setSidebarPresetGroupPresetStrength` | req | `void` | 個別プリセットの強度上書き |

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
  promptOverride: string | null;    // 入力欄のテキスト（送信内容の正）。null は旧スナップショット由来のみ
  negativeOverride: string | null;  // ネガティブ入力欄のテキスト（同上）
  dialogue?: DialogueLine[];        // セリフ・画像内テキスト。送信時にこのターゲットのプロンプト末尾へ `Text:` として付く
  sfx?: SfxLine[];                  // 効果音（描き文字）。セリフと同じ `Text:` にまとめる
  effects?: string[];               // 有効な漫画エフェクト id（manga-effects.ts）
}
```

入力欄のテキストが送信内容の唯一の正（`src/stores/sidebar-prompt-text-sync.ts`）。
グループ操作はテキストへ反映される: 通常グループのタグを ON にすると先頭に挿入・OFF で削除、
ランダム ON でそのグループのタグをワイルドカード（`effectiveWildcardToken`）に置き換える。
生成時は `rollTargetForGeneration`（`src/lib/prompt-roll.ts`）がワイルドカードを 1 回だけ抽選し、
同じ抽選結果のネガティブをネガティブ側に追加する。

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

## 6.2a restoreFromSnapshot (`src/lib/restore-generation.ts`)

```typescript
export type RestoreResult = "full" | "partial" | "none";
export function restoreFromSnapshot(
  snapshot: Record<string, unknown> | null | undefined,
): RestoreResult;
```

履歴画像の `promptSnapshot` から生成時の UI 状態を復元するユーティリティ。
`ThumbnailGrid` の Ctrl/Cmd+クリック（macOS は contextmenu 経由の Ctrl+クリックも）で呼ばれる。

- スナップショット直下の legacy 数値フィールド（`width` / `height` / `steps` / `scale` / `cfg_rescale` / `sampler` / `noise_schedule` / `model` / `negative_prompt`）を `useGenerationParamsStore.setParam` で戻す
- `ui_snapshot.version === 1` を確認後、`setCharacters` / `setSelectedVibes` / `setSidebarPresets`（`useGenerationParamsStore`）、`setSidebarArtistTags`（`useSidebarArtistTagsStore`）、`setTargets`（`useSidebarPromptStore`）で全画面のストアを書き戻す
- 戻り値 `"full"` / `"partial"`（旧スナップショットで `ui_snapshot` なし）/ `"none"`（無効な入力）。UI 側でトーストを出し分ける

## 6.2b buildUiSnapshot (`src/lib/build-ui-snapshot.ts`)

```typescript
export function buildUiSnapshot(
  src: SnapshotSource,
  sidebarArtistTags: ArtistTag[],
  sidebarPromptTargets: Record<string, unknown>,
): UiSnapshotV1;
```

`ActionBar` が `generateImage` を呼ぶ直前に、各 Zustand ストアの現在値から
`UiSnapshotV1` を組み立てる純粋関数。`version: 1` を付けて `GenerateImageRequest.uiSnapshot` に載せ、Rust 側 `prompt_snapshot` 内の `ui_snapshot` キーに素通しで保存される。

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

## 6.7 usePromptTokenCounts (`src/hooks/use-prompt-token-counts.ts`)

生成直前のプロンプト組立結果に対して T5 トークン数を計算し、API の 512 トークン上限
（ポジティブ / ネガティブそれぞれ）に対するオーバーフロー状態を返すフック。

```typescript
interface PromptTokenCounts {
  positiveTotal: number;
  negativeTotal: number;
  maxTokens: number;
  positiveOverflow: boolean;
  negativeOverflow: boolean;
  overflow: boolean;   // positiveOverflow || negativeOverflow
  loading: boolean;
}

function usePromptTokenCounts(): PromptTokenCounts;
```

- **組立ロジック**: `ActionBar.executeGenerate` と同じ順序で
  `decorateMainPrompt(artist プレフィックス + mainTarget, currentPromptDecoration())` をポジティブ側に、
  `NEGATIVE_PRESETS[preset] + mainTarget.negativeOverride` をネガティブ側に結合。
  キャラクターは `characters[i]` ごとに1エントリずつ `sidebar-prompt-store` の target を参照。
- **デバウンス**: 250ms（`useDebounce`）。
- **IPC**: `ipc.countTokens(allTexts)` に `[positives..., negatives...]` の順で渡し、
  レスポンスを `positives.length` で分割して合計。
- **レースコンディション対策**: `reqIdRef` で最新リクエストのみ反映。
- **フェイルセーフ**: バックエンドエラー時は loading=false に戻し、
  直前の集計値を維持する（ユーザー操作をブロックしない）。

## 6.8 TokenCounter (`src/components/shared/TokenCounter.tsx`)

`usePromptTokenCounts()` の結果を受け取って Pos / Neg カウントを表示するプレゼンテーション
コンポーネント。オーバーフロー時は `text-destructive` + 警告メッセージを表示する。

```tsx
interface TokenCounterProps {
  counts: PromptTokenCounts;
  compact?: boolean;
}
```

`ActionBar` の生成ボタン直上に配置し、`tokenCounts.overflow` 時は `Generate` ボタンを
disabled にした上で、クリック時にも `toast.error(t("generation.tokenLimitExceededToast"))`
でユーザーに通知する。

## 6.6 useHistoryStore (`src/stores/history-store.ts`)

生成履歴の管理と複数選択保存を担うストア。

```typescript
interface HistoryState {
  images: GeneratedImageDto[];
  isLoading: boolean;
  selectedImageIds: string[];       // 一括保存対象として選択中の画像 ID

  loadImages(projectId: string, savedOnly?: boolean): Promise<void>;
  saveImage(imageId: string): Promise<void>;
  saveAllImages(projectId: string): Promise<void>;
  deleteImage(imageId: string): Promise<void>;

  toggleImageSelection(imageId: string): void;  // チェックボックスで ON/OFF
  clearSelection(): void;                        // 全選択解除
  saveSelectedImages(): Promise<void>;           // 選択中の画像を一括保存して選択解除
}
```

**saveSelectedImages の挙動**:
1. `selectedImageIds` のコピーを取得
2. 全 ID に対して `ipc.saveImage(id)` を並列実行（`Promise.all`）
3. 成功時: 対象画像の `isSaved = true` に更新し `selectedImageIds = []` にリセット
4. 失敗時: エラーを呼び出し元（HistoryHeader）に throw して toast 表示

**選択状態と表示状態の分離**:
- `selectedImageIds` — 一括保存対象（青枠 + チェックマーク）
- `lastResult` (GenerationStore) — 中央パネルに表示中の画像（primary 枠）
- 両方が重なった場合は `selectedImageIds` の青枠を優先表示

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

## 6.6 Preset Store (`src/stores/preset-store.ts`)

```typescript
interface PresetState {
  presets: PromptPresetDto[];
  folders: PresetFolderDto[];
  isLoading: boolean;
  loadPresets: (search?: string) => Promise<void>;
  loadPresetFolders: () => Promise<void>;
  createPreset: (req: CreatePromptPresetRequest) => Promise<PromptPresetDto>;
  updatePreset: (req: UpdatePromptPresetRequest) => Promise<void>;
  deletePreset: (id: string) => Promise<void>;
  reorderPresets: (req: ReorderPromptPresetsRequest) => Promise<void>;
  // folder mutations ...
}
```

## 6.7 Sidebar Preset Group Store (`src/stores/sidebar-preset-group-store.ts`)

```typescript
interface SidebarPresetGroupState {
  projectId: string | null;
  instances: SidebarPresetGroupInstanceDto[];
  isLoading: boolean;
  loadInstances: (projectId: string) => Promise<void>;
  clear: () => void;
  addInstance: (folderId: number, source: string, target: string) => Promise<SidebarPresetGroupInstanceDto | null>;
  updatePair: (id: string, source: string, target: string) => Promise<void>;
  togglePreset: (instanceId: string, presetId: string) => Promise<void>;
  setDefaultStrength: (instanceId: string, positive: number, negative: number) => Promise<void>;
  setPresetStrength: (instanceId: string, presetId: string, positive: number | null, negative: number | null) => Promise<void>;
  removeInstance: (id: string) => Promise<void>;
  reorder: (orderedIds: string[]) => Promise<void>;
}
```

state はプロジェクト切替時に `clear()`。mutation は IPC 成功後に楽観更新。

## 6.8 Preset Contributions (`src/lib/preset-contributions.ts`)

アクティブプリセット群からキャラクターごとの positive/negative プロンプト寄与と強度を算出。

```typescript
export function wrapWithStrength(text: string, strength: number): string;      // strength ≠ 1.0 なら "s::text::" にラップ
export function getPresetContributionsForCharacter(
  characterId: string,
  instances: SidebarPresetGroupInstanceDto[],
  presets: PromptPresetDto[],
): { positive: string[]; negative: string[] };
export function appendContributions(base: string, contributions: string[]): string;
```

強度の優先順: per-preset 上書き値 > インスタンス default。`activePreset.positiveStrength` が `null` の場合、インスタンスの `defaultPositiveStrength` を採用。

## 6.9 Preset Positions (`src/lib/preset-positions.ts`)

複数プリセットが同一キャラクターに異なる position を指定する場合、`activated_at` 降順で最後にアクティベートされたものが採用される（last-activated-wins）。

```typescript
export function computeDesiredCharacterPositions(
  instances: SidebarPresetGroupInstanceDto[],
  presets: PromptPresetDto[],
): Map<string, { x: number; y: number }>;
```

## 6.10 画像編集・画像ツール (Img2Img / Inpaint / Enhance / キャラ参照 / Director Tools / Upscale)

### コスト計算 (`src/lib/cost.ts`)

```typescript
export const UPSCALE_MAX_PIXELS = 1_048_576;   // Upscale 入力上限（1024×1024）
export const AUGMENT_MAX_PIXELS = 3_145_728;   // Director Tools 入力上限

/** mode 対応: img2img / inpaint は perImageCost × strength（最小 / 最大コストでクランプ）。
 *  inpaint は inpaintBilledSize で小領域を ~1MP 換算。キャラ参照あり / inpaint 時は Vibe 課金なし */
export function calculateCost(params: CostEstimateRequest): CostResultDto;
/** 1MP × 0.8 未満の inpaint サイズを 1MP 相当（64 刻み）に拡大して課金サイズを返す */
export function inpaintBilledSize(width: number, height: number): { width: number; height: number };
/** 3MP にクランプ → 1MP 未満は拡大 → 28 step の基本コスト。bg-removal は ×3 + 5 で Opus 無料対象外 */
export function calculateAugmentCost(tool: AugmentTool, width: number, height: number, tier: number): CostResultDto;
/** ピクセル数テーブル（≤1MP: 1 Anlas）。上限超過は null。Opus 無料枠なし */
export function calculateUpscaleCost(width: number, height: number): number | null;
```

### サイズ・マスク (`src/lib/image-size.ts`, `src/lib/mask-grid.ts`)

```typescript
export interface Size { width: number; height: number }
/** 64 の倍数・各辺 64–2048・MAX_TOTAL_PIXELS 以下でアスペクト比を保つ生成サイズ */
export function fitGenerationSize(width: number, height: number): Size;
/** Enhance 出力サイズ = fitGenerationSize(w × magnitude, h × magnitude) */
export function enhanceSize(width: number, height: number, magnitude: number): Size;

export const MASK_CELL = 8;             // API はマスクを生成サイズの 1/8 で受け取る
export const MASK_CELL_THRESHOLD = 24;  // セル平均 alpha がこれを超えたらマスク
export interface MaskCells { cols: number; rows: number; cells: Uint8Array; count: number }
/** 描画した alpha チャネル（RGBA）を targetW/8 × targetH/8 のセルに縮約 */
export function alphaToMaskCells(
  rgba: Uint8ClampedArray, srcW: number, srcH: number,
  targetW: number, targetH: number, threshold?: number,
): MaskCells;
```

### キャンバス補助 (`src/lib/canvas-image.ts`)

```typescript
export interface LoadedImage { src: string; width: number; height: number } // src は data URL
export function toDataUrl(data: ImageDataDto): string;
export function stripDataUrl(src: string): string;
export function loadImage(src: string): Promise<LoadedImage>;
export function loadHistoryImage(imageId: string): Promise<LoadedImage>; // ipc.getImageData
export function loadImageFile(path: string): Promise<LoadedImage>;       // ipc.readImageFile
export function composeImage(baseSrc: string, paint: HTMLCanvasElement): Promise<string>; // ベース + 落書きを PNG(base64) に平坦化
export function maskCellsOf(mask: HTMLCanvasElement, targetW: number, targetH: number): MaskCells;
export function maskCellsToBase64(m: MaskCells): string; // 1/8 サイズの白黒 PNG（白 = 再生成）
```

### リクエスト組立 (`src/lib/generation-request.ts`)

`ActionBar` から抽出した生成リクエスト組立ロジック。

```typescript
/** プリセット + Vibe セクションの有効 Vibe（id 重複排除）。V5 では空 */
export function collectActiveVibes(params: ParamsState): SelectedVibe[];
/** 送信するキャラ参照。画像なし / 無効 / 非 V4.5 モデルなら undefined */
export function currentCharacterReference(model: string): CharacterReferenceRequest | undefined;
export interface EditPlan { action: GenerateActionRequest; width: number; height: number; mode: "img2img" | "inpaint"; strength: number }
/** image-edit-store から action を組立。txt2img なら null、inpaint でマスク未設定なら { error: "inpaintNeedsMask" } */
export function currentEditPlan(): EditPlan | { error: "inpaintNeedsMask" } | null;
export interface RequestOverrides { action?: GenerateActionRequest; width?: number; height?: number } // Enhance 等で使用
export type BuildResult = { ok: true; req: GenerateImageRequest } | { ok: false; errorKey: string; errorArgs?: Record<string, unknown> };
/** キャラ参照が有効なら Vibe は送らない（キャラ参照優先） */
export function buildGenerateRequest(projectId: string, overrides?: RequestOverrides): BuildResult;
```

### 履歴アクション (`src/lib/history-action.ts`)

```typescript
export type HistoryActionKind = "generate" | "img2img" | "infill" | "augment" | "upscale";
export interface HistoryAction { kind: HistoryActionKind; tool?: string }
/** prompt_snapshot.action.type から判定（無し / 未知は "generate"）。サムネイルのバッジ表示用 */
export function historyActionOf(snapshot: Record<string, unknown> | null | undefined): HistoryAction;
/** augment / upscale 出力はプロンプトを持たないため復元対象外 */
export function isToolOutput(snapshot: Record<string, unknown> | null | undefined): boolean;
```

### 定数 (`src/lib/constants.ts`)

`DEFAULT_IMG2IMG_STRENGTH = 0.7` / `DEFAULT_IMG2IMG_NOISE = 0` / `DEFAULT_INPAINT_STRENGTH = 1`、
`ENHANCE_LEVELS`（level 1–5: strength 0.2/0.4/0.5/0.6/0.7、level 5 のみ noise 0.1）、`ENHANCE_MAGNITUDES = [1, 1.5]`、
`supportsCharacterReference(model)`（`nai-diffusion-4-5*` のみ true）、`AUGMENT_TOOLS`、`EMOTIONS`（感情キーワード + 絵文字）、
`MAX_DEFRY = 5` / `DEFAULT_DEFRY = 0`。

### Stores

```typescript
// --- src/stores/image-edit-store.ts ---
export type EditMode = "img2img" | "inpaint";
export type EditorLayer = "paint" | "mask";
export interface BaseImage extends LoadedImage { sourceImageId: string | null }
export interface EditLayers {
  paintSrc: string | null;         // 落書きレイヤー（data URL、ベース解像度）
  maskSrc: string | null;          // マスクレイヤー（再編集用）
  compositeBase64: string | null;  // ベース + 落書きを平坦化した PNG（未描画なら null）
  maskBase64: string | null;       // 1/8 サイズ白黒マスク PNG
  maskCoverage: number;            // 再生成される割合 (0–1)
}
// state: base, enabled, mode, targetWidth/targetHeight（setBase 時に fitGenerationSize）,
//        editorOpen, editorLayer, img2imgStrength, img2imgNoise, inpaintStrength, colorCorrect, ...EditLayers
// actions: setBase(base, mode?), clear, setEnabled, setMode, setParam, applyLayers, openEditor(layer), closeEditor
export function activeEditMode(s): EditMode | null; // base && enabled のときのみ mode

// --- src/stores/char-ref-store.ts ---
// state: image: LoadedImage | null, enabled, mode (既定 "character&style"), strength (1), fidelity (1)
// actions: setImage（null 以外で enabled = true）, setEnabled, setMode, setStrength, setFidelity

// --- src/stores/director-tools-store.ts ---
// state: imageId: string | null（null = 閉）, initialTool: DirectorTool
// actions: openFor(imageId, tool?), close
```

### Hooks

```typescript
// --- src/hooks/use-generation-plan.ts ---
/** 次に生成ボタンを押したときの内容: mode / 出力サイズ / コスト / ブロック理由。
 *  CostDisplay・ActionBar が使用（use-cost-estimate を置き換え） */
export function useGenerationPlan(): {
  mode: EditMode | null; width: number; height: number; cost: CostResultDto;
  charRefActive: boolean; blocker: "inpaintNeedsMask" | null;
};

// --- src/hooks/use-run-generation.ts ---
/** buildGenerateRequest → generationStore.generate → 履歴 / Anlas 再取得。失敗時は toast */
export function useRunGeneration(): (overrides?: RequestOverrides) => Promise<void>;

// --- src/hooks/use-image-source-actions.ts ---
export type ImageSource = { imageId: string } | { path: string } | { loaded: LoadedImage };
/** 履歴画像 / ファイルを Img2Img・Inpaint のベース、またはキャラ参照に設定 */
export function useImageSourceActions(): {
  setAsBase: (source: ImageSource, mode: EditMode, editor?: EditorLayer) => Promise<void>;
  setAsCharacterReference: (source: ImageSource) => Promise<void>;
};
```

## 6.11 画像メタデータ取り込み (D&D 時)

画像ファイルをドロップすると `ImageDropChoiceDialog` が `ipc.readImageMetadata(path)` と `ipc.readImageFile(path)` を並行実行し、
NovelAI メタデータがあれば `parseMetadata` した結果を `MetadataImportPanel`（`src/components/modals/metadata-import/`）で
表示する（メタデータ無しなら従来の用途選択のみ）。

### パース (`src/lib/nai-metadata.ts`)

```typescript
export interface MetadataCharacter { rawPrompt: string; prompt: string; negative: string; centerX: number; centerY: number }
export interface MetadataArtist extends ArtistTag { source: "main" | number }   // 見つかった場所（main / キャラ index）
export interface MetadataVibe { encoding: string; strength: number; informationExtracted: number }
export interface MetadataSettings {
  width?: number; height?: number; steps?: number; scale?: number;
  cfgRescale?: number; sampler?: string; noiseSchedule?: string;   // 未知の sampler / schedule は無視
}
export interface ParsedMetadata {
  model: string | null;              // Source から推定（不明は null）
  rawPrompt: string;                 // 品質タグ接尾辞だけ除いたメインプロンプト（アーティスト込み）
  prompt: string;                    // さらに全アーティストを除いたプレビュー
  artistTags: MetadataArtist[];      // メイン + 各キャラのプロンプトから抽出（名前で重複除去）
  qualityPreset: QualityPresetId;    // 末尾のクオリティタグ（モデル別の公式 / カスタム）
  furryMode: boolean;                // 先頭の "fur dataset"
  transparentBackground: boolean;    // クオリティタグ直前の "transparent background"
  negative: string;                  // 検出したネガティブプリセットを除いた残り
  negativePreset: NegativePresetId;
  characters: MetadataCharacter[];
  settings: MetadataSettings;
  seed: number | null;               // 表示のみ（アプリに seed 入力が無いため適用しない）
  vibes: MetadataVibe[];
  characterReference: { imageBase64: string; strength: number; fidelity: number; mode: CharRefMode } | null;
}

/** Source 末尾のモデルハッシュ（既知のもの）→ 無ければ "V5" / "V4.5" / "V4" + curated 有無からモデル ID */
export function modelFromSource(source: string | null | undefined): string | null;
/** names に含まれるアーティストだけをプロンプトから取り除く（他は残す） */
export function promptWithoutArtists(prompt: string, names: ReadonlySet<string>): string;
/** 先頭が NEGATIVE_PRESETS のいずれか（長い順に照合）ならプリセットとして分離 */
export function splitNegative(negative: string): { negative: string; preset: NegativePresetId };
/** comment の v4_prompt / v4_negative_prompt（無ければ prompt / uc）、reference_*_multiple（Vibe）、
 *  director_reference_*（キャラ参照）、steps / scale / sampler 等を ParsedMetadata に変換 */
/** メインプロンプトは splitDecorations でケモノ接頭辞・透過タグ・クオリティタグ（customs も照合）を分離 */
export function parseMetadata(meta: ImageMetadataDto, customs?: readonly CustomQualityTag[]): ParsedMetadata;
/** MODEL_TO_VIBE_KEY でモデル → Vibe モデルキー（V5 等の非対応は null = Vibe 取り込み不可） */
export function vibeModelKey(model: string | null): string | null;
```

### プロンプト装飾 (`src/lib/prompt-decoration.ts`)

公式サイトがメインプロンプトに付け足すもの（サイトの JS から再現）。

```typescript
type QualityPresetId = "standard" | "light" | "none" | `custom:${string}`;
interface CustomQualityTag { id: string; name: string; tags: string }  // settings の custom_quality_tags（JSON）に保存
interface PromptDecoration {
  model: string; qualityPreset: QualityPresetId; customQualityTags: readonly CustomQualityTag[];
  transparentBackground: boolean; furryMode: boolean;
  stripNoText?: boolean;  // クオリティタグから `no text` を外す（テキストを描くときだけ true にする）
}
/** モデル別の公式クオリティタグ。light は V5 のみ（V4.5 curated / V4 / V4 curated は standard の中身が異なる） */
export function builtinQualityTags(model: string): Partial<Record<"standard" | "light", string>>;
/** light 非対応モデルでは standard、削除済みカスタムは none */
export function effectiveQualityPreset(model: string, preset: QualityPresetId, customs: readonly CustomQualityTag[]): QualityPresetId;
export function qualityTagsFor(model: string, preset: QualityPresetId, customs: readonly CustomQualityTag[]): string;
/** [fur dataset, ] + prompt + [, transparent background (V5)] + [, クオリティタグ]。
 *  V4.5 / V5 はプロンプト中の `Text:` の直前に接尾辞を入れる。先頭が fur dataset / background dataset なら接頭辞は付けない */
export function decorateMainPrompt(prompt: string, d: PromptDecoration): string;
/** decorateMainPrompt の逆（メタデータ読み込み用）。model が null なら全モデルの公式タグで照合。
 *  `Text:` 部分があれば、その直前の装飾を外してから `Text:` 部分を末尾に戻す */
export function splitDecorations(prompt: string, model: string | null, customs?: readonly CustomQualityTag[]): SplitPrompt;
/** 公式サイトと同じ正規表現で `Text:` 部分の有無を判定 */
export function hasTextMarker(prompt: string): boolean;
/** カンマ区切りのタグ列から `no text` だけ除く */
export function withoutNoText(tags: string): string;
```

### セリフ・効果音・エフェクト (`src/lib/in-image-text.ts` ほか)

各ターゲット（main / キャラクター）の `dialogue` / `sfx` / `effects` を、送信時にそのプロンプト末尾へ
`, <エフェクトのタグ>, [sound effects (おまかせ・main のみ)], <各行のタグ>, "行1" <説明>, …, Text: 行1\n\n行2`
として付ける（`Text:` 以降は文字として描かれるので必ず最後）。セリフと効果音は 1 つの `Text:` を共有し、文字数上限もまとめて数える。
行ごとに引用＋説明を付けるので、種類の違う行が混ざってもそれぞれの形になる。キャラクターのセリフ・効果音・エフェクトは
そのキャラの近くに描かれる。メインでは decorateMainPrompt がクオリティタグを `Text:` の直前に入れる。
説明文・タグはすべて V5 実機で検証済み（2026-09-27）。

```typescript
// in-image-text.ts
interface TextPart { text: string; tags: string[]; phrase: string }
interface TargetExtras { dialogue?: DialogueLine[]; sfx?: SfxLine[]; effects?: string[] }
export function appendTextParts(prompt: string, parts: readonly TextPart[], extraTags?: readonly string[]): string;
export function appendTargetExtras(prompt: string, target: TargetExtras | undefined, customs?: readonly CustomBubbleStyle[], autoSfx?: boolean): string;
export function hasTextContent(target): boolean;  export function hasSfx(target): boolean;
/** 公式の文字数上限: V5 full 750 / V5 curated 374 / それ以外 118 */
export function textCharLimit(model: string): number;
export function textCharCount(target): number;   // セリフ＋効果音、空行区切り込み、コードポイント単位
/** 警告（生成は止めない）: tooLong / needsV5（V5 以外で英語以外の文字）/ manualText（入力欄に Text: を直接記述） */
export function textIssues(model: string, target, promptText: string): TextIssue[];

// dialogue.ts — セリフ行 → TextPart
type TextDirection = "auto" | "vertical" | "horizontal";          // なし / vertical text / horizontal text（行ごと）
interface DialogueLine { id: string; text: string; style: BubbleStyleId; direction?: TextDirection; lettering?: LetteringStyle }
export function cleanDialogueText(text: string): string;  // 行内の空行を詰める（空行は Text: の区切り）
export function dialogueParts(lines, customs): TextPart[];

// bubble-styles.ts — 種類（吹き出しの形・ナレーション枠・擬音・ゲーム画面の枠など、漫画 15 + 画面 6）
interface BubbleStyleDef { shape: BubbleShape; tags: string[]; phrase: string; group?: "manga" | "screen" }
type BubbleStyleId = BuiltinBubbleStyle | `custom:${string}`;
interface CustomBubbleStyle { id: string; name: string; shape: BubbleShape; phrase: string; tags: string }  // settings の custom_bubble_styles
export function resolveBubbleStyle(id: string, customs): BubbleStyleDef;  // 未知の id は speech
// lettering-styles.ts — 文字の見た目（auto / bold / impact / mincho / brush / horror / wavy / cute）
export function letteringPhrase(id: string | undefined): string;

// sound-effects.ts — 効果音
type SfxTexture = "standard" | "impact" | "sharp" | "light" | "liquid" | "ominous" | "silence";
type SfxSize = "medium" | "large";   // 小さいものは消えやすいので中（はっきり見える）/ 大（巨大）のみ
interface SfxLine { id: string; text: string; texture: SfxTexture; size: SfxSize }
const SFX_TAG = "sound effects";  const SFX_PRESETS;   // 場面別の定型文
export function sfxParts(lines): TextPart[];

// manga-effects.ts — 漫画記号・線（タグのみ）
type EffectScope = "character" | "main";   // 記号はキャラ、集中線・スピード線・花背景は main でしか効かない
const MANGA_EFFECTS;   // unreliable: 飛び汗 / ！ / ？ / ♪（約半分）
export function effectTags(ids): string[];  export function effectsForScope(scope): MangaEffectId[];
```

`generation-request.ts` の `promptDrawsText(characters?, targets?)` は、どこかにセリフがあるか、メインに `Text:` があれば true。
`shouldStripNoText(params?, targets?)` は、効果音がある／おまかせ効果音が ON なら常に true（`no text` が控えめな効果音や
自動の効果音を消すため）、それ以外は `stripNoTextWithDialogue && promptDrawsText()`。`currentPromptDecoration()` はこれを使う。
UI: メインとキャラクターカードに `DialogueEditor`（文字数・警告・メイン側に no text 除去）、`SfxEditor` → `SfxRow`
（質感の見本一覧 / 中・大 / 入力欄、定型文、メイン側におまかせ効果音）、`EffectPalette`（アイコンの ON/OFF、△ は出にくいもの）。
`DialogueEditor` → `DialogueLineRow.tsx`
（`BubbleStylePicker` 図形一覧 / `LetteringPicker` 見本一覧 / 向き / 大きめの入力欄）。カスタムの種類は
`modals/BubbleStylesDialog.tsx` + `stores/bubble-style-store.ts`。アイコンは `shared/BubbleShapeIcon.tsx` / `LetteringIcon.tsx`。

### 漫画モード (`src/lib/manga-*.ts`)

1 回の生成で 1 ページ。コマ割りを選び、コマごとに場面・登場キャラ（動作・セリフ・効果音・エフェクト）・
誰も言わない文字（ナレーション・効果音）を入力する。キャラクターカードは見た目の定義として使い、
カード側のセリフ・位置は漫画モード中は表示しない。プロジェクト種別が manga なら最初から漫画モード。
全レイアウト・読み順（右→左）・キャラの配置を V5 実機で検証済み（2026-09-27）。

```typescript
// manga-layouts.ts — 読み順のコマ矩形（0–1）とページサイズ（Opus 無料枠内）
type MangaLayoutId = "koma4" | "two" | "three" | "tall" | "grid";
interface MangaLayout { tags: string; description: string; panels: { label: string; rect: PanelRect }[]; width: number; height: number }
export function castCenters(rect: PanelRect, count: number): { x: number; y: number }[];  // コマ内に横並び

// manga-page.ts — 保存形式（settings の manga_page_<projectId>、UiSnapshotV1.mangaPage）
interface MangaCast { id; characterId; action; dialogue: DialogueLine[]; sfx: SfxLine[]; effects: string[] }
interface MangaPanel { id; scene; cast: MangaCast[]; text: DialogueLine[]; sfx: SfxLine[] }
interface MangaPage { enabled; layoutId; colorMode: "color" | "mono"; panels: MangaPanel[] }
export function fitPanels(panels, layoutId): MangaPanel[];  // レイアウト変更時は位置ごとに中身を保持
export function mangaHasSfx(page): boolean;  export function mangaDrawsText(page): boolean;

// manga-compose.ts — ページ → プロンプト
/** main: ユーザーのメイン + comic, manga, 色, black panel borders, レイアウトタグ, 人数タグ. 説明文. Panel n (位置): 場面; a girl with … is 動作.
 *  + コマの文字（phrase に "in panel n"）と Text:。各登場はキャラクタープロンプト（見た目, panel n, 動作 + セリフ等）をコマ中央に配置 */
export function composeMangaPage(page, userMain, characters: MangaCharacterInput[], customs?): ComposedMangaPage;

// manga-request.ts — store から組み立て（roll=true で生成用、false でプレビュー / トークン数）
export function composeCurrentMangaPage(userMain: string, roll: boolean): ComposedMangaPage;
```

`buildGenerateRequest` は漫画モードでメインとキャラクターを composeMangaPage の結果で置き換え、登場数がモデル上限を超えると
`manga.tooManyAppearances`。`shouldStripNoText` は漫画モードではページの効果音 / 文字で判定する。
UI: `PromptModeControls` の「漫画」トグル（レイアウトのサイズを設定）、`left-panel/manga/`（`MangaSection` / `MangaLayoutThumb` /
`MangaPanelCard` / `MangaCastCard`）、効果のトグルは `EffectToggleGrid` を共用。保存は `hooks/use-project-manga-persistence.ts`。

### アーティスト抽出 (`src/lib/artist-extract.ts`)

```typescript
/** `artist#` は重みブロック内でアーティストグループを開始し、ブロックが閉じるまでの項目もすべてアーティスト
 *  （例 `0.8::artist#ei (eiei e1), 2equal8, ::` → 2 件とも 0.8）。先頭の `artist#` 項目だけ取り除く場合は次に残る項目へ
 *  マーカーを移す。数字で終わる名前の直後に `::` を詰めない（`2equal8 ::`、NovelAI が重みと解釈するため）。
 *  NovelAI の重み構文（`1.2::a, b::`・入れ子・`0.3::artist:x::` のような空白なし、`{}` ×1.05、`[]` ÷1.05）を
 *  トークン化し、アーティスト（`artist:` / `artist#`）の強さを周囲の重みの積で求める。アプリ形式 `{1.2::x ::}` の
 *  波括弧は区切りとして扱う（×1.05 しない）。remove(name) が true のものを本文から除き、空になったブロックや
 *  余分なカンマを整える（行末のカンマは残す） */
export function extractArtistTags(prompt: string, remove?: (name: string) => boolean): { text: string; artistTags: ArtistTag[] };
```

### 適用 (`src/lib/apply-metadata.ts`)

```typescript
export type MergeMode = "replace" | "append";
export interface MetadataSelection {
  prompt: boolean; negative: boolean;
  artistNames: string[]; artistMode: MergeMode;     // 選んだアーティストだけ取り込みプロンプトから除去。
                                                    // append は既存タグを残したまま OFF（enabled:false）にし、取り込んだタグだけ ON
  seed: boolean;                                    // params.seed に設定（生成時に固定）
  characters: boolean; characterMode: MergeMode;    // replace は既存キャラを削除。maxCharactersFor(model) で打ち切り
  vibes: boolean; characterReference: boolean; settings: boolean;
}
export interface ApplyResult { artistTags: number; characters: number; vibesAdded: number; vibesExisting: number }
/** 初期選択（アーティストは全選択、設定のみ OFF） / 何か選ばれているか */
export function defaultSelection(meta: ParsedMetadata): MetadataSelection;
export function hasAnySelected(sel: MetadataSelection): boolean;

/** 選択された項目を生成 UI の各 store に反映する。
 *  settings（model 含む）を最初に適用 → prompt / negative（main ターゲットの override + qualityTags / negativePreset）
 *  → artistTags → characters（Other ジャンル、位置 + プロンプト override）→ キャラ参照（char-ref-store）
 *  → vibes（ipc.importVibeEncoding → addVibeToProject → 選択 + strength 反映、`vibes-changed` を発火）。
 *  Vibe 名は baseName（複数なら `baseName #n`） */
export async function applyMetadata(
  meta: ParsedMetadata, sel: MetadataSelection, projectId: string, baseName: string,
): Promise<ApplyResult>;
```

### 選択の記憶 (`src/lib/metadata-import-prefs.ts`)

```typescript
export interface MetadataImportPrefs {
  prompt; negative; artists: boolean; artistMode: MergeMode; characters; characterMode: MergeMode;
  vibes; characterReference; settings; seed; withImage: boolean;   // withImage = 「画像として使う」でも取り込む
}
export const DEFAULT_PREFS: MetadataImportPrefs;   // settings / seed / withImage は OFF、artistMode は "append"
export function parsePrefs(raw: string | undefined): MetadataImportPrefs;   // 不正値は既定値
export async function loadPrefs(): Promise<MetadataImportPrefs>;            // settings キー metadata_import_prefs
export function savePrefs(prefs: MetadataImportPrefs): void;
export function selectionFromPrefs(meta: ParsedMetadata, p: MetadataImportPrefs): MetadataSelection;
/** 画像に無い項目は前回の値を保持 */
export function prefsFromSelection(meta, sel, prev, withImage): MetadataImportPrefs;
```

`MetadataVibe.encoded` が false（`isImageBase64`: PNG / JPEG / WebP の base64）の Vibe は未エンコード画像として扱い、
取り込み時に `ipc.encodeVibeImage` でエンコードする（1 件 2 Anlas。UI に件数と合計を表示）。
Rust 側はテキストチャンクの Comment に `reference_image_multiple` が無ければ stealth（アルファ）側を優先する。

### シード (`generation-params-store` / `SeedField.tsx`)

`seed: number | null`（null = 毎回ランダム）。ヘッダーの ⚙ ポップオーバーの `SeedField` で入力・表示中の画像のシードを使う・ランダムに戻す。
固定中はポップオーバーのボタンにドットを表示。`buildGenerateRequest` が `seed` を送る。

### UI (`MetadataImportPanel.tsx` / `ImageDropChoiceDialog.tsx`)

`MetadataImportPanel` は制御コンポーネント（`meta` / `sel` / `onChange` / `enabled`）のチェックリスト:
アーティストタグ（タグごとにクリックで選択、キャラ由来は「キャラn」表示、置換・追加トグル）/ プロンプト（選択中のアーティストを除いたプレビュー）/
ネガティブ / キャラクター（置換・追加トグル）/ Vibe（モデルが Vibe 非対応なら無効）/ キャラクター参照 / 設定（既定 OFF）。seed は読み取り専用で表示。

`ImageDropChoiceDialog` が選択状態と「メタデータも一緒にインポート」スイッチ（既定 OFF）を持ち、変更のたびに記憶する。
「選択した項目をインポート」は常に取り込む。スイッチ ON のときは右側の「画像として使う」（Img2Img / 落書き / Inpaint /
キャラ参照 / Vibe）を選んでも先にメタデータを取り込んでから画像の操作を行う。プロンプト・ネガティブ・キャラの長い本文は
「すべて表示」で全文を展開できる。シードも行として選択できる（既定 OFF）。
