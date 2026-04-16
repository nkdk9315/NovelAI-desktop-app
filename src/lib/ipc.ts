import { invoke } from "@tauri-apps/api/core";
import type {
  ProjectDto, GenreDto, GeneratedImageDto,
  AnlasBalanceDto, CostResultDto,
  CategoryDto, SystemTagDto, ListSystemGroupTagsResponse,
  CreateProjectRequest, UpdateProjectRequest, GenerateImageRequest, CostEstimateRequest,
  CreateGenreRequest, UpdateGenreRequest,
  GenerateImageResponse, PromptGroupDto,
} from "@/types";

// ---- Re-exports from domain-specific IPC modules ----

export {
  listPromptGroups, listPromptGroupFolders, createPromptGroupFolder,
  renamePromptGroupFolder, movePromptGroupFolder, deletePromptGroupFolder,
  deletePromptGroupsInFolder, countGroupsInFolderSubtree,
  listPromptGroupDefaultGenres, setPromptGroupDefaultGenres,
  getPromptGroup, createPromptGroup, updatePromptGroup,
  updatePromptGroupThumbnail, deletePromptGroup,
  getSystemGroupGenreDefaults, setSystemGroupGenreDefaults,
  listDefaultSystemGroupsForGenre,
} from "./ipc-prompt";

export {
  listVibes, addVibe, deleteVibe, encodeVibe,
  updateVibeName, updateVibeThumbnail, clearVibeThumbnail,
  toggleVibeFavorite, exportVibe,
  addVibeToProject, removeVibeFromProject, setVibeVisibility,
  listProjectVibes, listProjectVibesAll,
  listStylePresets, createStylePreset, updateStylePreset, deleteStylePreset,
  updatePresetThumbnail, clearPresetThumbnail, togglePresetFavorite,
  listVibeFolderRoots, listVibeFolderChildren, createVibeFolder,
  renameVibeFolder, moveVibeFolder, deleteVibeFolder,
  setVibeFolder, countVibesPerFolder,
  listStylePresetFolderRoots, listStylePresetFolderChildren, createStylePresetFolder,
  renameStylePresetFolder, moveStylePresetFolder, deleteStylePresetFolder,
  setStylePresetFolder, countStylePresetsPerFolder,
} from "./ipc-assets";

export {
  searchTags, listTagGroupRoots, listTagGroupChildren, listTagGroupTags,
  listUnclassifiedCharacterTags, createUserTagGroup, renameTagGroup,
  deleteTagGroup, moveTagGroup, addTagsToGroup, removeTagsFromGroup,
  listFavoriteTagGroupRoots, listFavoriteTagGroupChildren,
  toggleTagGroupFavorite, countTagMembersPerGroup,
  countFavoriteDescendantsPerGroup, getTagGroup,
  listOrphanTagsByCategory, searchTagsWithGroups,
} from "./ipc-tags";

// ---- Settings ----

export function getSettings(): Promise<Record<string, string>> { return invoke("get_settings"); }
export function setSetting(key: string, value: string): Promise<void> { return invoke("set_setting", { key, value }); }
export function initializeClient(apiKey: string): Promise<void> { return invoke("initialize_client", { apiKey }); }
export function getAnlasBalance(): Promise<AnlasBalanceDto> { return invoke("get_anlas_balance"); }

// ---- Projects ----

export function listProjects(search?: string, projectType?: string): Promise<ProjectDto[]> { return invoke("list_projects", { search, projectType }); }
export function createProject(req: CreateProjectRequest): Promise<ProjectDto> { return invoke("create_project", { req }); }
export function openProject(id: string): Promise<ProjectDto> { return invoke("open_project", { id }); }
export function deleteProject(id: string): Promise<void> { return invoke("delete_project", { id }); }
export function updateProject(req: UpdateProjectRequest): Promise<ProjectDto> { return invoke("update_project", { req }); }
export function updateProjectThumbnail(id: string, thumbnailPath?: string | null): Promise<ProjectDto> { return invoke("update_project_thumbnail", { id, thumbnailPath }); }
export function getDefaultProjectDir(projectType: string, name: string): Promise<string> { return invoke("get_default_project_dir", { projectType, name }); }

// ---- Images ----

export function generateImage(req: GenerateImageRequest): Promise<GenerateImageResponse> { return invoke("generate_image", { req }); }
export function estimateCost(req: CostEstimateRequest): Promise<CostResultDto> { return invoke("estimate_cost", { req }); }
export function saveImage(imageId: string): Promise<void> { return invoke("save_image", { imageId }); }
export function saveAllImages(projectId: string): Promise<void> { return invoke("save_all_images", { projectId }); }
export function deleteImage(imageId: string): Promise<void> { return invoke("delete_image", { imageId }); }
export function getProjectImages(projectId: string, savedOnly?: boolean): Promise<GeneratedImageDto[]> { return invoke("get_project_images", { projectId, savedOnly }); }
export function cleanupUnsavedImages(projectId: string): Promise<void> { return invoke("cleanup_unsaved_images", { projectId }); }

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

// ---- Genres ----

export function listGenres(): Promise<GenreDto[]> { return invoke("list_genres"); }
export function createGenre(req: CreateGenreRequest): Promise<GenreDto> { return invoke("create_genre", { req }); }
export function updateGenre(req: UpdateGenreRequest): Promise<GenreDto> { return invoke("update_genre", { req }); }
export function deleteGenre(id: string): Promise<void> { return invoke("delete_genre", { id }); }

// ---- System Prompts ----

export function getSystemPromptCategories(): Promise<CategoryDto[]> { return invoke("get_system_prompt_categories"); }
export function searchSystemPrompts(query: string, category?: number, limit?: number): Promise<SystemTagDto[]> { return invoke("search_system_prompts", { query, category, limit }); }
export function getRandomArtistTags(count: number): Promise<SystemTagDto[]> { return invoke("get_random_artist_tags", { count }); }
export function listSystemGroupTags(category: number, query?: string, offset?: number, limit?: number): Promise<ListSystemGroupTagsResponse> { return invoke("list_system_group_tags", { category, query, offset, limit }); }

// ---- Hydration helper ----

export async function hydratePromptGroupById(id: string): Promise<PromptGroupDto> {
  if (id.startsWith("tagdb-")) {
    const { getTagGroup, listTagGroupTags } = await import("./ipc-tags");
    const realId = Number(id.slice("tagdb-".length));
    const [meta, tags] = await Promise.all([getTagGroup(realId), listTagGroupTags(realId, 20000)]);
    return {
      id, name: meta.title, folderId: null, defaultGenreIds: [], isSystem: true, usageType: "both",
      tags: tags.map((td, i) => ({ id: `tagdb-tag-${td.id}`, name: td.name, tag: td.name, negativePrompt: "", sortOrder: i, defaultStrength: 0, thumbnailPath: null })),
      createdAt: "", updatedAt: "", thumbnailPath: null, isDefault: false, category: null,
      defaultStrength: 0, randomMode: false, randomCount: 1, randomSource: "enabled", wildcardToken: null,
    };
  }
  const { getPromptGroup } = await import("./ipc-prompt");
  return getPromptGroup(id);
}
