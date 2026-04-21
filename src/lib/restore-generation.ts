import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import { useSidebarArtistTagsStore } from "@/stores/sidebar-artist-tags-store";
import type { NegativePresetId } from "@/lib/constants";

export type RestoreResult = "full" | "partial" | "none";

interface LegacySnapshotParams {
  width?: number;
  height?: number;
  steps?: number;
  scale?: number;
  cfg_rescale?: number;
  sampler?: string;
  noise_schedule?: string;
  model?: string;
  negative_prompt?: string | null;
}

/**
 * Restore generation UI state from a stored prompt snapshot.
 * Returns "full" when the snapshot carried a ui_snapshot (v1+ generations),
 * "partial" when only legacy fields could be restored,
 * "none" when the snapshot was unrecognizable.
 */
export function restoreFromSnapshot(
  snapshot: Record<string, unknown> | null | undefined,
): RestoreResult {
  if (!snapshot || typeof snapshot !== "object") return "none";

  const params = useGenerationParamsStore.getState();
  const legacy = snapshot as LegacySnapshotParams;

  // Legacy scalar params always come from the top-level snapshot fields.
  if (typeof legacy.width === "number") params.setParam("width", legacy.width);
  if (typeof legacy.height === "number") params.setParam("height", legacy.height);
  if (typeof legacy.steps === "number") params.setParam("steps", legacy.steps);
  if (typeof legacy.scale === "number") params.setParam("scale", legacy.scale);
  if (typeof legacy.cfg_rescale === "number") params.setParam("cfgRescale", legacy.cfg_rescale);
  if (typeof legacy.sampler === "string") params.setParam("sampler", legacy.sampler);
  if (typeof legacy.noise_schedule === "string") params.setParam("noiseSchedule", legacy.noise_schedule);
  if (typeof legacy.model === "string") params.setParam("model", legacy.model);
  if (typeof legacy.negative_prompt === "string") {
    params.setParam("negativePrompt", legacy.negative_prompt);
  }

  const ui = (snapshot as { ui_snapshot?: unknown }).ui_snapshot;
  if (!ui || typeof ui !== "object") return "partial";

  const u = ui as Record<string, unknown>;
  if (u.version !== 1) return "partial";

  if (typeof u.negativePrompt === "string") {
    params.setParam("negativePrompt", u.negativePrompt);
  }
  if (typeof u.negativePreset === "string") {
    params.setParam("negativePreset", u.negativePreset as NegativePresetId);
  }
  if (typeof u.qualityTagsEnabled === "boolean") {
    params.setParam("qualityTagsEnabled", u.qualityTagsEnabled);
  }
  if (typeof u.normalizeVibeStrength === "boolean") {
    params.setParam("normalizeVibeStrength", u.normalizeVibeStrength);
  }
  if (typeof u.normalizeArtistStrength === "boolean") {
    params.setParam("normalizeArtistStrength", u.normalizeArtistStrength);
  }
  if (Array.isArray(u.characters)) {
    params.setCharacters(u.characters as Parameters<typeof params.setCharacters>[0]);
  }
  if (Array.isArray(u.selectedVibes)) {
    params.setSelectedVibes(
      u.selectedVibes as Parameters<typeof params.setSelectedVibes>[0],
    );
  }
  if (Array.isArray(u.sidebarPresets)) {
    params.setSidebarPresets(
      u.sidebarPresets as Parameters<typeof params.setSidebarPresets>[0],
    );
  }
  if (Array.isArray(u.sidebarArtistTags)) {
    useSidebarArtistTagsStore.getState().setSidebarArtistTags(
      u.sidebarArtistTags as Parameters<
        ReturnType<typeof useSidebarArtistTagsStore.getState>["setSidebarArtistTags"]
      >[0],
    );
  }
  if (u.sidebarPromptTargets && typeof u.sidebarPromptTargets === "object") {
    useSidebarPromptStore.getState().setTargets(
      u.sidebarPromptTargets as Parameters<
        ReturnType<typeof useSidebarPromptStore.getState>["setTargets"]
      >[0],
    );
  }

  return "full";
}
