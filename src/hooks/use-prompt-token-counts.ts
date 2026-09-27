import { useEffect, useMemo, useRef, useState } from "react";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import { useSidebarArtistTagsStore } from "@/stores/sidebar-artist-tags-store";
import { NEGATIVE_PRESETS } from "@/lib/constants";
import { decorateMainPrompt } from "@/lib/prompt-decoration";
import { currentPromptDecoration } from "@/lib/generation-request";
import { useQualityTagStore } from "@/stores/quality-tag-store";
import { buildArtistPrefix } from "@/lib/artist-tag";
import { assembleFullPrompt, assembleNegativeFromGroups } from "@/lib/prompt-assembly";
import { appendTargetExtras } from "@/lib/in-image-text";
import { useBubbleStyleStore } from "@/stores/bubble-style-store";
import * as ipc from "@/lib/ipc";
import { useDebounce } from "./use-debounce";

const MAIN_TARGET_ID = "main";
const DEFAULT_MAX_TOKENS = 512;

export interface PromptTokenCounts {
  positiveTotal: number;
  negativeTotal: number;
  maxTokens: number;
  positiveOverflow: boolean;
  negativeOverflow: boolean;
  overflow: boolean;
  loading: boolean;
}

/**
 * Build the positive/negative prompt preview texts the way ActionBar assembles
 * them for generation, so the token counts match what the API will see.
 * Random-mode groups are assembled in preview mode (enabled tags only) — the
 * actual random roll happens at generation time but we approximate the worst
 * case by counting every currently enabled tag.
 */
function buildPromptTexts(): { positives: string[]; negatives: string[] } {
  const params = useGenerationParamsStore.getState();
  const sidebar = useSidebarPromptStore.getState();
  const artistTags = useSidebarArtistTagsStore.getState().sidebarArtistTags;

  const activePresets = params.sidebarPresets.filter((p) => p.enabled);
  const allArtistTags = [
    ...artistTags,
    ...activePresets.flatMap((p) => p.artistTags),
  ];
  const artistPrefix = buildArtistPrefix(allArtistTags);

  const mainTarget = sidebar.targets[MAIN_TARGET_ID];
  const bubbleStyles = useBubbleStyleStore.getState().customBubbleStyles;
  const assembledMain = mainTarget
    ? appendTargetExtras(
      mainTarget.promptOverride ?? assembleFullPrompt("", mainTarget.groups), mainTarget, bubbleStyles, params.autoSfx,
    )
    : "";
  const mainPrompt = decorateMainPrompt(artistPrefix + assembledMain, currentPromptDecoration(params));

  const mainNegBase = mainTarget
    ? (mainTarget.negativeOverride ?? assembleNegativeFromGroups(mainTarget.groups))
    : "";
  const negPresetText = NEGATIVE_PRESETS[params.negativePreset];
  const mainNegative = negPresetText
    ? (mainNegBase ? `${negPresetText}, ${mainNegBase}` : negPresetText)
    : mainNegBase;

  const positives: string[] = [mainPrompt];
  const negatives: string[] = [mainNegative];

  for (const c of params.characters) {
    const t = sidebar.targets[c.id];
    const charPrompt = t
      ? appendTargetExtras(t.promptOverride ?? assembleFullPrompt("", t.groups), t, bubbleStyles)
      : c.prompt;
    const charNeg = t
      ? (t.negativeOverride ?? assembleNegativeFromGroups(t.groups))
      : c.negativePrompt;
    positives.push(charPrompt);
    negatives.push(charNeg);
  }

  return { positives, negatives };
}

/**
 * Count tokens for every positive/negative prompt via the backend tokenizer
 * (T5 for V4 / V4.5, Qwen for V5) and return the running totals + overflow flags.
 * The limit depends on the model (V4.5: 512, V5 curated: 703, V5 full: 1471).
 */
export function usePromptTokenCounts(): PromptTokenCounts {
  const model = useGenerationParamsStore((s) => s.model);
  const characters = useGenerationParamsStore((s) => s.characters);
  const qualityPreset = useGenerationParamsStore((s) => s.qualityPreset);
  const furryMode = useGenerationParamsStore((s) => s.furryMode);
  const transparentBackground = useGenerationParamsStore((s) => s.transparentBackground);
  const bubbleStyles = useBubbleStyleStore((s) => s.customBubbleStyles);
  const stripNoText = useGenerationParamsStore((s) => s.stripNoTextWithDialogue);
  const autoSfx = useGenerationParamsStore((s) => s.autoSfx);
  const customQualityTags = useQualityTagStore((s) => s.customQualityTags);
  const negativePreset = useGenerationParamsStore((s) => s.negativePreset);
  const sidebarPresets = useGenerationParamsStore((s) => s.sidebarPresets);
  const targets = useSidebarPromptStore((s) => s.targets);
  const artistTags = useSidebarArtistTagsStore((s) => s.sidebarArtistTags);

  const { positives, negatives } = useMemo(
    () => buildPromptTexts(),
    // buildPromptTexts reads from store state snapshots; these deps trigger recomputation
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      model, characters, qualityPreset, furryMode, transparentBackground, bubbleStyles, stripNoText, autoSfx,
      customQualityTags, negativePreset, sidebarPresets, targets, artistTags,
    ],
  );

  const allTexts = useMemo(() => [...positives, ...negatives], [positives, negatives]);
  const debounced = useDebounce(allTexts, 250);

  const [positiveTotal, setPositiveTotal] = useState(0);
  const [negativeTotal, setNegativeTotal] = useState(0);
  const [maxTokens, setMaxTokens] = useState(DEFAULT_MAX_TOKENS);
  const [loading, setLoading] = useState(false);
  const reqIdRef = useRef(0);

  useEffect(() => {
    const posCount = positives.length;
    const myId = ++reqIdRef.current;
    setLoading(true);
    ipc
      .countTokens(debounced, model)
      .then((res) => {
        if (reqIdRef.current !== myId) return;
        const pos = res.counts.slice(0, posCount).reduce((a, b) => a + b, 0);
        const neg = res.counts.slice(posCount).reduce((a, b) => a + b, 0);
        setPositiveTotal(pos);
        setNegativeTotal(neg);
        setMaxTokens(res.maxTokens || DEFAULT_MAX_TOKENS);
        setLoading(false);
      })
      .catch(() => {
        if (reqIdRef.current !== myId) return;
        setLoading(false);
      });
  }, [debounced, positives.length, model]);

  const positiveOverflow = positiveTotal > maxTokens;
  const negativeOverflow = negativeTotal > maxTokens;

  return {
    positiveTotal,
    negativeTotal,
    maxTokens,
    positiveOverflow,
    negativeOverflow,
    overflow: positiveOverflow || negativeOverflow,
    loading,
  };
}
