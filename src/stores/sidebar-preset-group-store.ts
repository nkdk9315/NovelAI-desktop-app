import { create } from "zustand";
import type {
  SidebarPresetGroupInstanceDto,
  SidebarPresetGroupActivePreset,
} from "@/types";
import * as ipc from "@/lib/ipc";

interface SidebarPresetGroupState {
  projectId: string | null;
  instances: SidebarPresetGroupInstanceDto[];
  isLoading: boolean;
  loadInstances: (projectId: string) => Promise<void>;
  clear: () => void;
  addInstance: (
    folderId: number,
    sourceCharacterId: string,
    targetCharacterId: string,
  ) => Promise<SidebarPresetGroupInstanceDto | null>;
  updatePair: (
    id: string,
    sourceCharacterId: string,
    targetCharacterId: string,
  ) => Promise<void>;
  togglePreset: (instanceId: string, presetId: string) => Promise<void>;
  setDefaultStrength: (
    instanceId: string,
    positive: number,
    negative: number,
  ) => Promise<void>;
  setPresetStrength: (
    instanceId: string,
    presetId: string,
    positive: number | null,
    negative: number | null,
  ) => Promise<void>;
  removeInstance: (id: string) => Promise<void>;
  reorder: (orderedIds: string[]) => Promise<void>;
}

export const useSidebarPresetGroupStore = create<SidebarPresetGroupState>()((set, get) => ({
  projectId: null,
  instances: [],
  isLoading: false,

  loadInstances: async (projectId) => {
    set({ isLoading: true, projectId });
    const instances = await ipc.listSidebarPresetGroupInstances(projectId);
    set({ instances, isLoading: false });
  },

  clear: () => set({ projectId: null, instances: [] }),

  addInstance: async (folderId, sourceCharacterId, targetCharacterId) => {
    const projectId = get().projectId;
    if (!projectId) return null;
    const created = await ipc.createSidebarPresetGroupInstance({
      projectId,
      folderId,
      sourceCharacterId,
      targetCharacterId,
    });
    set((s) => ({ instances: [...s.instances, created] }));
    return created;
  },

  updatePair: async (id, sourceCharacterId, targetCharacterId) => {
    await ipc.updateSidebarPresetGroupPair({ id, sourceCharacterId, targetCharacterId });
    set((s) => ({
      instances: s.instances.map((inst) =>
        inst.id === id ? { ...inst, sourceCharacterId, targetCharacterId } : inst,
      ),
    }));
  },

  togglePreset: async (instanceId, presetId) => {
    const inst = get().instances.find((i) => i.id === instanceId);
    if (!inst) return;
    const currentIds = inst.activePresets.map((a) => a.presetId);
    const isActive = currentIds.includes(presetId);
    const nextIds = isActive
      ? currentIds.filter((p) => p !== presetId)
      : [...currentIds, presetId];
    await ipc.setSidebarPresetGroupActivePresets({ id: instanceId, presetIds: nextIds });
    const nextActive: SidebarPresetGroupActivePreset[] = isActive
      ? inst.activePresets.filter((a) => a.presetId !== presetId)
      : [
          ...inst.activePresets,
          {
            presetId,
            positiveStrength: null,
            negativeStrength: null,
            activatedAt: new Date().toISOString(),
          },
        ];
    set((s) => ({
      instances: s.instances.map((i) =>
        i.id === instanceId ? { ...i, activePresets: nextActive } : i,
      ),
    }));
  },

  setDefaultStrength: async (instanceId, positive, negative) => {
    await ipc.updateSidebarPresetGroupDefaultStrength({
      id: instanceId,
      defaultPositiveStrength: positive,
      defaultNegativeStrength: negative,
    });
    set((s) => ({
      instances: s.instances.map((i) =>
        i.id === instanceId
          ? { ...i, defaultPositiveStrength: positive, defaultNegativeStrength: negative }
          : i,
      ),
    }));
  },

  setPresetStrength: async (instanceId, presetId, positive, negative) => {
    await ipc.setSidebarPresetGroupPresetStrength({
      instanceId,
      presetId,
      positiveStrength: positive,
      negativeStrength: negative,
    });
    set((s) => ({
      instances: s.instances.map((i) =>
        i.id === instanceId
          ? {
              ...i,
              activePresets: i.activePresets.map((a) =>
                a.presetId === presetId
                  ? { ...a, positiveStrength: positive, negativeStrength: negative }
                  : a,
              ),
            }
          : i,
      ),
    }));
  },

  removeInstance: async (id) => {
    await ipc.deleteSidebarPresetGroupInstance(id);
    set((s) => ({ instances: s.instances.filter((i) => i.id !== id) }));
  },

  reorder: async (orderedIds) => {
    const projectId = get().projectId;
    if (!projectId) return;
    await ipc.reorderSidebarPresetGroupInstances({ projectId, orderedIds });
    set((s) => {
      const map = new Map(s.instances.map((i) => [i.id, i]));
      const next = orderedIds
        .map((id, idx) => {
          const inst = map.get(id);
          return inst ? { ...inst, position: idx } : null;
        })
        .filter((x): x is SidebarPresetGroupInstanceDto => x !== null);
      return { instances: next };
    });
  },
}));
