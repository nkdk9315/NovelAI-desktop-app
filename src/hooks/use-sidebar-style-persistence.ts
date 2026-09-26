import { useEffect, useState } from "react";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { useSidebarArtistTagsStore } from "@/stores/sidebar-artist-tags-store";
import { loadProjectPresets, saveProjectPresets, usePresetStashStore } from "@/stores/sidebar-preset-model-stash";
import type { ProjectDto } from "@/types";

/**
 * Load the project's sidebar presets / artist tags, then auto-save changes.
 *
 * Saving is held back until the load for *this* project has finished.
 * Otherwise the save effect fires on mount with whatever is still in memory
 * (empty on first open, or the previous project's data) and overwrites the
 * stored settings before they are read back.
 */
export function useSidebarStylePersistence(currentProject: ProjectDto | null) {
  const sidebarPresets = useGenerationParamsStore((s) => s.sidebarPresets);
  const model = useGenerationParamsStore((s) => s.model);
  const presetStash = usePresetStashStore((s) => s.byModel);
  const sidebarArtistTags = useSidebarArtistTagsStore((s) => s.sidebarArtistTags);
  const saveSidebarArtistTags = useSidebarArtistTagsStore((s) => s.saveSidebarArtistTags);
  const loadSidebarArtistTags = useSidebarArtistTagsStore((s) => s.loadSidebarArtistTags);
  const [loadedProjectId, setLoadedProjectId] = useState<string | null>(null);

  const projectId = currentProject?.id ?? null;
  const canSave = projectId != null && loadedProjectId === projectId;

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    Promise.all([loadProjectPresets(projectId), loadSidebarArtistTags(projectId)])
      .finally(() => { if (!cancelled) setLoadedProjectId(projectId); });
    return () => { cancelled = true; };
  }, [projectId, loadSidebarArtistTags]);

  // Presets are stored per model, so a model switch (which swaps the lists) is saved too.
  useEffect(() => {
    if (canSave) saveProjectPresets(projectId);
  }, [sidebarPresets, model, presetStash, canSave, projectId]);

  useEffect(() => {
    if (canSave) saveSidebarArtistTags(projectId);
  }, [sidebarArtistTags, canSave, projectId, saveSidebarArtistTags]);
}
