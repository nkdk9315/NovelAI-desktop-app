import { create } from "zustand";
import type { ArtistTag } from "@/types";
import * as ipc from "@/lib/ipc";
import { balanceStrengths, isArtistTagOn } from "@/lib/artist-tag";

interface SidebarArtistTagsState {
  sidebarArtistTags: ArtistTag[];
  addSidebarArtistTag: (name: string) => void;
  removeSidebarArtistTag: (name: string) => void;
  updateSidebarArtistTagStrength: (name: string, strength: number) => void;
  balanceSidebarArtistTags: () => void;
  toggleSidebarArtistTag: (name: string) => void;
  /** Turn every direct artist tag off (used when a style preset is added). */
  disableAllSidebarArtistTags: () => void;
  saveSidebarArtistTags: (projectId: string) => void;
  loadSidebarArtistTags: (projectId: string) => Promise<void>;
  setSidebarArtistTags: (tags: ArtistTag[]) => void;
  /** Favorite artist names, shared across projects. */
  favoriteArtists: string[];
  loadFavoriteArtists: () => Promise<void>;
  toggleFavoriteArtist: (name: string) => void;
}

const FAVORITES_KEY = "artist_favorites";

export const useSidebarArtistTagsStore = create<SidebarArtistTagsState>()((set, get) => ({
  sidebarArtistTags: [],

  addSidebarArtistTag: (name) =>
    set((state) => {
      // Re-adding an existing (possibly switched-off) tag turns it back on.
      if (state.sidebarArtistTags.some((t) => t.name === name)) {
        return { sidebarArtistTags: state.sidebarArtistTags.map((t) => (t.name === name ? { ...t, enabled: true } : t)) };
      }
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

  // Only enabled tags take part; disabled ones keep their values.
  balanceSidebarArtistTags: () =>
    set((state) => {
      const on = state.sidebarArtistTags.filter(isArtistTagOn);
      const balanced = balanceStrengths(on.map((t) => t.strength));
      const byName = new Map(on.map((t, i) => [t.name, balanced[i]]));
      return {
        sidebarArtistTags: state.sidebarArtistTags.map((t) =>
          byName.has(t.name) ? { ...t, strength: byName.get(t.name)! } : t,
        ),
      };
    }),

  toggleSidebarArtistTag: (name) =>
    set((state) => ({
      sidebarArtistTags: state.sidebarArtistTags.map((t) =>
        t.name === name ? { ...t, enabled: !isArtistTagOn(t) } : t,
      ),
    })),

  disableAllSidebarArtistTags: () =>
    set((state) => ({
      sidebarArtistTags: state.sidebarArtistTags.map((t) => ({ ...t, enabled: false })),
    })),

  saveSidebarArtistTags: (projectId) => {
    const { sidebarArtistTags } = get();
    ipc.setSetting(`sidebar_artist_tags_${projectId}`, JSON.stringify(sidebarArtistTags)).catch(() => {});
  },

  setSidebarArtistTags: (tags) => set({ sidebarArtistTags: tags }),

  favoriteArtists: [],

  loadFavoriteArtists: async () => {
    try {
      const raw = (await ipc.getSettings())[FAVORITES_KEY];
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      set({ favoriteArtists: Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [] });
    } catch {
      set({ favoriteArtists: [] });
    }
  },

  toggleFavoriteArtist: (name) => {
    const current = get().favoriteArtists;
    const next = current.includes(name) ? current.filter((n) => n !== name) : [...current, name];
    set({ favoriteArtists: next });
    ipc.setSetting(FAVORITES_KEY, JSON.stringify(next)).catch(() => {});
  },

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
