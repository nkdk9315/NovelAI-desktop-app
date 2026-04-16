import { invoke } from "@tauri-apps/api/core";
import type {
  VibeDto, StylePresetDto, AssetFolderDto, CountByIdDto, ProjectVibeDto,
  AddVibeRequest, EncodeVibeRequest, UpdateVibeNameRequest,
  UpdateVibeThumbnailRequest, CreateStylePresetRequest,
  UpdateStylePresetRequest, UpdatePresetThumbnailRequest,
} from "@/types";

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

// ---- Vibe folders ----

export function listVibeFolderRoots(): Promise<AssetFolderDto[]> {
  return invoke("list_vibe_folder_roots");
}

export function listVibeFolderChildren(parentId: number): Promise<AssetFolderDto[]> {
  return invoke("list_vibe_folder_children", { parentId });
}

export function createVibeFolder(parentId: number | null, title: string): Promise<AssetFolderDto> {
  return invoke("create_vibe_folder", { parentId, title });
}

export function renameVibeFolder(folderId: number, title: string): Promise<void> {
  return invoke("rename_vibe_folder", { folderId, title });
}

export function moveVibeFolder(folderId: number, newParentId: number | null): Promise<void> {
  return invoke("move_vibe_folder", { folderId, newParentId });
}

export function deleteVibeFolder(folderId: number): Promise<void> {
  return invoke("delete_vibe_folder", { folderId });
}

export function setVibeFolder(vibeId: string, folderId: number | null): Promise<void> {
  return invoke("set_vibe_folder", { vibeId, folderId });
}

export function countVibesPerFolder(): Promise<CountByIdDto[]> {
  return invoke("count_vibes_per_folder");
}

// ---- Style preset folders ----

export function listStylePresetFolderRoots(): Promise<AssetFolderDto[]> {
  return invoke("list_style_preset_folder_roots");
}

export function listStylePresetFolderChildren(parentId: number): Promise<AssetFolderDto[]> {
  return invoke("list_style_preset_folder_children", { parentId });
}

export function createStylePresetFolder(parentId: number | null, title: string): Promise<AssetFolderDto> {
  return invoke("create_style_preset_folder", { parentId, title });
}

export function renameStylePresetFolder(folderId: number, title: string): Promise<void> {
  return invoke("rename_style_preset_folder", { folderId, title });
}

export function moveStylePresetFolder(folderId: number, newParentId: number | null): Promise<void> {
  return invoke("move_style_preset_folder", { folderId, newParentId });
}

export function deleteStylePresetFolder(folderId: number): Promise<void> {
  return invoke("delete_style_preset_folder", { folderId });
}

export function setStylePresetFolder(presetId: string, folderId: number | null): Promise<void> {
  return invoke("set_style_preset_folder", { presetId, folderId });
}

export function countStylePresetsPerFolder(): Promise<CountByIdDto[]> {
  return invoke("count_style_presets_per_folder");
}
