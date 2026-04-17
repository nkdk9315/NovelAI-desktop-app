import { invoke } from "@tauri-apps/api/core";
import type {
  PromptPresetDto, PresetFolderDto,
  CreatePromptPresetRequest, UpdatePromptPresetRequest,
  SidebarPresetGroupInstanceDto,
  CreateSidebarPresetGroupInstanceRequest,
  UpdateSidebarPresetGroupPairRequest,
  SetSidebarPresetGroupActivePresetsRequest,
  ReorderSidebarPresetGroupInstancesRequest,
  UpdateSidebarPresetGroupDefaultStrengthRequest,
  SetSidebarPresetGroupPresetStrengthRequest,
} from "@/types";

// ---- Prompt Presets ----

export function listPromptPresets(search?: string): Promise<PromptPresetDto[]> {
  return invoke("list_prompt_presets", { search });
}

export function getPromptPreset(id: string): Promise<PromptPresetDto> {
  return invoke("get_prompt_preset", { id });
}

export function createPromptPreset(req: CreatePromptPresetRequest): Promise<PromptPresetDto> {
  return invoke("create_prompt_preset", { req });
}

export function updatePromptPreset(req: UpdatePromptPresetRequest): Promise<void> {
  return invoke("update_prompt_preset", { req });
}

export function deletePromptPreset(id: string): Promise<void> {
  return invoke("delete_prompt_preset", { id });
}

// ---- Preset Folders ----

export function listPresetFolders(): Promise<PresetFolderDto[]> {
  return invoke("list_preset_folders");
}

export function createPresetFolder(title: string, parentId: number | null): Promise<PresetFolderDto> {
  return invoke("create_preset_folder", { title, parentId });
}

export function renamePresetFolder(id: number, title: string): Promise<void> {
  return invoke("rename_preset_folder", { folderId: id, title });
}

export function movePresetFolder(id: number, parentId: number | null): Promise<void> {
  return invoke("move_preset_folder", { folderId: id, newParentId: parentId });
}

export function deletePresetFolder(id: number): Promise<void> {
  return invoke("delete_preset_folder", { folderId: id });
}

export function deletePresetsInFolder(folderId: number): Promise<number> {
  return invoke("delete_presets_in_folder", { folderId });
}

export function countPresetsInFolder(folderId: number): Promise<number> {
  return invoke("count_presets_in_folder", { folderId });
}

export function setPresetFolder(presetId: string, folderId: number | null): Promise<void> {
  return invoke("set_preset_folder", { presetId, folderId });
}

// ---- Sidebar Preset Group Instances ----

export function listSidebarPresetGroupInstances(projectId: string): Promise<SidebarPresetGroupInstanceDto[]> {
  return invoke("list_sidebar_preset_group_instances", { projectId });
}

export function createSidebarPresetGroupInstance(
  req: CreateSidebarPresetGroupInstanceRequest,
): Promise<SidebarPresetGroupInstanceDto> {
  return invoke("create_sidebar_preset_group_instance", { req });
}

export function updateSidebarPresetGroupPair(req: UpdateSidebarPresetGroupPairRequest): Promise<void> {
  return invoke("update_sidebar_preset_group_pair", { req });
}

export function setSidebarPresetGroupActivePresets(
  req: SetSidebarPresetGroupActivePresetsRequest,
): Promise<void> {
  return invoke("set_sidebar_preset_group_active_presets", { req });
}

export function deleteSidebarPresetGroupInstance(id: string): Promise<void> {
  return invoke("delete_sidebar_preset_group_instance", { id });
}

export function reorderSidebarPresetGroupInstances(
  req: ReorderSidebarPresetGroupInstancesRequest,
): Promise<void> {
  return invoke("reorder_sidebar_preset_group_instances", { req });
}

export function updateSidebarPresetGroupDefaultStrength(
  req: UpdateSidebarPresetGroupDefaultStrengthRequest,
): Promise<void> {
  return invoke("update_sidebar_preset_group_default_strength", { req });
}

export function setSidebarPresetGroupPresetStrength(
  req: SetSidebarPresetGroupPresetStrengthRequest,
): Promise<void> {
  return invoke("set_sidebar_preset_group_preset_strength", { req });
}
