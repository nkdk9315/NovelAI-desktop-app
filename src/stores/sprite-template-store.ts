import { create } from "zustand";
import * as ipc from "@/lib/ipc";
import { normalizeSpec, type SpriteSpec } from "@/lib/sprite/spec";

const KEY = "sprite_templates";

export interface UserSpriteTemplate {
  id: string;
  name: string;
  spec: SpriteSpec;
}

interface State {
  templates: UserSpriteTemplate[];
  loaded: boolean;
  load: () => Promise<void>;
  add: (name: string, spec: SpriteSpec) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

/** Sprite set definitions saved by the user (all projects), in the settings table. */
export const useSpriteTemplateStore = create<State>()((set, get) => {
  const persist = (templates: UserSpriteTemplate[]) => ipc.setSetting(KEY, JSON.stringify(templates));
  return {
    templates: [],
    loaded: false,
    load: async () => {
      const raw = (await ipc.getSettings())[KEY];
      let list: UserSpriteTemplate[] = [];
      try {
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) {
          list = parsed.filter((t) => t && typeof t.id === "string").map((t) => ({ ...t, spec: normalizeSpec(t.spec) }));
        }
      } catch { /* broken setting: start empty */ }
      set({ templates: list, loaded: true });
    },
    add: async (name, spec) => {
      const templates = [...get().templates, { id: crypto.randomUUID(), name, spec }];
      set({ templates });
      await persist(templates);
    },
    remove: async (id) => {
      const templates = get().templates.filter((t) => t.id !== id);
      set({ templates });
      await persist(templates);
    },
  };
});
