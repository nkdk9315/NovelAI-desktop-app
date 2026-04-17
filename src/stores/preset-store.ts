import { create } from "zustand";
import type {
  PromptPresetDto, PresetFolderDto,
  CreatePromptPresetRequest, UpdatePromptPresetRequest,
} from "@/types";
import * as ipc from "@/lib/ipc";

interface PresetState {
  presets: PromptPresetDto[];
  presetFolders: PresetFolderDto[];
  isLoading: boolean;
  loadPresets: (search?: string) => Promise<void>;
  loadPresetFolders: () => Promise<void>;
  createPreset: (req: CreatePromptPresetRequest) => Promise<PromptPresetDto>;
  updatePreset: (req: UpdatePromptPresetRequest) => Promise<void>;
  deletePreset: (id: string) => Promise<void>;
  createPresetFolder: (title: string, parentId: number | null) => Promise<PresetFolderDto>;
  renamePresetFolder: (id: number, title: string) => Promise<void>;
  movePresetFolder: (id: number, parentId: number | null) => Promise<void>;
  deletePresetFolder: (id: number) => Promise<void>;
  deletePresetsInFolder: (folderId: number) => Promise<number>;
}

export const usePresetStore = create<PresetState>()((set, get) => ({
  presets: [],
  presetFolders: [],
  isLoading: false,
  loadPresets: async (search) => {
    set({ isLoading: true });
    const presets = await ipc.listPromptPresets(search);
    set({ presets, isLoading: false });
  },
  loadPresetFolders: async () => {
    const presetFolders = await ipc.listPresetFolders();
    set({ presetFolders });
  },
  createPreset: async (req) => {
    const preset = await ipc.createPromptPreset(req);
    set((state) => ({ presets: [preset, ...state.presets] }));
    return preset;
  },
  updatePreset: async (req) => {
    await ipc.updatePromptPreset(req);
  },
  deletePreset: async (id) => {
    await ipc.deletePromptPreset(id);
    set((state) => ({ presets: state.presets.filter((p) => p.id !== id) }));
  },
  createPresetFolder: async (title, parentId) => {
    const folder = await ipc.createPresetFolder(title, parentId);
    await get().loadPresetFolders();
    return folder;
  },
  renamePresetFolder: async (id, title) => {
    await ipc.renamePresetFolder(id, title);
    await get().loadPresetFolders();
  },
  movePresetFolder: async (id, parentId) => {
    await ipc.movePresetFolder(id, parentId);
    await get().loadPresetFolders();
  },
  deletePresetFolder: async (id) => {
    await ipc.deletePresetFolder(id);
    await Promise.all([get().loadPresetFolders(), get().loadPresets()]);
  },
  deletePresetsInFolder: async (folderId) => {
    const count = await ipc.deletePresetsInFolder(folderId);
    await get().loadPresets();
    return count;
  },
}));
