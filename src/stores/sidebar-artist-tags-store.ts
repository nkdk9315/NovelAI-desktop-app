import { create } from "zustand";
import type { ArtistTag } from "@/types";
import * as ipc from "@/lib/ipc";

interface SidebarArtistTagsState {
  sidebarArtistTags: ArtistTag[];
  addSidebarArtistTag: (name: string) => void;
  removeSidebarArtistTag: (name: string) => void;
  updateSidebarArtistTagStrength: (name: string, strength: number) => void;
  saveSidebarArtistTags: (projectId: string) => void;
  loadSidebarArtistTags: (projectId: string) => Promise<void>;
  setSidebarArtistTags: (tags: ArtistTag[]) => void;
}

export const useSidebarArtistTagsStore = create<SidebarArtistTagsState>()((set, get) => ({
  sidebarArtistTags: [],

  addSidebarArtistTag: (name) =>
    set((state) => {
      if (state.sidebarArtistTags.some((t) => t.name === name)) return state;
      return { sidebarArtistTags: [...state.sidebarArtistTags, { name, strength: 1.0 }] };
    }),

  removeSidebarArtistTag: (name) =>
    set((state) => ({
      sidebarArtistTags: state.sidebarArtistTags.filter((t) => t.name !== name),
    })),

  updateSidebarArtistTagStrength: (name, strength) =>
    set((state) => ({
      sidebarArtistTags: state.sidebarArtistTags.map((t) =>
        t.name === name ? { ...t, strength } : t,
      ),
    })),

  saveSidebarArtistTags: (projectId) => {
    const { sidebarArtistTags } = get();
    ipc.setSetting(`sidebar_artist_tags_${projectId}`, JSON.stringify(sidebarArtistTags)).catch(() => {});
  },

  setSidebarArtistTags: (tags) => set({ sidebarArtistTags: tags }),

  loadSidebarArtistTags: async (projectId) => {
    try {
      const settings = await ipc.getSettings();
      const raw = settings[`sidebar_artist_tags_${projectId}`];
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          set({ sidebarArtistTags: parsed as ArtistTag[] });
        } else {
          set({ sidebarArtistTags: [] });
        }
      } else {
        set({ sidebarArtistTags: [] });
      }
    } catch {
      set({ sidebarArtistTags: [] });
    }
  },
}));
