import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { useSidebarArtistTagsStore } from "@/stores/sidebar-artist-tags-store";
import { useSidebarPromptStore, type TargetPromptState } from "@/stores/sidebar-prompt-store";
import { useSidebarPresetGroupStore } from "@/stores/sidebar-preset-group-store";
import { usePresetStore } from "@/stores/preset-store";
import { useImageEditStore, activeEditMode } from "@/stores/image-edit-store";
import { useCharRefStore } from "@/stores/char-ref-store";
import { useQualityTagStore } from "@/stores/quality-tag-store";
import { useBubbleStyleStore } from "@/stores/bubble-style-store";
import {
  MAX_TOTAL_VIBES, NEGATIVE_PRESETS, isV5Model, maxCharactersFor, supportsCharacterReference,
} from "@/lib/constants";
import { normalizeStrengths } from "@/lib/normalize-strength";
import { buildArtistPrefix, isArtistTagOn } from "@/lib/artist-tag";
import { rollTargetForGeneration } from "@/lib/prompt-roll";
import { currentOutfitText } from "@/lib/character-look";
import { joinPrompt } from "@/lib/outfits";
import { appendContributions, getPresetContributionsForCharacter } from "@/lib/preset-contributions";
import { buildUiSnapshot } from "@/lib/build-ui-snapshot";
import { decorateMainPrompt, hasTextMarker, type PromptDecoration } from "@/lib/prompt-decoration";
import { appendTargetExtras, hasSfx, hasTextContent } from "@/lib/in-image-text";
import { composeCurrentMangaPage, mangaModeOn } from "@/lib/manga-request";
import { MANGA_TEMPLATE_STRENGTH, renderLayoutTemplate } from "@/lib/manga-template";
import { mangaDrawsText, mangaHasSfx, type MangaPage } from "@/lib/manga-page";
import { useMangaStore } from "@/stores/manga-store";
import { positiveTextOf } from "@/stores/sidebar-prompt-text-sync";
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
  /** Appended to the main prompt, before in-image text and the quality tags (sprite cells) */
  mainSuffix?: string;
  /** Appended to the negative prompt */
  negativeSuffix?: string;
  seed?: number;
  /** Merged into the UI snapshot (e.g. `{ sprite: { setId, cellKey } }`) */
  snapshotExtra?: Record<string, unknown>;
  /** Used instead of the character reference section's (sprite poses: the first pose's base) */
  characterReference?: CharacterReferenceRequest;
  /** Only these left-panel characters take part (sprite poses); all when omitted */
  characterIds?: string[];
}

export type BuildResult =
  | { ok: true; req: GenerateImageRequest }
  | { ok: false; errorKey: string; errorArgs?: Record<string, unknown> };

type Targets = Record<string, TargetPromptState>;
const liveTargets = (characters: ParamsState["characters"], targets: Targets) =>
  ["main", ...characters.map((c) => c.id)].map((id) => targets[id]);

/** Whether any prompt (main or a current character) will draw text: dialogue, sound effects or a typed `Text:`. */
export function promptDrawsText(
  characters: ParamsState["characters"] = useGenerationParamsStore.getState().characters,
  targets: Targets = useSidebarPromptStore.getState().targets,
): boolean {
  const main = targets["main"];
  if (main && hasTextMarker(positiveTextOf(main))) return true;
  return liveTargets(characters, targets).some(hasTextContent);
}

/**
 * Whether to drop `no text` from the quality tags: always with sound effects
 * (it suppresses soft ones like チョロロロ / シーン, and the automatic ones),
 * and with other text when the user opted in.
 */
export function shouldStripNoText(
  params: Pick<ParamsState, "characters" | "autoSfx" | "stripNoTextWithDialogue"> = useGenerationParamsStore.getState(),
  targets: Targets = useSidebarPromptStore.getState().targets,
  manga: MangaPage = useMangaStore.getState().page,
): boolean {
  // Manga mode draws only what its panels hold
  if (manga.enabled) return mangaHasSfx(manga) || (params.stripNoTextWithDialogue && mangaDrawsText(manga));
  if (params.autoSfx || liveTargets(params.characters, targets).some(hasSfx)) return true;
  return params.stripNoTextWithDialogue && promptDrawsText(params.characters, targets);
}

/** Furry prefix / transparent tag / quality tags for the main prompt, from the current state. */
export function currentPromptDecoration(params: ParamsState = useGenerationParamsStore.getState()): PromptDecoration {
  return {
    model: params.model,
    qualityPreset: params.qualityPreset,
    customQualityTags: useQualityTagStore.getState().customQualityTags,
    transparentBackground: params.transparentBackground,
    furryMode: params.furryMode,
    stripNoText: shouldStripNoText(params),
  };
}

