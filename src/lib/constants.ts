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

export const DEFAULT_NEGATIVE_PROMPT =
  "nsfw, lowres, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, dithering, halftone, screentone";
