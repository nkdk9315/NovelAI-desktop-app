import { invoke } from "@tauri-apps/api/core";
import type { TagDto, TagGroupDto, TagWithGroupsDto, CountByIdDto } from "@/types";

// ---- Tag database (migration 013) ----

export function searchTags(
  query: string,
  groupId?: number,
  limit?: number,
): Promise<TagDto[]> {
  return invoke("search_tags", { query, groupId, limit });
}

export function listTagGroupRoots(): Promise<TagGroupDto[]> {
  return invoke("list_tag_group_roots");
}

export function listTagGroupChildren(parentId: number): Promise<TagGroupDto[]> {
  return invoke("list_tag_group_children", { parentId });
}

export function listTagGroupTags(
  groupId: number,
  limit?: number,
): Promise<TagDto[]> {
  return invoke("list_tag_group_tags", { groupId, limit });
}

export function listUnclassifiedCharacterTags(limit?: number): Promise<TagDto[]> {
  return invoke("list_unclassified_character_tags", { limit });
}

export function createUserTagGroup(
  parentId: number | null,
  title: string,
): Promise<TagGroupDto> {
  return invoke("create_user_tag_group", { parentId, title });
}

export function renameTagGroup(groupId: number, title: string): Promise<void> {
  return invoke("rename_tag_group", { groupId, title });
}

export function deleteTagGroup(groupId: number): Promise<void> {
  return invoke("delete_tag_group", { groupId });
}

export function moveTagGroup(
  groupId: number,
  newParentId: number | null,
): Promise<void> {
  return invoke("move_tag_group", { groupId, newParentId });
}

export function addTagsToGroup(groupId: number, tagIds: number[]): Promise<number> {
  return invoke("add_tags_to_group", { groupId, tagIds });
}

export function removeTagsFromGroup(
  groupId: number,
  tagIds: number[],
): Promise<number> {
  return invoke("remove_tags_from_group", { groupId, tagIds });
}

// ---- Tag favorites (migration 014) ----

export function listFavoriteTagGroupRoots(): Promise<TagGroupDto[]> {
  return invoke("list_favorite_tag_group_roots");
}

export function listFavoriteTagGroupChildren(parentId: number): Promise<TagGroupDto[]> {
  return invoke("list_favorite_tag_group_children", { parentId });
}

export function toggleTagGroupFavorite(groupId: number): Promise<boolean> {
  return invoke("toggle_tag_group_favorite", { groupId });
}

export function countTagMembersPerGroup(): Promise<CountByIdDto[]> {
  return invoke("count_tag_members_per_group");
}

export function countFavoriteDescendantsPerGroup(): Promise<CountByIdDto[]> {
  return invoke("count_favorite_descendants_per_group");
}

export function getTagGroup(groupId: number): Promise<TagGroupDto> {
  return invoke("get_tag_group", { groupId });
}

export function listOrphanTagsByCategory(
  csvCategory: number,
  letterBucket?: string,
  limit?: number,
): Promise<TagDto[]> {
  return invoke("list_orphan_tags_by_category", { csvCategory, letterBucket, limit });
}

export function searchTagsWithGroups(
  query: string,
  limit?: number,
): Promise<TagWithGroupsDto[]> {
  return invoke("search_tags_with_groups", { query, limit });
}
