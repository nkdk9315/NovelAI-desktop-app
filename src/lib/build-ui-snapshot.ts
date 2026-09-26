import type { ArtistTag, UiSnapshotV1 } from "@/types";
import type { Character, SelectedVibe, SidebarPreset } from "@/stores/generation-params-store";
import type { NegativePresetId } from "@/lib/constants";
import type { QualityPresetId } from "@/lib/prompt-decoration";

interface SnapshotSource {
  negativePrompt: string;
  negativePreset: NegativePresetId;
  qualityPreset: QualityPresetId;
  furryMode: boolean;
  transparentBackground: boolean;
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
    // Kept for snapshots read by older builds
    qualityTagsEnabled: src.qualityPreset !== "none",
    qualityPreset: src.qualityPreset,
    furryMode: src.furryMode,
    transparentBackground: src.transparentBackground,
    normalizeVibeStrength: src.normalizeVibeStrength,
    normalizeArtistStrength: src.normalizeArtistStrength,
    characters: src.characters,
    selectedVibes: src.selectedVibes,
    sidebarPresets: src.sidebarPresets,
    sidebarArtistTags,
    sidebarPromptTargets,
  };
}
