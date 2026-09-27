import { create } from "zustand";
import * as ipc from "@/lib/ipc";
import { BUBBLE_SHAPES, type BubbleShape, type CustomBubbleStyle } from "@/lib/bubble-styles";

/** User-registered dialogue kinds (bubble shapes etc.), shared across projects. */
interface BubbleStyleState {
  customBubbleStyles: CustomBubbleStyle[];
  loaded: boolean;
  loadCustomBubbleStyles: () => Promise<void>;
  addCustomBubbleStyle: (entry: Omit<CustomBubbleStyle, "id">) => CustomBubbleStyle;
  updateCustomBubbleStyle: (id: string, partial: Partial<Omit<CustomBubbleStyle, "id">>) => void;
  removeCustomBubbleStyle: (id: string) => void;
}

const STORAGE_KEY = "custom_bubble_styles";

function isCustomBubbleStyle(v: unknown): v is CustomBubbleStyle {
  const o = v as Record<string, unknown> | null;
  return !!o && typeof o.id === "string" && typeof o.name === "string" && typeof o.phrase === "string"
    && typeof o.tags === "string" && BUBBLE_SHAPES.includes(o.shape as BubbleShape);
}

function save(list: CustomBubbleStyle[]) {
  ipc.setSetting(STORAGE_KEY, JSON.stringify(list)).catch(() => {});
}

export const useBubbleStyleStore = create<BubbleStyleState>()((set, get) => ({
  customBubbleStyles: [],
  loaded: false,

  loadCustomBubbleStyles: async () => {
    try {
      const raw = (await ipc.getSettings())[STORAGE_KEY];
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      set({ customBubbleStyles: Array.isArray(parsed) ? parsed.filter(isCustomBubbleStyle) : [], loaded: true });
    } catch {
      set({ customBubbleStyles: [], loaded: true });
    }
  },

  addCustomBubbleStyle: (entry) => {
    const created = { ...entry, id: crypto.randomUUID() };
    const next = [...get().customBubbleStyles, created];
    set({ customBubbleStyles: next });
    save(next);
    return created;
  },

  updateCustomBubbleStyle: (id, partial) => {
    const next = get().customBubbleStyles.map((c) => (c.id === id ? { ...c, ...partial } : c));
    set({ customBubbleStyles: next });
    save(next);
  },

  removeCustomBubbleStyle: (id) => {
    const next = get().customBubbleStyles.filter((c) => c.id !== id);
    set({ customBubbleStyles: next });
    save(next);
  },
}));
