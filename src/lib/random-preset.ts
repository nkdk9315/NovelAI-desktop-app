import type { ArtistTag, RandomPresetSettings, VibeDto } from "@/types";
import type { SidebarPreset, SelectedVibe } from "@/stores/generation-params-store";
import { MODEL_TO_VIBE_KEY } from "@/lib/constants";
import * as ipc from "@/lib/ipc";

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
): Promise<SidebarPreset> {
  const vibeKey = MODEL_TO_VIBE_KEY[currentModel];
  let compatibleVibes = vibeKey
    ? allVibes.filter((v) => v.model === vibeKey)
    : allVibes;

  if (settings.favoritesOnly) {
    const favorites = compatibleVibes.filter((v) => v.isFavorite);
    if (favorites.length > 0) {
      compatibleVibes = favorites;
    }
    // If no favorites, fall back to all compatible vibes (caller shows warning)
  }

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
