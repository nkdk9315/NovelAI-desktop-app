import { isV5Model } from "@/lib/constants";

/**
 * What the official site adds to the main prompt around the user's text:
 * the furry-mode prefix, the transparent-background tag and the quality tags.
 * Reproduced from the site's image generation code.
 */

export const FURRY_PREFIX = "fur dataset";
/** The site skips the furry prefix when the prompt already starts with one of these. */
const DATASET_PREFIXES = ["fur dataset", "background dataset"];
export const TRANSPARENT_BACKGROUND_TAG = "transparent background";

export type BuiltinQualityPreset = "standard" | "light" | "none";
/** A built-in preset, or `custom:<id>` for a user-registered one. */
export type QualityPresetId = BuiltinQualityPreset | `custom:${string}`;

export interface CustomQualityTag {
  id: string;
  name: string;
  tags: string;
}

export const customPresetId = (id: string): QualityPresetId => `custom:${id}`;

/** Built-in quality tags per model (the site's "standard" / "light" suffixes). */
export function builtinQualityTags(model: string): Partial<Record<"standard" | "light", string>> {
  if (isV5Model(model)) {
    return {
      standard: "very aesthetic, masterpiece, no text",
      light: "very aesthetic, amazing quality, no text",
    };
  }
  switch (model) {
    case "nai-diffusion-4-5-full":
      return { standard: "very aesthetic, masterpiece, no text" };
    case "nai-diffusion-4-5-curated":
      return { standard: "very aesthetic, masterpiece, no text, -0.8::feet::, rating:general" };
    case "nai-diffusion-4-full":
      return { standard: "no text, best quality, very aesthetic, absurdres" };
    case "nai-diffusion-4-curated-preview":
      return { standard: "rating:general, best quality, very aesthetic, absurdres" };
    default:
      return {};
  }
}

/** The preset actually in effect: "light" falls back to "standard" on models without it, a deleted custom one to "none". */
export function effectiveQualityPreset(
  model: string, preset: QualityPresetId, customs: readonly CustomQualityTag[],
): QualityPresetId {
  if (preset === "light" && !builtinQualityTags(model).light) return "standard";
  if (preset.startsWith("custom:") && !customs.some((c) => customPresetId(c.id) === preset)) return "none";
  return preset;
}

/** Display name of a preset (`t` is the i18n translate function). */
export function qualityPresetLabel(
  preset: QualityPresetId, customs: readonly CustomQualityTag[], t: (key: string) => string,
): string {
  if (preset === "standard" || preset === "light" || preset === "none") {
    return t(`generation.qualityPreset.${preset}`);
  }
  return customs.find((c) => customPresetId(c.id) === preset)?.name ?? t("generation.qualityPreset.none");
}

/** Quality tags for the preset (empty for "none"). */
export function qualityTagsFor(
  model: string, preset: QualityPresetId, customs: readonly CustomQualityTag[],
): string {
  const eff = effectiveQualityPreset(model, preset, customs);
  if (eff === "none") return "";
  if (eff === "standard" || eff === "light") return builtinQualityTags(model)[eff] ?? "";
  return customs.find((c) => customPresetId(c.id) === eff)?.tags.trim() ?? "";
}

/** Text feature (V4.5 / V5): quality tags go before the first `Text:` part (same regex as the site). */
const TEXT_MARKER = /(?:^|\s|[,.:[\]{}、。])text:(?!:)/i;

function supportsText(model: string): boolean {
  return isV5Model(model) || model.startsWith("nai-diffusion-4-5");
}

/** Whether the prompt contains a `Text:` part (everything after it is drawn as text). */
export function hasTextMarker(prompt: string): boolean {
  return TEXT_MARKER.test(prompt);
}

export const NO_TEXT_TAG = "no text";

/** Drop the `no text` tag from a comma-separated tag list. */
export function withoutNoText(tags: string): string {
  return tags.split(",").map((t) => t.trim()).filter((t) => t && t.toLowerCase() !== NO_TEXT_TAG).join(", ");
}

function appendTo(text: string, suffix: string): string {
  if (!suffix) return text;
  return text ? `${text}, ${suffix}` : suffix;
}

