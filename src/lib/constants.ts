export const MODELS = [
  "nai-diffusion-4-curated-preview",
  "nai-diffusion-4-full",
  "nai-diffusion-4-5-curated",
  "nai-diffusion-4-5-full",
] as const;

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
export const DEFAULT_SAMPLER = "k_euler";
export const DEFAULT_NOISE_SCHEDULE = "native";
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

export const QUALITY_TAGS = "masterpiece, very aesthetic, no text";

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
