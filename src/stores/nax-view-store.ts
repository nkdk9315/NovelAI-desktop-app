import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { NaxCategory } from "@/types";
import type { NaxTab } from "@/stores/nax-store";

export type NaxSort = "score" | "recent" | "name" | "random";

/** Favorites filter: one category/version, or everything. */
export type NaxFavoriteFilter<T> = T | "all";

/** Remembered scroll positions, most recent last; old views are dropped. */
const MAX_SCROLL_ENTRIES = 30;

/** What one tab (genre or favorites) shows; each tab keeps its own. */
export interface NaxTabView {
  /** Version picked for galleries; null = follow the generation model. */
  version: string | null;
  /** Model version when `version` was picked; a model change resets the pick. */
  versionPickedFor: string | null;
  /** Explicit gallery variant (e.g. "Constrained Prompt"); null = default. */
  pickedSlug: string | null;
  search: string;
  sort: NaxSort;
  /** Random-order seed; set whenever "random" is chosen or reshuffled. */
  seed: number;
}

export const DEFAULT_TAB_VIEW: NaxTabView = Object.freeze({
  version: null,
  versionPickedFor: null,
  pickedSlug: null,
  search: "",
  sort: "score",
  seed: 0,
});

interface NaxViewState {
  tab: NaxTab;
  tabs: Partial<Record<NaxTab, NaxTabView>>;
  favCategory: NaxFavoriteFilter<NaxCategory>;
  favVersion: NaxFavoriteFilter<string>;
  /** Scroll offset per view key (tab + gallery + order). */
  scroll: Record<string, number>;

  setTab: (tab: NaxTab) => void;
  pickVersion: (version: string, modelVersion: string | null) => void;
  /** Forget version picks made for another model, in every tab. */
  syncModelVersion: (modelVersion: string | null) => void;
  setPickedSlug: (slug: string | null) => void;
  setSearch: (search: string) => void;
  setSort: (sort: NaxSort) => void;
  reshuffle: () => void;
  setFavCategory: (c: NaxFavoriteFilter<NaxCategory>) => void;
  setFavVersion: (v: NaxFavoriteFilter<string>) => void;
  saveScroll: (key: string, top: number) => void;
}

export function tabViewOf(state: Pick<NaxViewState, "tabs">, tab: NaxTab): NaxTabView {
  return state.tabs[tab] ?? DEFAULT_TAB_VIEW;
}

/**
 * What the tag explorer was showing, per tab and persisted, so switching
 * genres and back — or reopening it after a restart — continues where the
 * user left off.
 */
export const useNaxViewStore = create<NaxViewState>()(
  persist(
    (set) => {
      /** Patch the current tab's view. */
      const patchTab = (patch: (view: NaxTabView) => Partial<NaxTabView>) =>
        set((s) => {
          const view = tabViewOf(s, s.tab);
          return { tabs: { ...s.tabs, [s.tab]: { ...view, ...patch(view) } } };
        });

      return {
        tab: "artist",
        tabs: {},
        favCategory: "all",
        favVersion: "all",
        scroll: {},

        setTab: (tab) => set({ tab }),
        pickVersion: (version, modelVersion) =>
          patchTab(() => ({ version, versionPickedFor: modelVersion, pickedSlug: null })),
        syncModelVersion: (modelVersion) =>
          set((s) => {
            let changed = false;
            const tabs = { ...s.tabs };
            for (const [tab, view] of Object.entries(tabs) as [NaxTab, NaxTabView][]) {
              if (view.version !== null && view.versionPickedFor !== modelVersion) {
                tabs[tab] = { ...view, version: null, versionPickedFor: null, pickedSlug: null };
                changed = true;
              }
            }
            return changed ? { tabs } : {};
          }),
        setPickedSlug: (pickedSlug) => patchTab(() => ({ pickedSlug })),
        setSearch: (search) => patchTab(() => ({ search })),
        // Choosing "random" deals a fresh order; other sorts keep the seed.
        setSort: (sort) => patchTab((v) => ({ sort, seed: sort === "random" && v.sort !== "random" ? Date.now() : v.seed })),
        reshuffle: () => patchTab(() => ({ seed: Date.now() })),
        setFavCategory: (favCategory) => set({ favCategory }),
        setFavVersion: (favVersion) => set({ favVersion }),
        saveScroll: (key, top) =>
          set((s) => {
            const rest = Object.entries(s.scroll).filter(([k]) => k !== key);
            const kept = rest.slice(Math.max(0, rest.length - (MAX_SCROLL_ENTRIES - 1)));
            return { scroll: Object.fromEntries([...kept, [key, Math.round(top)]]) };
          }),
      };
    },
    {
      name: "nax-explorer-view",
      version: 1,
      // v0 kept one view for all tabs: it becomes the view of the tab it was on.
      migrate: (persisted, version) => {
        const old = persisted as Record<string, unknown>;
        if (version >= 1 || !old) return old as unknown as NaxViewState;
        const tab = (old.tab as NaxTab | undefined) ?? "artist";
        const view: NaxTabView = {
          version: (old.version as string | null) ?? null,
          versionPickedFor: (old.versionPickedFor as string | null) ?? null,
          pickedSlug: (old.pickedSlug as string | null) ?? null,
          search: (old.search as string | undefined) ?? "",
          sort: (old.sort as NaxSort | undefined) ?? "score",
          seed: (old.seed as number | undefined) ?? 0,
        };
        return {
          tab,
          tabs: { [tab]: view },
          favCategory: old.favCategory ?? "all",
          favVersion: old.favVersion ?? "all",
          scroll: (old.scroll as Record<string, number> | undefined) ?? {},
        } as unknown as NaxViewState;
      },
    },
  ),
);
