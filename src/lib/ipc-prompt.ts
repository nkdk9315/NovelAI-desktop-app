import { invoke } from "@tauri-apps/api/core";
import type {
  PromptGroupDto, PromptGroupFolderDto,
  CreatePromptGroupRequest, UpdatePromptGroupRequest,
  SystemGroupGenreDefaultDto,
} from "@/types";

// ---- Prompt Groups ----

export function listPromptGroups(search?: string): Promise<PromptGroupDto[]> {
  return invoke("list_prompt_groups", { search });
}

export function listPromptGroupFolders(): Promise<PromptGroupFolderDto[]> {
  return invoke("list_prompt_group_folders");
}

export function createPromptGroupFolder(
  title: string, parentId: number | null,
): Promise<PromptGroupFolderDto> {
  return invoke("create_prompt_group_folder", { title, parentId });
}

export function renamePromptGroupFolder(id: number, title: string): Promise<void> {
  return invoke("rename_prompt_group_folder", { folderId: id, title });
}

export function movePromptGroupFolder(id: number, parentId: number | null): Promise<void> {
  return invoke("move_prompt_group_folder", { folderId: id, newParentId: parentId });
}

export function deletePromptGroupFolder(id: number): Promise<void> {
  return invoke("delete_prompt_group_folder", { folderId: id });
}

export function deletePromptGroupsInFolder(folderId: number): Promise<number> {
  return invoke("delete_prompt_groups_in_folder", { folderId });
}

export function countGroupsInFolderSubtree(folderId: number): Promise<number> {
  return invoke("count_prompt_groups_in_folder", { folderId });
}

export function listPromptGroupDefaultGenres(groupId: string): Promise<string[]> {
  return invoke("list_prompt_group_default_genres", { groupId });
}

export function setPromptGroupDefaultGenres(groupId: string, genreIds: string[]): Promise<void> {
  return invoke("set_prompt_group_default_genres", { groupId, genreIds });
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

export function updatePromptGroupThumbnail(id: string, thumbnailPath?: string | null): Promise<void> {
  return invoke("update_prompt_group_thumbnail", { id, thumbnailPath });
}

export function deletePromptGroup(id: string): Promise<void> {
  return invoke("delete_prompt_group", { id });
}

// ---- System prompt group settings ----

export function getSystemGroupGenreDefaults(systemGroupId: string): Promise<SystemGroupGenreDefaultDto[]> {
  return invoke("get_system_group_genre_defaults", { systemGroupId });
}

export function setSystemGroupGenreDefaults(
  systemGroupId: string, entries: SystemGroupGenreDefaultDto[],
): Promise<void> {
  return invoke("set_system_group_genre_defaults", { req: { systemGroupId, entries } });
}

export function listDefaultSystemGroupsForGenre(genreId: string): Promise<string[]> {
  return invoke("list_default_system_groups_for_genre", { genreId });
}
