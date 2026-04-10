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
};

export const DEFAULT_NEGATIVE_PROMPT =
  "nsfw, lowres, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, dithering, halftone, screentone";
