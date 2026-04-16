import type { ArtistTag, AssetFolderDto, RandomPresetSettings, VibeDto } from "@/types";
import type { SidebarPreset, SelectedVibe } from "@/stores/generation-params-store";
import { MODEL_TO_VIBE_KEY } from "@/lib/constants";
import * as ipc from "@/lib/ipc";

/**
 * Expand a set of selected folder ids to include every descendant folder id
 * (any folder whose ancestor chain passes through a selected id).
 */
export function expandFolderDescendants(
  selected: number[],
  allFolders: AssetFolderDto[],
): Set<number> {
  const childrenByParent = new Map<number, number[]>();
  for (const f of allFolders) {
    if (f.parentId != null) {
      const arr = childrenByParent.get(f.parentId) ?? [];
      arr.push(f.id);
      childrenByParent.set(f.parentId, arr);
    }
  }
  const result = new Set<number>();
  const stack = [...selected];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (result.has(id)) continue;
    result.add(id);
    const children = childrenByParent.get(id);
    if (children) stack.push(...children);
  }
  return result;
}

/**
 * Apply the random-preset vibe filters (model compatibility, folder scope,
 * favorites) and return the pool from which a random preset should sample.
 */
export function filterVibePool(
  allVibes: VibeDto[],
  settings: RandomPresetSettings,
  currentModel: string,
  allFolders: AssetFolderDto[],
): VibeDto[] {
  const vibeKey = MODEL_TO_VIBE_KEY[currentModel];
  let pool = vibeKey ? allVibes.filter((v) => v.model === vibeKey) : allVibes;

  if (settings.folderIds.length > 0) {
    // `-1` is the sentinel for "unclassified" (vibes with folder_id = NULL),
    // matching the convention used by `count_vibes_per_folder` on the backend.
    const realIds = settings.folderIds.filter((id) => id >= 0);
    const includeUnclassified = settings.folderIds.includes(-1);
    const allowed = expandFolderDescendants(realIds, allFolders);
    pool = pool.filter((v) => {
      if (v.folderId == null) return includeUnclassified;
      return allowed.has(v.folderId);
    });
  }

  if (settings.favoritesOnly) {
    const favorites = pool.filter((v) => v.isFavorite);
    if (favorites.length > 0) {
      pool = favorites;
    }
    // If no favorites, fall back to the pre-favorites pool (caller may warn).
  }

  return pool;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function generateRandomPreset(
  settings: RandomPresetSettings,
  allVibes: VibeDto[],
  currentModel: string,
  allFolders: AssetFolderDto[] = [],
): Promise<SidebarPreset> {
  const compatibleVibes = filterVibePool(allVibes, settings, currentModel, allFolders);

  if (compatibleVibes.length === 0) {
    throw new Error("no_compatible_vibes");
  }

  // Determine vibe count
  const maxVibes = Math.min(4, compatibleVibes.length);
  const vibeCount = settings.vibeCount === "random" ? randomInt(1, maxVibes) : Math.min(settings.vibeCount, maxVibes);

  // Select random vibes
  const shuffled = shuffle(compatibleVibes);
  const selectedVibes: SelectedVibe[] = shuffled.slice(0, vibeCount).map((v) => ({
    vibeId: v.id,
    strength: randomFloat(settings.vibeStrengthMin, settings.vibeStrengthMax),
    enabled: true,
  }));

  // Determine artist tag count
  const artistTagCount = settings.artistTagCount === "random"
    ? randomInt(settings.artistTagCountMin, settings.artistTagCountMax)
    : settings.artistTagCount;

  // Get random artist tags from backend
  let artistTags: ArtistTag[] = [];
  if (artistTagCount > 0) {
    const tags = await ipc.getRandomArtistTags(artistTagCount);
    artistTags = tags.map((t) => ({
      name: t.name,
      strength:
        settings.artistTagStrength === "random"
          ? Math.round(randomFloat(settings.artistTagStrengthMin, settings.artistTagStrengthMax) * 2) / 2 // snap to 0.5
          : settings.artistTagStrength,
    }));
  }

  return {
    id: crypto.randomUUID(),
    enabled: true,
    artistTags,
    selectedVibes,
    isRandom: true,
    name: `Random #${Date.now().toString(36).slice(-4)}`,
  };
}
