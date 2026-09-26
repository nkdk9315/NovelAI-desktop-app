import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { useSidebarArtistTagsStore } from "@/stores/sidebar-artist-tags-store";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import { useSidebarPresetGroupStore } from "@/stores/sidebar-preset-group-store";
import { usePresetStore } from "@/stores/preset-store";
import { useImageEditStore, activeEditMode } from "@/stores/image-edit-store";
import { useCharRefStore } from "@/stores/char-ref-store";
import {
  MAX_TOTAL_VIBES, NEGATIVE_PRESETS, QUALITY_TAGS, isV5Model, supportsCharacterReference,
} from "@/lib/constants";
import { normalizeStrengths } from "@/lib/normalize-strength";
import { buildArtistPrefix, isArtistTagOn } from "@/lib/artist-tag";
import { rollTargetForGeneration } from "@/lib/prompt-roll";
import { appendContributions, getPresetContributionsForCharacter } from "@/lib/preset-contributions";
import { buildUiSnapshot } from "@/lib/build-ui-snapshot";
import { stripDataUrl } from "@/lib/canvas-image";
import type { SelectedVibe } from "@/stores/generation-params-store";
import type { CharacterReferenceRequest, GenerateActionRequest, GenerateImageRequest } from "@/types";

type ParamsState = ReturnType<typeof useGenerationParamsStore.getState>;

/** Enabled vibes from presets (first wins) and the vibe section, deduplicated by id. */
export function collectActiveVibes(params: ParamsState): SelectedVibe[] {
  if (isV5Model(params.model)) return [];
  const activePresets = params.sidebarPresets.filter((p) => p.enabled);
  const all = [
    ...activePresets.flatMap((p) => p.selectedVibes.filter((v) => v.enabled)),
    ...params.selectedVibes.filter((v) => v.enabled),
  ];
  const seen = new Set<string>();
  return all.filter((v) => (seen.has(v.vibeId) ? false : (seen.add(v.vibeId), true)));
}

/** Character reference to send, or undefined when unused / unsupported by the model. */
export function currentCharacterReference(model: string): CharacterReferenceRequest | undefined {
  const c = useCharRefStore.getState();
  if (!c.image || !c.enabled || !supportsCharacterReference(model)) return undefined;
  return { imageBase64: stripDataUrl(c.image.src), strength: c.strength, fidelity: c.fidelity, mode: c.mode };
}

export interface EditPlan {
  action: GenerateActionRequest;
  width: number;
  height: number;
  mode: "img2img" | "inpaint";
  strength: number;
}

/** Action built from the current base image, or null for text-to-image. */
export function currentEditPlan(): EditPlan | { error: "inpaintNeedsMask" } | null {
  const e = useImageEditStore.getState();
  const mode = activeEditMode(e);
  if (!mode || !e.base) return null;
  const source = e.compositeBase64 ?? stripDataUrl(e.base.src);
  const size = { width: e.targetWidth, height: e.targetHeight };
  if (mode === "img2img") {
    return {
      ...size, mode, strength: e.img2imgStrength,
      action: { type: "img2Img", sourceImageBase64: source, strength: e.img2imgStrength, noise: e.img2imgNoise },
    };
  }
  if (!e.maskBase64) return { error: "inpaintNeedsMask" };
  return {
    ...size, mode, strength: e.inpaintStrength,
    action: {
      type: "infill", sourceImageBase64: source, maskBase64: e.maskBase64,
      maskStrength: e.inpaintStrength, colorCorrect: e.colorCorrect,
    },
  };
}

export interface RequestOverrides {
  action?: GenerateActionRequest;
  width?: number;
  height?: number;
}

export type BuildResult =
  | { ok: true; req: GenerateImageRequest }
  | { ok: false; errorKey: string; errorArgs?: Record<string, unknown> };

