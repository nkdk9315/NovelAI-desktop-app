import { create } from "zustand";
import type { NaxCategory, NaxFavoriteTagDto, NaxGalleryDto, NaxImageDto, NaxStatusDto } from "@/types";
import * as naxIpc from "@/lib/ipc-nax";
import { naxTagKey } from "@/lib/nax";
import { useSidebarArtistTagsStore } from "@/stores/sidebar-artist-tags-store";

/** Tab of the explorer: a gallery category, or the favorites list. */
export type NaxTab = NaxCategory | "favorites";

interface NaxState {
  open: boolean;
  /** Opens where the user left off (see `useNaxViewStore`). */
  openExplorer: () => void;
  closeExplorer: () => void;

  status: NaxStatusDto | null;
  galleries: NaxGalleryDto[];
  syncing: boolean;
  /** Last sync failure; the cached catalog stays usable. */
  syncError: string | null;
  /** Sync if stale (or `force`), then reload galleries. */
  ensureSynced: (force?: boolean) => Promise<void>;

  /** Favorited non-artist tags; artists use the sidebar's favorite list. */
  favoriteTags: NaxFavoriteTagDto[];
  loadFavoriteTags: () => Promise<void>;
  toggleFavorite: (tag: string, category: NaxCategory) => Promise<void>;

  /** Images by tag key, across galleries. Filled on demand by `lookupTags`. */
  imagesByTag: Record<string, NaxImageDto[]>;
  lookupTags: (tags: string[]) => Promise<void>;
}

export const useNaxStore = create<NaxState>()((set, get) => ({
  open: false,
  openExplorer: () => set({ open: true }),
  closeExplorer: () => set({ open: false }),

  status: null,
  galleries: [],
  syncing: false,
  syncError: null,

  ensureSynced: async (force = false) => {
    if (get().syncing) return;
    set({ syncing: true, syncError: null });
    try {
      const status = await naxIpc.naxSync(force);
      // A new catalog may add tags that earlier lookups found missing.
      set({ status, imagesByTag: {} });
    } catch (e) {
      set({ syncError: String(e) });
      try { set({ status: await naxIpc.naxGetStatus() }); } catch { /* keep previous */ }
    }
    try { set({ galleries: await naxIpc.naxListGalleries() }); } catch { /* keep previous */ }
    set({ syncing: false });
  },

  favoriteTags: [],
  loadFavoriteTags: async () => {
    try { set({ favoriteTags: await naxIpc.naxListFavoriteTags() }); } catch { /* keep previous */ }
  },

  toggleFavorite: async (tag, category) => {
    if (category === "artist") {
      const artists = useSidebarArtistTagsStore.getState();
      const key = naxTagKey(tag);
      // The list may hold another spelling ("ei_(eiei_e1)"); remove that one.
      const existing = artists.favoriteArtists.filter((n) => naxTagKey(n) === key);
      if (existing.length > 0) existing.forEach((n) => useSidebarArtistTagsStore.getState().toggleFavoriteArtist(n));
      else artists.toggleFavoriteArtist(tag);
      return;
    }
    await naxIpc.naxToggleFavoriteTag(tag, category);
    await get().loadFavoriteTags();
  },

  imagesByTag: {},
  lookupTags: async (tags) => {
    const known = get().imagesByTag;
    const missing = [...new Set(tags.map(naxTagKey))].filter((k) => k && !(k in known));
    if (missing.length === 0) return;
    const images = await naxIpc.naxFindTags(missing);
    const found: Record<string, NaxImageDto[]> = Object.fromEntries(missing.map((k) => [k, []]));
    for (const img of images) (found[naxTagKey(img.tag)] ??= []).push(img);
    set((s) => ({ imagesByTag: { ...s.imagesByTag, ...found } }));
  },
}));
