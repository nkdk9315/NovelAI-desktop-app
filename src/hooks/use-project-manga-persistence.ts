import { useEffect, useRef, useState } from "react";
import * as ipc from "@/lib/ipc";
import { isMangaPage, newMangaPage } from "@/lib/manga-page";
import { useMangaStore } from "@/stores/manga-store";

const pageKey = (projectId: string) => `manga_page_${projectId}`;
const SAVE_DELAY_MS = 500;

/**
 * Per-project persistence of the manga page. A project created as "manga"
 * starts in manga mode; saving waits until the project's page is loaded.
 */
export function useProjectMangaPersistence(projectId: string | null, projectType: string | null) {
  const page = useMangaStore((s) => s.page);
  const [loadedProjectId, setLoadedProjectId] = useState<string | null>(null);
  const pendingSave = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      const settings = await ipc.getSettings().catch(() => ({} as Record<string, string>));
      if (cancelled) return;
      let saved: unknown = null;
      try { saved = JSON.parse(settings[pageKey(projectId)] ?? "null"); } catch { saved = null; }
      useMangaStore.getState().setPage(isMangaPage(saved) ? saved : newMangaPage(projectType === "manga"));
      setLoadedProjectId(projectId);
    })();
    return () => { cancelled = true; };
  }, [projectId, projectType]);

  const canSave = projectId != null && loadedProjectId === projectId;

  useEffect(() => {
    if (!canSave) return;
    const save = () => { ipc.setSetting(pageKey(projectId), JSON.stringify(page)).catch(() => {}); };
    pendingSave.current = save;
    const timer = setTimeout(() => { pendingSave.current = null; save(); }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [page, canSave, projectId]);

  // Leaving the project within the debounce window must not lose the last edit.
  useEffect(() => () => { pendingSave.current?.(); pendingSave.current = null; }, []);
}
