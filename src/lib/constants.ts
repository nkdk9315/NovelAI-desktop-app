export const MODELS = [
  "nai-diffusion-4-curated-preview",
  "nai-diffusion-4-full",
  "nai-diffusion-4-5-curated",
  "nai-diffusion-4-5-full",
  "nai-diffusion-5-curated",
  "nai-diffusion-5-full",
] as const;

/** Models that support Vibe Transfer (V5 does not). */
export const VIBE_MODELS = [
  "nai-diffusion-4-curated-preview",
  "nai-diffusion-4-full",
  "nai-diffusion-4-5-curated",
  "nai-diffusion-4-5-full",
] as const;

/** V5 models: no Vibe / CharRef, transparency support, Qwen tokenizer, 1.5x cost. */
export function isV5Model(model: string): boolean {
  return model.startsWith("nai-diffusion-5");
}

export const SAMPLERS = [
  "k_euler",
  "k_euler_ancestral",
  "k_dpmpp_2s_ancestral",
  "k_dpmpp_2m",
  "k_dpmpp_sde",
  "k_dpmpp_2m_sde",
] as const;

export const NOISE_SCHEDULES = [
  "native",
  "karras",
  "exponential",
  "polyexponential",
] as const;

export const MODEL_TO_VIBE_KEY: Record<string, string> = {
  "nai-diffusion-4-curated-preview": "v4curated",
  "nai-diffusion-4-full": "v4full",
  "nai-diffusion-4-5-curated": "v4-5curated",
  "nai-diffusion-4-5-full": "v4-5full",
};

export const DEFAULT_MODEL = "nai-diffusion-4-5-full";
export const DEFAULT_SAMPLER = "k_euler_ancestral";
export const DEFAULT_NOISE_SCHEDULE = "karras";
export const DEFAULT_STEPS = 28;
export const DEFAULT_SCALE = 5.0;
export const DEFAULT_CFG_RESCALE = 0.0;
export const DEFAULT_WIDTH = 832;
export const DEFAULT_HEIGHT = 1216;

export const MIN_DIMENSION = 64;
export const MAX_DIMENSION = 2048;
export const DIMENSION_STEP = 64;
export const MAX_TOTAL_PIXELS = 3_145_728;

type Orient = "portrait" | "landscape" | "square";

export interface SizePreset {
  orient: Orient;
  w: number;
  h: number;
}

export interface SizePresetGroup {
  group: "normal" | "large" | "wallpaper" | "small";
  items: SizePreset[];
}

export const SIZE_PRESET_GROUPS: SizePresetGroup[] = [
  {
    group: "normal",
    items: [
      { orient: "portrait", w: 832, h: 1216 },
      { orient: "landscape", w: 1216, h: 832 },
      { orient: "square", w: 1024, h: 1024 },
    ],
  },
  {
    group: "large",
    items: [
      { orient: "portrait", w: 1024, h: 1536 },
      { orient: "landscape", w: 1536, h: 1024 },
      { orient: "square", w: 1472, h: 1472 },
    ],
  },
  {
    group: "wallpaper",
    items: [
      { orient: "portrait", w: 1088, h: 1920 },
      { orient: "landscape", w: 1920, h: 1088 },
    ],
  },
  {
    group: "small",
    items: [
      { orient: "portrait", w: 512, h: 768 },
      { orient: "landscape", w: 768, h: 512 },
      { orient: "square", w: 640, h: 640 },
    ],
  },
];
export const MAX_CHARACTERS = 6;
export const MAX_CHARACTERS_V5 = 32;

export function maxCharactersFor(model: string): number {
  return isV5Model(model) ? MAX_CHARACTERS_V5 : MAX_CHARACTERS;
}
export const MAX_VIBES = 10;
export const MAX_TOTAL_VIBES = 16;

