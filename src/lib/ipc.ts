import { invoke } from "@tauri-apps/api/core";
import type {
  ProjectDto, GenreDto, PromptGroupDto, GeneratedImageDto,
  VibeDto, StylePresetDto, AnlasBalanceDto, CostResultDto,
  CategoryDto, SystemTagDto,
  GenerateImageResponse, ProjectVibeDto,
  CreateProjectRequest, UpdateProjectRequest, GenerateImageRequest, CostEstimateRequest,
  CreatePromptGroupRequest, UpdatePromptGroupRequest, CreateGenreRequest,
  AddVibeRequest, EncodeVibeRequest, UpdateVibeNameRequest,
  UpdateVibeThumbnailRequest, CreateStylePresetRequest,
  UpdateStylePresetRequest, UpdatePresetThumbnailRequest,
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

export function listProjects(
  search?: string,
  projectType?: string,
): Promise<ProjectDto[]> {
  return invoke("list_projects", { search, projectType });
}

export function createProject(req: CreateProjectRequest): Promise<ProjectDto> {
  return invoke("create_project", { req });
}

export function openProject(id: string): Promise<ProjectDto> {
  return invoke("open_project", { id });
}

export function deleteProject(id: string): Promise<void> {
  return invoke("delete_project", { id });
}

export function updateProject(req: UpdateProjectRequest): Promise<ProjectDto> {
  return invoke("update_project", { req });
}

export function updateProjectThumbnail(
  id: string,
  thumbnailPath?: string | null,
): Promise<ProjectDto> {
  return invoke("update_project_thumbnail", { id, thumbnailPath });
}

export function getDefaultProjectDir(
  projectType: string,
  name: string,
): Promise<string> {
  return invoke("get_default_project_dir", { projectType, name });
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

export function updateVibeName(req: UpdateVibeNameRequest): Promise<VibeDto> {
  return invoke("update_vibe_name", { req });
}

export function updateVibeThumbnail(req: UpdateVibeThumbnailRequest): Promise<VibeDto> {
  return invoke("update_vibe_thumbnail", { req });
}

export function clearVibeThumbnail(id: string): Promise<VibeDto> {
  return invoke("clear_vibe_thumbnail", { id });
}

export function toggleVibeFavorite(id: string): Promise<VibeDto> {
  return invoke("toggle_vibe_favorite", { id });
}

export function exportVibe(id: string, destPath: string): Promise<void> {
  return invoke("export_vibe", { id, destPath });
}

export function addVibeToProject(projectId: string, vibeId: string): Promise<void> {
  return invoke("add_vibe_to_project", { projectId, vibeId });
}

export function removeVibeFromProject(projectId: string, vibeId: string): Promise<void> {
  return invoke("remove_vibe_from_project", { projectId, vibeId });
}

export function setVibeVisibility(projectId: string, vibeId: string, isVisible: boolean): Promise<void> {
  return invoke("set_vibe_visibility", { projectId, vibeId, isVisible });
}

export function listProjectVibes(projectId: string): Promise<VibeDto[]> {
  return invoke("list_project_vibes", { projectId });
}

export function listProjectVibesAll(projectId: string): Promise<ProjectVibeDto[]> {
  return invoke("list_project_vibes_all", { projectId });
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

export function updatePresetThumbnail(req: UpdatePresetThumbnailRequest): Promise<StylePresetDto> {
  return invoke("update_preset_thumbnail", { req });
}

export function clearPresetThumbnail(id: string): Promise<StylePresetDto> {
  return invoke("clear_preset_thumbnail", { id });
}

export function togglePresetFavorite(id: string): Promise<StylePresetDto> {
  return invoke("toggle_preset_favorite", { id });
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

export function getRandomArtistTags(count: number): Promise<SystemTagDto[]> {
  return invoke("get_random_artist_tags", { count });
}

// Tag database IPC functions are in ipc-tags.ts
