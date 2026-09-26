import { create } from "zustand";
import * as ipc from "@/lib/ipc";
import type { CustomQualityTag } from "@/lib/prompt-decoration";

/** User-registered quality tags, shared across projects. */
interface QualityTagState {
  customQualityTags: CustomQualityTag[];
  loaded: boolean;
  loadCustomQualityTags: () => Promise<void>;
  addCustomQualityTag: (name: string, tags: string) => CustomQualityTag;
  updateCustomQualityTag: (id: string, partial: Partial<Omit<CustomQualityTag, "id">>) => void;
  removeCustomQualityTag: (id: string) => void;
}

const STORAGE_KEY = "custom_quality_tags";

function isCustomQualityTag(v: unknown): v is CustomQualityTag {
  const o = v as Record<string, unknown> | null;
  return !!o && typeof o.id === "string" && typeof o.name === "string" && typeof o.tags === "string";
}

function save(list: CustomQualityTag[]) {
  ipc.setSetting(STORAGE_KEY, JSON.stringify(list)).catch(() => {});
}

export const useQualityTagStore = create<QualityTagState>()((set, get) => ({
  customQualityTags: [],
  loaded: false,

  loadCustomQualityTags: async () => {
    try {
      const raw = (await ipc.getSettings())[STORAGE_KEY];
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      set({ customQualityTags: Array.isArray(parsed) ? parsed.filter(isCustomQualityTag) : [], loaded: true });
    } catch {
      set({ customQualityTags: [], loaded: true });
    }
  },

  addCustomQualityTag: (name, tags) => {
    const entry = { id: crypto.randomUUID(), name, tags };
    const next = [...get().customQualityTags, entry];
    set({ customQualityTags: next });
    save(next);
    return entry;
  },

  updateCustomQualityTag: (id, partial) => {
    const next = get().customQualityTags.map((c) => (c.id === id ? { ...c, ...partial } : c));
    set({ customQualityTags: next });
    save(next);
  },

  removeCustomQualityTag: (id) => {
    const next = get().customQualityTags.filter((c) => c.id !== id);
    set({ customQualityTags: next });
    save(next);
  },
}));
