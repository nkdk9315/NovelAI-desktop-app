import type { ArtistTag, UiSnapshotV1 } from "@/types";
import type { Character, SelectedVibe, SidebarPreset } from "@/stores/generation-params-store";
import type { NegativePresetId } from "@/lib/constants";

interface SnapshotSource {
  negativePrompt: string;
  negativePreset: NegativePresetId;
  qualityTagsEnabled: boolean;
  normalizeVibeStrength: boolean;
  normalizeArtistStrength: boolean;
  characters: Character[];
  selectedVibes: SelectedVibe[];
  sidebarPresets: SidebarPreset[];
}

export function buildUiSnapshot(
  src: SnapshotSource,
  sidebarArtistTags: ArtistTag[],
  sidebarPromptTargets: Record<string, unknown>,
): UiSnapshotV1 {
  return {
    version: 1,
    negativePrompt: src.negativePrompt,
    negativePreset: src.negativePreset,
    qualityTagsEnabled: src.qualityTagsEnabled,
    normalizeVibeStrength: src.normalizeVibeStrength,
    normalizeArtistStrength: src.normalizeArtistStrength,
    characters: src.characters,
    selectedVibes: src.selectedVibes,
    sidebarPresets: src.sidebarPresets,
    sidebarArtistTags,
    sidebarPromptTargets,
  };
}
