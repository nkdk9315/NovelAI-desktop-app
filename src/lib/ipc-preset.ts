import { invoke } from "@tauri-apps/api/core";
import type {
  PromptPresetDto, PresetFolderDto,
  CreatePromptPresetRequest, UpdatePromptPresetRequest,
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
