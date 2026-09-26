import { MODEL_TO_VIBE_KEY, NEGATIVE_PRESETS, NOISE_SCHEDULES, QUALITY_TAGS, SAMPLERS } from "@/lib/constants";
import type { NegativePresetId } from "@/lib/constants";
import type { ArtistTag, CharRefMode, ImageMetadataDto } from "@/types";
import { extractArtistTags } from "@/lib/artist-extract";

export interface MetadataCharacter {
  /** Prompt as in the image (artist tags included) */
  rawPrompt: string;
  /** Prompt with every artist tag taken out (preview) */
  prompt: string;
  negative: string;
  centerX: number;
  centerY: number;
}

export interface MetadataArtist extends ArtistTag {
  /** Where it was found: "main" or the character index */
  source: "main" | number;
}

export interface MetadataVibe {
  /** A vibe encoding, or base64 image data when `encoded` is false */
  encoding: string;
  /** false = the raw vibe image; importing it means encoding it (costs Anlas) */
  encoded: boolean;
  strength: number;
  informationExtracted: number;
}

export interface MetadataSettings {
  width?: number;
  height?: number;
  steps?: number;
  scale?: number;
  cfgRescale?: number;
  sampler?: string;
  noiseSchedule?: string;
}

/** A NovelAI image's metadata, split into the pieces the app can import. */
export interface ParsedMetadata {
  /** App model id guessed from `Source` (null when unknown) */
  model: string | null;
  /** Main prompt without the quality suffix (artist tags included) */
  rawPrompt: string;
  /** Main prompt with artist tags and the quality suffix taken out (preview) */
  prompt: string;
  /** Artists found in the main prompt and the character prompts */
  artistTags: MetadataArtist[];
  qualityTags: boolean;
  /** Negative prompt without the detected preset */
  negative: string;
  negativePreset: NegativePresetId;
  characters: MetadataCharacter[];
  settings: MetadataSettings;
  seed: number | null;
  vibes: MetadataVibe[];
  characterReference: { imageBase64: string; strength: number; fidelity: number; mode: CharRefMode } | null;
}

/** Model hashes seen in `Source` ("NovelAI Diffusion V4.5 4BDE2A90"). */
const MODEL_HASHES: Record<string, string> = {
  "4BDE2A90": "nai-diffusion-4-5-full",
  "657484A5": "nai-diffusion-5-full",
};

