// ---- Entities ----

export interface ProjectDto {
  id: string;
  name: string;
  projectType: string;
  directoryPath: string;
  createdAt: string;
  updatedAt: string;
  thumbnailPath: string | null;
}

export interface GenreDto {
  id: string;
  name: string;
  isSystem: boolean;
  sortOrder: number;
  createdAt: string;
  icon: string;
  color: string;
}

export interface PromptGroupDto {
  id: string;
  name: string;
  folderId: number | null;
  defaultGenreIds: string[];
  isSystem: boolean;
  usageType: string;
  tags: PromptGroupTagDto[];
  createdAt: string;
  updatedAt: string;
  thumbnailPath: string | null;
  isDefault: boolean;
  category: number | null;
  defaultStrength: number;
  randomMode: boolean;
  randomCount: number;
  randomSource: "all" | "enabled";
  wildcardToken: string | null;
}

export interface PromptGroupFolderDto {
  id: number;
  title: string;
  parentId: number | null;
  sortKey: number;
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
  thumbnailPath: string | null;
  isFavorite: boolean;
  folderId: number | null;
}

export interface AssetFolderDto {
  id: number;
  title: string;
  parentId: number | null;
  sortKey: number;
  childCount: number;
}

export interface ArtistTag {
  name: string;
  strength: number;
}

export interface PresetVibeRef {
  vibeId: string;
  strength: number;
}

export interface StylePresetDto {
  id: string;
  name: string;
  artistTags: ArtistTag[];
  vibeRefs: PresetVibeRef[];
  createdAt: string;
  thumbnailPath: string | null;
  isFavorite: boolean;
  model: string;
  folderId: number | null;
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

// ---- Tag database (migration 013) ----

export interface TagDto {
  id: number;
  name: string;
  csvCategory: number | null;
}

export interface TagGroupDto {
  id: number;
  slug: string;
  title: string;
  parentId: number | null;
  kind: string;
  source: string;
  sortKey: number;
  childCount: number;
  isFavorite: boolean;
}

export interface TagWithGroupsDto {
  tag: TagDto;
  groups: TagGroupDto[];
}

export interface CountByIdDto {
  id: number;
  count: number;
}

// ---- Requests ----

export interface CreateProjectRequest {
  name: string;
  projectType: string;
  directoryPath?: string;
  thumbnailPath?: string;
}

export interface UpdateProjectRequest {
  id: string;
  name?: string;
  thumbnailPath?: string | null;
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

export interface TagInput {
  name?: string;
  tag: string;
  defaultStrength?: number;
  thumbnailPath?: string;
}

export interface CreatePromptGroupRequest {
  name: string;
  folderId?: number | null;
  defaultGenreIds?: string[];
  tags: TagInput[];
  defaultStrength?: number;
}

export interface UpdatePromptGroupRequest {
  id: string;
  name?: string;
  folderId?: number | null;
  defaultGenreIds?: string[];
  tags?: TagInput[];
  isDefault?: boolean;
  thumbnailPath?: string | null;
  defaultStrength?: number;
  randomMode?: boolean;
  randomCount?: number;
  randomSource?: "all" | "enabled";
  wildcardToken?: string | null;
}

export interface CreateGenreRequest {
  name: string;
  icon?: string;
  color?: string;
}

export interface UpdateGenreRequest {
  id: string;
  name?: string;
  icon?: string;
  color?: string;
}

export interface ListSystemGroupTagsResponse {
  tags: SystemTagDto[];
  totalCount: number;
}

export interface AddVibeRequest {
  filePath: string;
  name: string;
  thumbnailPath?: string;
}

export interface EncodeVibeRequest {
  imagePath: string;
  model: string;
  name: string;
  informationExtracted: number;
}

export interface UpdateVibeNameRequest {
  id: string;
  name: string;
}

export interface UpdateVibeThumbnailRequest {
  id: string;
  thumbnailPath: string;
}

export interface ProjectVibeDto {
  vibeId: string;
  vibeName: string;
  thumbnailPath: string | null;
  filePath: string;
  model: string;
  isVisible: boolean;
  addedAt: string;
}

export interface CreateStylePresetRequest {
  name: string;
  artistTags: ArtistTag[];
  vibeRefs: PresetVibeRef[];
  model: string;
}

export interface UpdateStylePresetRequest {
  id: string;
  name?: string;
  artistTags?: ArtistTag[];
  vibeRefs?: PresetVibeRef[];
}

export interface UpdatePresetThumbnailRequest {
  id: string;
  thumbnailPath: string;
}

export interface SystemGroupGenreDefaultDto {
  genreId: string;
  showByDefault: boolean;
}

// ---- Random Preset Settings ----

export interface RandomPresetSettings {
  vibeCount: number | "random";
  artistTagCount: number | "random";
  artistTagCountMin: number;
  artistTagCountMax: number;
  artistTagStrength: number | "random";
  artistTagStrengthMin: number;
  artistTagStrengthMax: number;
  vibeStrengthMin: number;
  vibeStrengthMax: number;
  favoritesOnly: boolean;
  folderIds: number[];
}

// ---- Error ----

export interface AppError {
  kind: "NotFound" | "Validation" | "Database" | "ApiClient" | "Io" | "NotInitialized";
  message: string;
}
