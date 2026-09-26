import { useEffect, useRef, useState } from "react";
import * as ipc from "@/lib/ipc";
import { loadDefaultGroupsForGenre } from "@/lib/default-groups";
import { useGenerationParamsStore, type Character } from "@/stores/generation-params-store";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import { groupDtoToSidebar, type SidebarPromptGroup, type TargetPromptState } from "@/stores/sidebar-prompt-utils";

const promptsKey = (projectId: string) => `sidebar_prompts_${projectId}`;
const charactersKey = (projectId: string) => `project_characters_${projectId}`;
const SAVE_DELAY_MS = 500;

type StoredGroup = SidebarPromptGroup & { tagsTruncated?: boolean };

/**
 * Tag-DB groups can hold thousands of tags; persist only the enabled ones and
 * re-fetch the full list on load (unless random mode draws from all tags —
 * then the pool itself matters and is kept).
 */
function compactTargets(targets: Record<string, TargetPromptState>): Record<string, TargetPromptState> {
  const out: Record<string, TargetPromptState> = {};
  for (const [id, t] of Object.entries(targets)) {
    out[id] = {
      ...t,
      groups: t.groups.map((g): StoredGroup => {
        if (!g.groupId.startsWith("tagdb-") || (g.randomMode && g.randomSource === "all")) return g;
        return { ...g, tags: g.tags.filter((tag) => tag.enabled), tagsTruncated: true };
      }),
    };
  }
  return out;
}

async function expandTargets(targets: Record<string, TargetPromptState>): Promise<Record<string, TargetPromptState>> {
  const out: Record<string, TargetPromptState> = {};
  for (const [id, t] of Object.entries(targets)) {
    const groups = await Promise.all(
      (t.groups as StoredGroup[]).map(async ({ tagsTruncated, ...g }) => {
        if (!tagsTruncated) return g;
        try {
          const full = groupDtoToSidebar(await ipc.hydratePromptGroupById(g.groupId));
          const saved = new Map(g.tags.map((tag) => [tag.tagId, tag]));
          return { ...g, tags: full.tags.map((tag) => saved.get(tag.tagId) ?? tag) };
        } catch {
          return g; // tag group gone: keep what was saved
        }
      }),
    );
    out[id] = { ...t, groups };
  }
  return out;
}

function parse<T>(raw: string | undefined): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

/**
 * Per-project persistence of the prompt inputs (main + characters) and the
 * character list they belong to. Like the style persistence, saving waits
 * until this project's data has been loaded so nothing stale overwrites it.
 */
export function useProjectPromptPersistence(projectId: string | null) {
  const targets = useSidebarPromptStore((s) => s.targets);
  const characters = useGenerationParamsStore((s) => s.characters);
  const [loadedProjectId, setLoadedProjectId] = useState<string | null>(null);
  const pendingSave = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      const settings = await ipc.getSettings().catch(() => ({} as Record<string, string>));
      const savedTargets = parse<Record<string, TargetPromptState>>(settings[promptsKey(projectId)]);
      const savedChars = parse<Character[]>(settings[charactersKey(projectId)]);
      const expanded = savedTargets ? await expandTargets(savedTargets) : {};
      if (cancelled) return;

      useGenerationParamsStore.getState().setCharacters(Array.isArray(savedChars) ? savedChars : []);
      const prompt = useSidebarPromptStore.getState();
      prompt.setTargets(expanded);
      for (const c of savedChars ?? []) prompt.initTarget(c.id);
      if (!expanded.main) {
        const defaults = await loadDefaultGroupsForGenre("genre-main").catch(() => []);
        if (cancelled) return;
        useSidebarPromptStore.getState().initTarget("main", defaults);
      }
      setLoadedProjectId(projectId);
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  const canSave = projectId != null && loadedProjectId === projectId;

  useEffect(() => {
    if (!canSave) return;
    const save = () => {
      ipc.setSetting(promptsKey(projectId), JSON.stringify(compactTargets(targets))).catch(() => {});
      ipc.setSetting(charactersKey(projectId), JSON.stringify(characters)).catch(() => {});
    };
    pendingSave.current = save;
    const timer = setTimeout(() => { pendingSave.current = null; save(); }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [targets, characters, canSave, projectId]);

  // Leaving the project within the debounce window must not lose the last edit.
  useEffect(() => () => { pendingSave.current?.(); pendingSave.current = null; }, []);
}
