import { create } from "zustand";
import {
  castTargetId, fitPanels, newCast, newMangaPage, panelTargetIds, withCustomLayout,
  type MangaCast, type MangaColorMode, type MangaPage, type MangaPanel,
} from "@/lib/manga-page";
import type { MangaLayoutId, PageAspectId } from "@/lib/manga-layouts";
import type { Shape } from "@/lib/manga-geometry";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";

/** Manga mode page of the open project (persisted by `useProjectMangaPersistence`). */
interface MangaState {
  page: MangaPage;
  setPage: (page: MangaPage) => void;
  setEnabled: (enabled: boolean) => void;
  setLayout: (layoutId: MangaLayoutId) => void;
  /** Use the user's own panel shapes (from the layout editor or a saved template) */
  setCustomLayout: (shapes: readonly Shape[], aspect: PageAspectId) => void;
  setColorMode: (colorMode: MangaColorMode) => void;
  updatePanel: (panelId: string, updater: (panel: MangaPanel) => MangaPanel) => void;
  addCast: (panelId: string, characterId: string) => void;
  updateCast: (panelId: string, castId: string, updater: (cast: MangaCast) => MangaCast) => void;
  removeCast: (panelId: string, castId: string) => void;
}

/** Drop the prompt targets (scene / appearances) of panels that no longer exist. */
function releaseTargets(before: readonly MangaPanel[], after: readonly MangaPanel[]) {
  const keep = new Set(panelTargetIds(after));
  const prompt = useSidebarPromptStore.getState();
  for (const id of panelTargetIds(before)) if (!keep.has(id)) prompt.removeTarget(id);
}

export const useMangaStore = create<MangaState>()((set, get) => {
  const updatePage = (fn: (page: MangaPage) => MangaPage) => {
    const before = get().page;
    const after = fn(before);
    set({ page: after });
    releaseTargets(before.panels, after.panels);
  };
  const updatePanel = (panelId: string, updater: (panel: MangaPanel) => MangaPanel) =>
    set((s) => ({ page: { ...s.page, panels: s.page.panels.map((p) => (p.id === panelId ? updater(p) : p)) } }));

  return {
    page: newMangaPage(),
    // Loading a project / restoring history: its prompt targets come with it, nothing to release
    setPage: (page) => set({
      page: { ...page, panels: page.layoutId === "custom" ? page.panels : fitPanels(page.panels, page.layoutId) },
    }),
    setEnabled: (enabled) => set((s) => ({ page: { ...s.page, enabled } })),
    setLayout: (layoutId) => updatePage((page) => ({ ...page, layoutId, aspect: undefined, panels: fitPanels(page.panels, layoutId) })),
    setCustomLayout: (shapes, aspect) => updatePage((page) => withCustomLayout(page, shapes, aspect)),
    setColorMode: (colorMode) => set((s) => ({ page: { ...s.page, colorMode } })),
    updatePanel,
    addCast: (panelId, characterId) => updatePanel(panelId, (p) => ({ ...p, cast: [...p.cast, newCast(characterId)] })),
    updateCast: (panelId, castId, updater) =>
      updatePanel(panelId, (p) => ({ ...p, cast: p.cast.map((c) => (c.id === castId ? updater(c) : c)) })),
    removeCast: (panelId, castId) => {
      updatePanel(panelId, (p) => ({ ...p, cast: p.cast.filter((c) => c.id !== castId) }));
      useSidebarPromptStore.getState().removeTarget(castTargetId(castId));
    },
  };
});
