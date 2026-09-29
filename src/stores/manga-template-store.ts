import { create } from "zustand";
import * as ipc from "@/lib/ipc";
import { isPageAspectId, type PageAspectId } from "@/lib/manga-layouts";
import type { Shape } from "@/lib/manga-geometry";

/** A layout the user drew and saved, shared across projects. */
export interface MangaLayoutTemplate {
  id: string;
  name: string;
  aspect: PageAspectId;
  shapes: Shape[];
}

interface MangaTemplateState {
  templates: MangaLayoutTemplate[];
  loaded: boolean;
  load: () => Promise<void>;
  add: (entry: Omit<MangaLayoutTemplate, "id">) => MangaLayoutTemplate;
  remove: (id: string) => void;
}

const STORAGE_KEY = "manga_layout_templates";

function isTemplate(v: unknown): v is MangaLayoutTemplate {
  const o = v as Record<string, unknown> | null;
  return !!o && typeof o.id === "string" && typeof o.name === "string" && isPageAspectId(o.aspect)
    && Array.isArray(o.shapes) && o.shapes.every((s) => Array.isArray(s) && s.length >= 3);
}

function save(list: MangaLayoutTemplate[]) {
  ipc.setSetting(STORAGE_KEY, JSON.stringify(list)).catch(() => {});
}

export const useMangaTemplateStore = create<MangaTemplateState>()((set, get) => ({
  templates: [],
  loaded: false,

  load: async () => {
    try {
      const raw = (await ipc.getSettings())[STORAGE_KEY];
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      set({ templates: Array.isArray(parsed) ? parsed.filter(isTemplate) : [], loaded: true });
    } catch {
      set({ templates: [], loaded: true });
    }
  },

  add: (entry) => {
    const created = { ...entry, id: crypto.randomUUID() };
    const next = [...get().templates, created];
    set({ templates: next });
    save(next);
    return created;
  },

  remove: (id) => {
    const next = get().templates.filter((t) => t.id !== id);
    set({ templates: next });
    save(next);
  },
}));