export function modelFromSource(source: string | null | undefined): string | null {
  if (!source) return null;
  const hash = source.trim().split(/\s+/).pop()?.toUpperCase() ?? "";
  if (MODEL_HASHES[hash]) return MODEL_HASHES[hash];
  const curated = /curated/i.test(source);
  if (/V5\b/.test(source)) return curated ? "nai-diffusion-5-curated" : "nai-diffusion-5-full";
  if (/V4\.5\b/.test(source)) return curated ? "nai-diffusion-4-5-curated" : "nai-diffusion-4-5-full";
  if (/V4\b/.test(source)) return curated ? "nai-diffusion-4-curated-preview" : "nai-diffusion-4-full";
  return null;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Base64 of a PNG / JPEG / WebP image (an unencoded vibe) rather than an encoding. */
export function isImageBase64(data: string): boolean {
  const b64 = data.replace(/^data:image\/[\w+.-]+;base64,/, "");
  return b64.startsWith("iVBORw0KGgo") || b64.startsWith("/9j/") || /^UklGR.{6}XRUJQ/.test(b64);
}

/** Take the app's quality suffix off a prompt. */
export function splitQuality(prompt: string): { prompt: string; qualityTags: boolean } {
  const text = prompt.trim();
  if (text === QUALITY_TAGS) return { prompt: "", qualityTags: true };
  if (text.endsWith(`, ${QUALITY_TAGS}`)) {
    return { prompt: text.slice(0, -QUALITY_TAGS.length).replace(/,\s*$/, ""), qualityTags: true };
  }
  return { prompt: text, qualityTags: false };
}

/** `prompt` with the artists in `names` taken out (the others stay in the text). */
export function promptWithoutArtists(prompt: string, names: ReadonlySet<string>): string {
  return extractArtistTags(prompt, (n) => names.has(n)).text;
}

/** Detect a negative preset at the start of the negative prompt. */
export function splitNegative(negative: string): { negative: string; preset: NegativePresetId } {
  const text = negative.trim();
  const presets = (Object.entries(NEGATIVE_PRESETS) as Array<[NegativePresetId, string]>)
    .filter(([, v]) => v)
    .sort((a, b) => b[1].length - a[1].length);
  for (const [id, value] of presets) {
    if (text === value) return { negative: "", preset: id };
    if (text.startsWith(`${value},`)) return { negative: text.slice(value.length + 1).trim(), preset: id };
  }
  return { negative: text, preset: "none" };
}

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

function captions(v4: unknown): { base?: string; chars: Json[] } {
  const caption = obj(obj(v4).caption);
  return { base: str(caption.base_caption), chars: arr(caption.char_captions).map(obj) };
}

export function parseMetadata(meta: ImageMetadataDto): ParsedMetadata {
  const c = meta.comment;
  const pos = captions(c.v4_prompt);
  const neg = captions(c.v4_negative_prompt);
  const quality = splitQuality(pos.base ?? str(c.prompt) ?? "");
  const main = extractArtistTags(quality.prompt);
  const artistTags: MetadataArtist[] = main.artistTags.map((a) => ({ ...a, source: "main" }));
  const negative = splitNegative(neg.base ?? str(c.uc) ?? "");

  const characters = pos.chars.map((ch, i): MetadataCharacter => {
    const center = obj(arr(ch.centers)[0]);
    const rawPrompt = str(ch.char_caption) ?? "";
    const extracted = extractArtistTags(rawPrompt);
    for (const a of extracted.artistTags) {
      if (!artistTags.some((x) => x.name === a.name)) artistTags.push({ ...a, source: i });
    }
    return {
      rawPrompt,
      prompt: extracted.text,
      negative: str(neg.chars[i]?.char_caption) ?? "",
      centerX: num(center.x) ?? 0.5,
      centerY: num(center.y) ?? 0.5,
    };
  });

  const strengths = arr(c.reference_strength_multiple);
  const infos = arr(c.reference_information_extracted_multiple);
  const vibes = arr(c.reference_image_multiple)
    .map((e, i): MetadataVibe | null => {
      const encoding = str(e);
      if (!encoding) return null;
      return {
        encoding, encoded: !isImageBase64(encoding),
        strength: num(strengths[i]) ?? 0.7, informationExtracted: num(infos[i]) ?? 1,
      };
    })
    .filter((v): v is MetadataVibe => v !== null);

  const refImage = str(arr(c.director_reference_images)[0]);
  const refMode = str(obj(obj(arr(c.director_reference_descriptions)[0]).caption).base_caption);
  const characterReference = refImage
    ? {
        imageBase64: refImage,
        strength: num(arr(c.director_reference_strengths)[0]) ?? 1,
        fidelity: round2(1 - (num(arr(c.director_reference_secondary_strengths)[0]) ?? 0)),
        mode: (refMode === "character" || refMode === "style" ? refMode : "character&style") as CharRefMode,
      }
    : null;

  const sampler = str(c.sampler);
  const noise = str(c.noise_schedule);
  return {
    model: modelFromSource(meta.source),
    rawPrompt: quality.prompt,
    prompt: main.text,
    artistTags,
    qualityTags: quality.qualityTags,
    negative: negative.negative,
    negativePreset: negative.preset,
    characters,
    settings: {
      width: num(c.width),
      height: num(c.height),
      steps: num(c.steps),
      scale: num(c.scale),
      cfgRescale: num(c.cfg_rescale),
      sampler: sampler && (SAMPLERS as readonly string[]).includes(sampler) ? sampler : undefined,
      noiseSchedule: noise && (NOISE_SCHEDULES as readonly string[]).includes(noise) ? noise : undefined,
    },
    seed: num(c.seed) ?? null,
    vibes,
    characterReference,
  };
}

/** Vibe model key for importing the vibes (they only work with the model they were encoded for). */
export function vibeModelKey(model: string | null): string | null {
  return model ? MODEL_TO_VIBE_KEY[model] ?? null : null;
}
