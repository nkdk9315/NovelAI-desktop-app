import { create } from "zustand";
import { fitPanels, newCast, newMangaPage, type MangaCast, type MangaColorMode, type MangaPage, type MangaPanel } from "@/lib/manga-page";
import type { MangaLayoutId } from "@/lib/manga-layouts";

/** Manga mode page of the open project (persisted by `useProjectMangaPersistence`). */
interface MangaState {
  page: MangaPage;
  setPage: (page: MangaPage) => void;
  setEnabled: (enabled: boolean) => void;
  setLayout: (layoutId: MangaLayoutId) => void;
  setColorMode: (colorMode: MangaColorMode) => void;
  updatePanel: (panelId: string, updater: (panel: MangaPanel) => MangaPanel) => void;
  addCast: (panelId: string, characterId: string) => void;
  updateCast: (panelId: string, castId: string, updater: (cast: MangaCast) => MangaCast) => void;
  removeCast: (panelId: string, castId: string) => void;
}

export const useMangaStore = create<MangaState>()((set) => {
  const updatePage = (fn: (page: MangaPage) => MangaPage) => set((s) => ({ page: fn(s.page) }));
  const updatePanel = (panelId: string, updater: (panel: MangaPanel) => MangaPanel) =>
    updatePage((page) => ({ ...page, panels: page.panels.map((p) => (p.id === panelId ? updater(p) : p)) }));

  return {
    page: newMangaPage(),
    setPage: (page) => set({ page: { ...page, panels: fitPanels(page.panels, page.layoutId) } }),
    setEnabled: (enabled) => updatePage((page) => ({ ...page, enabled })),
    setLayout: (layoutId) => updatePage((page) => ({ ...page, layoutId, panels: fitPanels(page.panels, layoutId) })),
    setColorMode: (colorMode) => updatePage((page) => ({ ...page, colorMode })),
    updatePanel,
    addCast: (panelId, characterId) => updatePanel(panelId, (p) => ({ ...p, cast: [...p.cast, newCast(characterId)] })),
    updateCast: (panelId, castId, updater) =>
      updatePanel(panelId, (p) => ({ ...p, cast: p.cast.map((c) => (c.id === castId ? updater(c) : c)) })),
    removeCast: (panelId, castId) => updatePanel(panelId, (p) => ({ ...p, cast: p.cast.filter((c) => c.id !== castId) })),
  };
});