/** Assemble the generate request from the sidebar / header state. */
export function buildGenerateRequest(projectId: string, overrides: RequestOverrides = {}): BuildResult {
  const params = useGenerationParamsStore.getState();
  const sidebarArtistTags = useSidebarArtistTagsStore.getState().sidebarArtistTags;
  const isV5 = isV5Model(params.model);
  const activePresets = params.sidebarPresets.filter((p) => p.enabled);
  const characterReference = overrides.characterReference && supportsCharacterReference(params.model)
    ? overrides.characterReference
    : currentCharacterReference(params.model);

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

  // Main prompt: [furry prefix] + artist prefix + main target (or assembled groups) + [transparent tag] + quality tags
  // + [effects, dialogue / sound effects `Text:` block — last; the quality tags are inserted before it]
  const sidebarState = useSidebarPromptStore.getState();
  const mainTarget = sidebarState.targets["main"];
  const presetInstances = useSidebarPresetGroupStore.getState().instances;
  const allPresets = usePresetStore.getState().presets;
  const mainContrib = getPresetContributionsForCharacter("main", presetInstances, allPresets);
  const bubbleStyles = useBubbleStyleStore.getState().customBubbleStyles;
  const mainRolled = mainTarget ? rollTargetForGeneration(mainTarget) : { positive: "", negative: "" };
  const userMain = joinPrompt(appendContributions(mainRolled.positive, mainContrib.positive), overrides.mainSuffix);
  // Manga mode: the page and its panels replace the usual dialogue / character prompts
  const manga = mangaModeOn() ? composeCurrentMangaPage(userMain, true) : null;
  const maxChars = maxCharactersFor(params.model);
  const cast = overrides.characterIds ? params.characters.filter((c) => overrides.characterIds!.includes(c.id)) : params.characters;
  if (manga && manga.characters.length > maxChars) {
    return { ok: false, errorKey: "manga.tooManyAppearances", errorArgs: { max: maxChars, count: manga.characters.length } };
  }
  const assembledMain = manga ? manga.main : appendTargetExtras(userMain, mainTarget, bubbleStyles, params.autoSfx);
  const fullPrompt = decorateMainPrompt(artistPrefix + assembledMain, currentPromptDecoration(params));

  let enabledVibes = allVibes.map((v) => ({ vibeId: v.vibeId, strength: v.strength }));
  if (params.normalizeVibeStrength && enabledVibes.length > 0) {
    const normalized = normalizeStrengths(enabledVibes.map((v) => v.strength));
    enabledVibes = enabledVibes.map((v, i) => ({ ...v, strength: normalized[i] }));
  }

  const mainNegBase = joinPrompt(appendContributions(mainRolled.negative, mainContrib.negative), overrides.negativeSuffix);
  const negPresetText = NEGATIVE_PRESETS[params.negativePreset];
  const combinedNeg = negPresetText
    ? (mainNegBase ? `${negPresetText}, ${mainNegBase}` : negPresetText)
    : mainNegBase;

  const characters = manga
    ? (manga.characters.length > 0
      ? manga.characters.map(({ prompt, centerX, centerY, negativePrompt }) => ({ prompt, centerX, centerY, negativePrompt }))
      : undefined)
    : cast.length > 0
    ? cast.map((c) => {
        const charTarget = sidebarState.targets[c.id];
        const charContrib = getPresetContributionsForCharacter(c.id, presetInstances, allPresets);
        const charRolled = charTarget
          ? rollTargetForGeneration(charTarget)
          : { positive: c.prompt, negative: c.negativePrompt };
        const outfit = currentOutfitText(c, sidebarState.targets, true);
        return {
          prompt: appendTargetExtras(
            joinPrompt(appendContributions(charRolled.positive, charContrib.positive), outfit?.positive),
            charTarget, bubbleStyles,
          ),
          centerX: c.centerX,
          centerY: c.centerY,
          negativePrompt: joinPrompt(appendContributions(charRolled.negative, charContrib.negative), outfit?.negative),
        };
      })
    : undefined;

  // Slanted manga panels: the outlines go as the img2img source (unless the user set up their own edit)
  const template = manga?.template && !overrides.action ? manga.template : null;
  const size = template ?? { width: overrides.width ?? params.width, height: overrides.height ?? params.height };
  const action: GenerateActionRequest = overrides.action ?? (template
    ? {
      type: "img2Img", strength: MANGA_TEMPLATE_STRENGTH, noise: 0,
      sourceImageBase64: renderLayoutTemplate(template.shapes, template.width, template.height),
    }
    : { type: "generate" });

  return {
    ok: true,
    req: {
      projectId,
      prompt: fullPrompt,
      negativePrompt: combinedNeg || undefined,
      characters,
      vibes: enabledVibes.length > 0 ? enabledVibes : undefined,
      width: size.width,
      height: size.height,
      steps: params.steps,
      scale: params.scale,
      seed: overrides.seed ?? params.seed ?? undefined,
      cfgRescale: params.cfgRescale,
      sampler: params.sampler,
      noiseSchedule: params.noiseSchedule,
      model: params.model,
      action,
      uiSnapshot: {
        ...buildUiSnapshot(params, sidebarArtistTags, sidebarState.targets, useMangaStore.getState().page),
        ...overrides.snapshotExtra,
      },
      transparentBackground: isV5 ? params.transparentBackground : undefined,
      characterReference,
    },
  };
}