export interface PromptDecoration {
  model: string;
  qualityPreset: QualityPresetId;
  customQualityTags: readonly CustomQualityTag[];
  /** Only takes effect on V5 */
  transparentBackground: boolean;
  furryMode: boolean;
  /** Remove `no text` from the quality tags (set only when the prompt draws text) */
  stripNoText?: boolean;
}

/** Suffix added after the prompt: `transparent background` (V5) followed by the quality tags. */
export function promptSuffix(d: PromptDecoration): string {
  const tags = qualityTagsFor(d.model, d.qualityPreset, d.customQualityTags);
  const quality = d.stripNoText ? withoutNoText(tags) : tags;
  const transparent = d.transparentBackground && isV5Model(d.model) ? TRANSPARENT_BACKGROUND_TAG : "";
  return [transparent, quality].filter(Boolean).join(", ");
}

/** The main prompt as the site sends it: furry prefix + prompt + transparent tag + quality tags. */
export function decorateMainPrompt(prompt: string, d: PromptDecoration): string {
  const suffix = promptSuffix(d);
  const textAt = supportsText(d.model) ? prompt.search(TEXT_MARKER) : -1;
  let out = appendTo(textAt >= 0 ? prompt.slice(0, textAt) : prompt, suffix);
  if (textAt >= 0) {
    const textPart = prompt.slice(textAt);
    // A prompt that starts with `Text:` has no separator of its own before it
    out = out && !/^\s/.test(textPart) ? `${out} ${textPart}` : out + textPart;
  }
  if (d.furryMode && !DATASET_PREFIXES.some((p) => out.startsWith(p))) {
    out = out ? `${FURRY_PREFIX}, ${out}` : FURRY_PREFIX;
  }
  return out;
}

export interface SplitPrompt {
  prompt: string;
  qualityPreset: QualityPresetId;
  transparentBackground: boolean;
  furryMode: boolean;
}

function stripSuffix(text: string, suffix: string): string | null {
  if (text === suffix) return "";
  if (text.endsWith(`, ${suffix}`)) return text.slice(0, -(suffix.length + 2)).replace(/,\s*$/, "");
  return null;
}

const ALL_MODELS_FOR_DETECTION = [
  "nai-diffusion-5-full", "nai-diffusion-4-5-curated", "nai-diffusion-4-full", "nai-diffusion-4-curated-preview",
];

/** Undo `decorateMainPrompt` on a prompt read from an image (used by metadata import). */
export function splitDecorations(
  prompt: string, model: string | null, customs: readonly CustomQualityTag[] = [],
): SplitPrompt {
  let text = prompt.trim();
  // With a `Text:` part the decorations sit just before it: split it off and put it back at the end
  const textAt = text.search(TEXT_MARKER);
  const textPart = textAt > 0 ? text.slice(textAt).trim() : "";
  if (textPart) text = text.slice(0, textAt).trim();
  let furryMode = false;
  if (text === FURRY_PREFIX || text.startsWith(`${FURRY_PREFIX}, `)) {
    furryMode = true;
    text = text.slice(FURRY_PREFIX.length).replace(/^,\s*/, "");
  }

  // Every known quality suffix, longest first so "…, rating:general" beats its shorter prefix
  const builtins = (model ? [model] : ALL_MODELS_FOR_DETECTION)
    .flatMap((m) => Object.entries(builtinQualityTags(m)) as Array<[QualityPresetId, string]>);
  const candidates: Array<[QualityPresetId, string]> = [
    ...builtins,
    ...customs.filter((c) => c.tags.trim()).map((c): [QualityPresetId, string] => [customPresetId(c.id), c.tags.trim()]),
  ].sort((a, b) => b[1].length - a[1].length);

  let qualityPreset: QualityPresetId = "none";
  for (const [id, tags] of candidates) {
    const rest = stripSuffix(text, tags);
    if (rest !== null) {
      qualityPreset = id;
      text = rest;
      break;
    }
  }

  let transparentBackground = false;
  const rest = stripSuffix(text, TRANSPARENT_BACKGROUND_TAG);
  if (rest !== null) {
    transparentBackground = true;
    text = rest;
  }
  if (textPart) text = [text.replace(/,\s*$/, ""), textPart].filter(Boolean).join(", ");
  return { prompt: text, qualityPreset, transparentBackground, furryMode };
}