export const DEFAULT_RANDOM_PRESET_SETTINGS = {
  vibeCount: "random" as const,
  artistTagCount: "random" as const,
  artistTagCountMin: 0,
  artistTagCountMax: 3,
  artistTagStrength: "random" as const,
  artistTagStrengthMin: 0,
  artistTagStrengthMax: 5,
  vibeStrengthMin: 0.3,
  vibeStrengthMax: 0.9,
  favoritesOnly: false,
  folderIds: [] as number[],
};

export const DEFAULT_NEGATIVE_PROMPT = "";

export const NEGATIVE_PRESETS = {
  none: "",
  "human-main":
    "lowres, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, dithering, halftone, screentone, multiple views, logo, too many watermarks, negative space, blank page, @_@, mismatched pupils, glowing eyes, bad anatomy",
  light:
    "lowres, artistic error, scan artifacts, worst quality, bad quality, jpeg artifacts, multiple views, very displeasing, too many watermarks, negative space, blank page",
  heavy:
    "lowres, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, dithering, halftone, screentone, multiple views, logo, too many watermarks, negative space, blank page",
  furry:
    "{worst quality}, distracting watermark, unfinished, bad quality, {widescreen}, upscale, {sequence}, {{grandfathered content}}, blurred foreground, chromatic aberration, sketch, everyone, [sketch background], simple, [flat colors], ych (character), outline, multiple scenes, [[horror (theme)]], comic",
} as const;

export type NegativePresetId = keyof typeof NEGATIVE_PRESETS;

// ---- Image2Image / Inpaint / Enhance ----

export const DEFAULT_IMG2IMG_STRENGTH = 0.7;
export const DEFAULT_IMG2IMG_NOISE = 0;
export const DEFAULT_INPAINT_STRENGTH = 1;

/** Official Enhance presets (img2img on an upsized copy of the image). */
export const ENHANCE_LEVELS = [
  { level: 1, strength: 0.2, noise: 0 },
  { level: 2, strength: 0.4, noise: 0 },
  { level: 3, strength: 0.5, noise: 0 },
  { level: 4, strength: 0.6, noise: 0 },
  { level: 5, strength: 0.7, noise: 0.1 },
] as const;
export const ENHANCE_MAGNITUDES = [1, 1.5] as const;

/** Character Reference is a V4.5-only feature. */
export function supportsCharacterReference(model: string): boolean {
  return model.startsWith("nai-diffusion-4-5");
}

// ---- Director Tools (augment) ----

export const AUGMENT_TOOLS = [
  "bg-removal",
  "lineart",
  "sketch",
  "colorize",
  "emotion",
  "declutter",
  "declutter-keep-bubbles",
] as const;

export const MAX_DEFRY = 5;
export const DEFAULT_DEFRY = 0;

/** Emotion keywords accepted by the emotion tool, with a glyph for the picker. */
export const EMOTIONS: ReadonlyArray<{ key: string; emoji: string }> = [
  { key: "neutral", emoji: "😐" }, { key: "happy", emoji: "😊" }, { key: "sad", emoji: "😢" },
  { key: "angry", emoji: "😠" }, { key: "scared", emoji: "😨" }, { key: "surprised", emoji: "😲" },
  { key: "tired", emoji: "😩" }, { key: "excited", emoji: "🤩" }, { key: "nervous", emoji: "😬" },
  { key: "thinking", emoji: "🤔" }, { key: "confused", emoji: "😕" }, { key: "shy", emoji: "☺️" },
  { key: "disgusted", emoji: "🤢" }, { key: "smug", emoji: "😏" }, { key: "bored", emoji: "🥱" },
  { key: "laughing", emoji: "😆" }, { key: "irritated", emoji: "😒" }, { key: "aroused", emoji: "😳" },
  { key: "embarrassed", emoji: "😖" }, { key: "love", emoji: "😍" }, { key: "worried", emoji: "😟" },
  { key: "determined", emoji: "😤" }, { key: "hurt", emoji: "🤕" }, { key: "playful", emoji: "😜" },
];
