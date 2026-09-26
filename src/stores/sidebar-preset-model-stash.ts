import { create } from "zustand";
import * as ipc from "@/lib/ipc";
import { useGenerationParamsStore, type SidebarPreset } from "./generation-params-store";

/**
 * Sidebar presets are kept per model. `sidebarPresets` in the generation
 * params store is always the list for the *current* model; the lists of the
 * other models wait here and are swapped in when the model changes.
 */
interface PresetStashState {
  /** Lists for models other than the current one. */
  byModel: Record<string, SidebarPreset[]>;
}

export const usePresetStashStore = create<PresetStashState>()(() => ({ byModel: {} }));

// Swap lists on every model change, wherever it comes from (header select,
// "switch model" dialog, history restore). zustand listeners run synchronously
// inside set(), so code that switches the model and then adds a preset
// (e.g. the preset dialog) adds it to the new model's list.
useGenerationParamsStore.subscribe((state, prev) => {
  if (state.model === prev.model) return;
  const { byModel } = usePresetStashStore.getState();
  const next = { ...byModel, [prev.model]: prev.sidebarPresets };
  const incoming = next[state.model] ?? [];
  delete next[state.model];
  usePresetStashStore.setState({ byModel: next });
  useGenerationParamsStore.setState({ sidebarPresets: incoming });
});

const storageKey = (projectId: string) => `sidebar_presets_${projectId}`;

interface StoredPresets {
  byModel: Record<string, SidebarPreset[]>;
}

/** Stored form: every model's list; random presets are session-only. */
export function serializePresets(
  current: SidebarPreset[],
  currentModel: string,
  stash: Record<string, SidebarPreset[]>,
): string {
  const byModel: Record<string, SidebarPreset[]> = {};
  for (const [model, list] of Object.entries({ ...stash, [currentModel]: current })) {
    const kept = list.filter((p) => !p.isRandom);
    if (kept.length > 0) byModel[model] = kept;
  }
  return JSON.stringify({ byModel } satisfies StoredPresets);
}

/** Accepts the per-model format and the legacy flat array (assigned to `currentModel`). */
export function deserializePresets(raw: string | undefined, currentModel: string): Record<string, SidebarPreset[]> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return { [currentModel]: parsed as SidebarPreset[] };
    const byModel = (parsed as Partial<StoredPresets> | null)?.byModel;
    return byModel && typeof byModel === "object" ? byModel : {};
  } catch {
    return {};
  }
}

export async function loadProjectPresets(projectId: string): Promise<void> {
  let byModel: Record<string, SidebarPreset[]> = {};
  try {
    const model = useGenerationParamsStore.getState().model;
    byModel = deserializePresets((await ipc.getSettings())[storageKey(projectId)], model);
  } catch { /* start empty */ }
  // Read the model again: it may have changed while settings were loading.
  const model = useGenerationParamsStore.getState().model;
  const { [model]: current = [], ...others } = byModel;
  usePresetStashStore.setState({ byModel: others });
  useGenerationParamsStore.setState({ sidebarPresets: current });
}

export function saveProjectPresets(projectId: string): void {
  const { sidebarPresets, model } = useGenerationParamsStore.getState();
  const value = serializePresets(sidebarPresets, model, usePresetStashStore.getState().byModel);
  ipc.setSetting(storageKey(projectId), value).catch(() => {});
}
