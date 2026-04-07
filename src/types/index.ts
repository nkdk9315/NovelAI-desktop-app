// ---- Entities ----

export interface ProjectDto {
  id: string;
  name: string;
  projectType: string;
  directoryPath: string;
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
  genreId: string | null;
  isDefaultForGenre: boolean;
  isSystem: boolean;
  usageType: "main" | "character" | "both";
  tags: PromptGroupTagDto[];
  createdAt: string;
  updatedAt: string;
}

export interface PromptGroupTagDto {
  id: string;
  tag: string;
  sortOrder: number;
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
  directoryPath: string;
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
  | { type: "Generate" }
  | { type: "Img2Img"; sourceImageBase64: string; strength: number; noise: number }
  | { type: "Infill"; sourceImageBase64: string; maskBase64: string; maskStrength: number; colorCorrect: boolean };

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

export interface CreatePromptGroupRequest {
  name: string;
  genreId?: string;
  usageType: string;
  tags: string[];
}

export interface UpdatePromptGroupRequest {
  id: string;
  name?: string;
  genreId?: string | null;
  tags?: string[];
  isDefaultForGenre?: boolean;
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
