import { beforeEach, describe, expect, it, vi } from "vitest";

// The store persists to localStorage at creation; give it a working one
// (Node's own experimental global can shadow jsdom's with an unusable stub).
vi.hoisted(() => {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => { data.set(k, v); },
      removeItem: (k: string) => { data.delete(k); },
    },
  });
});

import { tabViewOf, useNaxViewStore } from "@/stores/nax-view-store";

const initial = useNaxViewStore.getState();
const current = () => tabViewOf(useNaxViewStore.getState(), useNaxViewStore.getState().tab);

describe("nax-view-store", () => {
  beforeEach(() => useNaxViewStore.setState(initial, true));

  it("keeps each tab's view when switching tabs and back", () => {
    const s = useNaxViewStore.getState();
    s.setTab("artist");
    s.setPickedSlug("danbooru-artist-tags-v5");
    s.setSearch("wagashi");
    s.setSort("random");
    const artistSeed = current().seed;
    s.setTab("hair");
    expect(current()).toMatchObject({ pickedSlug: null, search: "", sort: "score" });
    s.setSort("name");
    s.setTab("artist");
    expect(current()).toMatchObject({ pickedSlug: "danbooru-artist-tags-v5", search: "wagashi", sort: "random", seed: artistSeed });
    s.setTab("hair");
    expect(current().sort).toBe("name");
  });

  it("deals a new random order only when switching to random or reshuffling", () => {
    const s = useNaxViewStore.getState();
    expect(current().seed).toBe(0);
    s.setSort("random");
    const seed = current().seed;
    expect(seed).toBeGreaterThan(0);
    s.setSort("random");
    expect(current().seed).toBe(seed);
  });

  it("keeps a version pick while the model stays the same", () => {
    const s = useNaxViewStore.getState();
    s.pickVersion("v4", "v4.5");
    s.syncModelVersion("v4.5");
    expect(current().version).toBe("v4");
  });

  it("drops picks (and variants) in every tab when the model changes", () => {
    const s = useNaxViewStore.getState();
    s.setTab("artist");
    s.pickVersion("v4", "v4.5");
    s.setPickedSlug("danbooru-artist-tags-v4");
    s.setTab("hair");
    s.pickVersion("v5", "v4.5");
    s.syncModelVersion("v5");
    const st = useNaxViewStore.getState();
    expect(tabViewOf(st, "artist")).toMatchObject({ version: null, pickedSlug: null });
    expect(tabViewOf(st, "hair").version).toBeNull();
  });

  it("remembers scroll per view, keeping only the most recent views", () => {
    const s = useNaxViewStore.getState();
    for (let i = 0; i < 40; i++) s.saveScroll(`view${i}`, i * 10);
    s.saveScroll("view5", 999);
    const scroll = useNaxViewStore.getState().scroll;
    expect(Object.keys(scroll)).toHaveLength(30);
    expect(scroll.view5).toBe(999);
    expect(scroll.view0).toBeUndefined();
    expect(scroll.view39).toBe(390);
  });

  it("migrates the old single-view state into the tab it was on", async () => {
    localStorage.setItem("nax-explorer-view", JSON.stringify({
      version: 0,
      state: { tab: "hair", version: "v4.5", versionPickedFor: "v5", pickedSlug: null, search: "bun", sort: "name", seed: 7, favCategory: "face", favVersion: "all", scroll: { k: 5 } },
    }));
    await useNaxViewStore.persist.rehydrate();
    const st = useNaxViewStore.getState();
    expect(st.tab).toBe("hair");
    expect(tabViewOf(st, "hair")).toMatchObject({ version: "v4.5", search: "bun", sort: "name", seed: 7 });
    expect(st.favCategory).toBe("face");
    expect(st.scroll).toEqual({ k: 5 });
  });
});
