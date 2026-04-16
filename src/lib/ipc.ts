import { invoke } from "@tauri-apps/api/core";
import type {
  ProjectDto, GenreDto, PromptGroupDto, GeneratedImageDto,
  AnlasBalanceDto, CostResultDto, CategoryDto, SystemTagDto,
  TagDto, TagGroupDto, TagWithGroupsDto, CountByIdDto,
  GenerateImageResponse, ListSystemGroupTagsResponse,
  CreateProjectRequest, UpdateProjectRequest,
  GenerateImageRequest, CostEstimateRequest,
  CreateGenreRequest, UpdateGenreRequest,
} from "@/types";

// Re-export sub-modules so consumers can use `import * as ipc from "@/lib/ipc"`
export * from "./ipc-prompt";
export * from "./ipc-assets";

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

export function openProject(id: string): Promise<ProjectDto> {
  return invoke("open_project", { id });
}

export function deleteProject(id: string): Promise<void> {
  return invoke("delete_project", { id });
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

export function getProjectImages(projectId: string, savedOnly?: boolean): Promise<GeneratedImageDto[]> {
  return invoke("get_project_images", { projectId, savedOnly });
}

export function cleanupUnsavedImages(projectId: string): Promise<void> {
  return invoke("cleanup_unsaved_images", { projectId });
}

// ---- Genres ----

export function listGenres(): Promise<GenreDto[]> {
  return invoke("list_genres");
}

export function createGenre(req: CreateGenreRequest): Promise<GenreDto> {
  return invoke("create_genre", { req });
}

export function updateGenre(req: UpdateGenreRequest): Promise<GenreDto> {
  return invoke("update_genre", { req });
}

export function deleteGenre(id: string): Promise<void> {
  return invoke("delete_genre", { id });
}

// ---- System Prompts ----

export function getSystemPromptCategories(): Promise<CategoryDto[]> {
  return invoke("get_system_prompt_categories");
}

export function searchSystemPrompts(query: string, category?: number, limit?: number): Promise<SystemTagDto[]> {
  return invoke("search_system_prompts", { query, category, limit });
}

export function getRandomArtistTags(count: number): Promise<SystemTagDto[]> {
  return invoke("get_random_artist_tags", { count });
}

export function listSystemGroupTags(
  category: number, query?: string, offset?: number, limit?: number,
): Promise<ListSystemGroupTagsResponse> {
  return invoke("list_system_group_tags", { category, query, offset, limit });
}

// ---- Tag database (with fixWorkGroupTitles wrapper) ----

function fixWorkGroupTitle(g: TagGroupDto): TagGroupDto {
  if (!g.slug.startsWith("work:")) return g;
  let core = g.slug.slice("work:".length);
  if (core === "unknown_work") {
    return g.title === "Unknown / Original" ? g : { ...g, title: "Unknown / Original" };
  }
  const firstOpen = core.indexOf("(");
  const firstClose = core.indexOf(")");
  const mangled = firstClose >= 0 && (firstOpen < 0 || firstClose < firstOpen);
  if (mangled) core = `(${core})`;
  const rebuilt = core
    .split("_")
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
  return rebuilt === g.title ? g : { ...g, title: rebuilt };
}

function fixWorkGroupTitles(list: TagGroupDto[]): TagGroupDto[] {
  return list.map(fixWorkGroupTitle);
}

export function searchTags(query: string, groupId?: number, limit?: number): Promise<TagDto[]> {
  return invoke("search_tags", { query, groupId, limit });
}

export function listTagGroupRoots(): Promise<TagGroupDto[]> {
  return invoke<TagGroupDto[]>("list_tag_group_roots").then(fixWorkGroupTitles);
}

export function getTagGroup(groupId: number): Promise<TagGroupDto> {
  return invoke<TagGroupDto>("get_tag_group", { groupId }).then((g) => fixWorkGroupTitles([g])[0]);
}

export async function hydratePromptGroupById(id: string): Promise<PromptGroupDto> {
  if (id.startsWith("tagdb-")) {
    const realId = Number(id.slice("tagdb-".length));
    const [meta, tags] = await Promise.all([getTagGroup(realId), listTagGroupTags(realId, 20000)]);
    return {
      id, name: meta.title, folderId: null, defaultGenreIds: [], isSystem: true, usageType: "both",
      tags: tags.map((td, i) => ({ id: `tagdb-tag-${td.id}`, name: td.name, tag: td.name, sortOrder: i, defaultStrength: 0, thumbnailPath: null })),
      createdAt: "", updatedAt: "", thumbnailPath: null, isDefault: false, category: null, defaultStrength: 0,
      randomMode: false, randomCount: 1, randomSource: "enabled", wildcardToken: null,
    };
  }
  // Re-exported from ipc-prompt
  const { getPromptGroup } = await import("./ipc-prompt");
  return getPromptGroup(id);
}

export function listTagGroupChildren(parentId: number): Promise<TagGroupDto[]> {
  return invoke<TagGroupDto[]>("list_tag_group_children", { parentId }).then(fixWorkGroupTitles);
}

export function listTagGroupTags(groupId: number, limit?: number): Promise<TagDto[]> {
  return invoke("list_tag_group_tags", { groupId, limit });
}

export function listUnclassifiedCharacterTags(limit?: number): Promise<TagDto[]> {
  return invoke("list_unclassified_character_tags", { limit });
}

export function createUserTagGroup(parentId: number | null, title: string): Promise<TagGroupDto> {
  return invoke("create_user_tag_group", { parentId, title });
}

export function renameTagGroup(groupId: number, title: string): Promise<void> {
  return invoke("rename_tag_group", { groupId, title });
}

export function deleteTagGroup(groupId: number): Promise<void> {
  return invoke("delete_tag_group", { groupId });
}

export function moveTagGroup(groupId: number, newParentId: number | null): Promise<void> {
  return invoke("move_tag_group", { groupId, newParentId });
}

export function addTagsToGroup(groupId: number, tagIds: number[]): Promise<number> {
  return invoke("add_tags_to_group", { groupId, tagIds });
}

export function removeTagsFromGroup(groupId: number, tagIds: number[]): Promise<number> {
  return invoke("remove_tags_from_group", { groupId, tagIds });
}

export function listFavoriteTagGroupRoots(): Promise<TagGroupDto[]> {
  return invoke<TagGroupDto[]>("list_favorite_tag_group_roots").then(fixWorkGroupTitles);
}

export function listFavoriteTagGroupChildren(parentId: number): Promise<TagGroupDto[]> {
  return invoke<TagGroupDto[]>("list_favorite_tag_group_children", { parentId }).then(fixWorkGroupTitles);
}

export function toggleTagGroupFavorite(groupId: number): Promise<boolean> {
  return invoke("toggle_tag_group_favorite", { groupId });
}

export function searchTagsWithGroups(query: string, limit?: number): Promise<TagWithGroupsDto[]> {
  return invoke("search_tags_with_groups", { query, limit });
}

export function listOrphanTagsByCategory(csvCategory: number, letterBucket?: string, limit?: number): Promise<TagDto[]> {
  return invoke("list_orphan_tags_by_category", { csvCategory, letterBucket, limit });
}

export function countTagMembersPerGroup(): Promise<CountByIdDto[]> {
  return invoke("count_tag_members_per_group");
}

export function countFavoriteDescendantsPerGroup(): Promise<CountByIdDto[]> {
  return invoke("count_favorite_descendants_per_group");
}