/** Assemble the generate request from the sidebar / header state. */
export function buildGenerateRequest(projectId: string, overrides: RequestOverrides = {}): BuildResult {
  const params = useGenerationParamsStore.getState();
  const sidebarArtistTags = useSidebarArtistTagsStore.getState().sidebarArtistTags;
  const isV5 = isV5Model(params.model);
  const activePresets = params.sidebarPresets.filter((p) => p.enabled);
  const characterReference = currentCharacterReference(params.model);

  // Vibe Transfer and Character Reference are mutually exclusive: the reference wins
  const allVibes = characterReference ? [] : collectActiveVibes(params);
  if (allVibes.length > MAX_TOTAL_VIBES) {
    return { ok: false, errorKey: "generation.tooManyVibes", errorArgs: { max: MAX_TOTAL_VIBES, count: allVibes.length } };
  }

  const allArtistTags = [
    ...sidebarArtistTags.filter(isArtistTagOn),
    ...activePresets.flatMap((p) => p.artistTags),
  ];
  let finalArtistTags = allArtistTags;
  if (params.normalizeArtistStrength && allArtistTags.length > 0) {
    const normalized = normalizeStrengths(allArtistTags.map((t) => t.strength));
    finalArtistTags = allArtistTags.map((t, i) => ({ ...t, strength: normalized[i] }));
  }
  const artistPrefix = buildArtistPrefix(finalArtistTags);

  // Main prompt: artist prefix + main target (or assembled groups) + quality tags
  const sidebarState = useSidebarPromptStore.getState();
  const mainTarget = sidebarState.targets["main"];
  const presetInstances = useSidebarPresetGroupStore.getState().instances;
  const allPresets = usePresetStore.getState().presets;
  const mainContrib = getPresetContributionsForCharacter("main", presetInstances, allPresets);
  const mainRolled = mainTarget ? rollTargetForGeneration(mainTarget) : { positive: "", negative: "" };
  const assembledMain = appendContributions(mainRolled.positive, mainContrib.positive);
  const qualitySuffix = params.qualityTagsEnabled
    ? (assembledMain ? `, ${QUALITY_TAGS}` : QUALITY_TAGS)
    : "";
  const fullPrompt = artistPrefix + assembledMain + qualitySuffix;

  let enabledVibes = allVibes.map((v) => ({ vibeId: v.vibeId, strength: v.strength }));
  if (params.normalizeVibeStrength && enabledVibes.length > 0) {
    const normalized = normalizeStrengths(enabledVibes.map((v) => v.strength));
    enabledVibes = enabledVibes.map((v, i) => ({ ...v, strength: normalized[i] }));
  }

  const mainNegBase = appendContributions(mainRolled.negative, mainContrib.negative);
  const negPresetText = NEGATIVE_PRESETS[params.negativePreset];
  const combinedNeg = negPresetText
    ? (mainNegBase ? `${negPresetText}, ${mainNegBase}` : negPresetText)
    : mainNegBase;

  const characters = params.characters.length > 0
    ? params.characters.map((c) => {
        const charTarget = sidebarState.targets[c.id];
        const charContrib = getPresetContributionsForCharacter(c.id, presetInstances, allPresets);
        const charRolled = charTarget
          ? rollTargetForGeneration(charTarget)
          : { positive: c.prompt, negative: c.negativePrompt };
        return {
          prompt: appendContributions(charRolled.positive, charContrib.positive),
          centerX: c.centerX,
          centerY: c.centerY,
          negativePrompt: appendContributions(charRolled.negative, charContrib.negative),
        };
      })
    : undefined;

  return {
    ok: true,
    req: {
      projectId,
      prompt: fullPrompt,
      negativePrompt: combinedNeg || undefined,
      characters,
      vibes: enabledVibes.length > 0 ? enabledVibes : undefined,
      width: overrides.width ?? params.width,
      height: overrides.height ?? params.height,
      steps: params.steps,
      scale: params.scale,
      seed: params.seed ?? undefined,
      cfgRescale: params.cfgRescale,
      sampler: params.sampler,
      noiseSchedule: params.noiseSchedule,
      model: params.model,
      action: overrides.action ?? { type: "generate" },
      uiSnapshot: buildUiSnapshot(params, sidebarArtistTags, sidebarState.targets),
      transparentBackground: isV5 ? params.transparentBackground : undefined,
      characterReference,
    },
  };
}
