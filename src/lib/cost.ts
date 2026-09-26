import type { AugmentTool, CostEstimateRequest, CostResultDto } from "@/types";
import { isV5Model } from "@/lib/constants";

const V4_COST_COEFF_LINEAR = 2.951823174884865e-6;
const V4_COST_COEFF_STEP = 5.753298233447344e-7;
const OPUS_FREE_PIXELS = 1_048_576;
const OPUS_FREE_MAX_STEPS = 28;
const OPUS_MIN_TIER = 3;
const MIN_COST_PER_IMAGE = 2;
const MAX_COST_PER_IMAGE = 140;
const VIBE_FREE_THRESHOLD = 4;
const VIBE_BATCH_PRICE = 2;
const CHAR_REF_PRICE = 5;
const V5_COST_MULTIPLIER = 1.5;
const INPAINT_THRESHOLD_RATIO = 0.8;
const GRID_SIZE = 64;
const MAX_PIXELS = 3_145_728;
const AUGMENT_FIXED_STEPS = 28;
const AUGMENT_MIN_PIXELS = 1_048_576;
const BG_REMOVAL_MULTIPLIER = 3;
const BG_REMOVAL_ADDEND = 5;
/** [max pixels, cost] ascending. Upscale has no Opus free tier. */
const UPSCALE_COST_TABLE: Array<[number, number]> = [
  [1_048_576, 1],
  [1_747_627, 2],
  [2_446_678, 3],
  [3_145_728, 4],
];
/** The API only accepts upscale inputs up to 1024×1024 pixels. */
export const UPSCALE_MAX_PIXELS = 1_048_576;
/** Director Tools reject inputs above this pixel count. */
export const AUGMENT_MAX_PIXELS = MAX_PIXELS;

function baseCost(width: number, height: number, steps: number): number {
  const pixels = width * height;
  return Math.ceil(V4_COST_COEFF_LINEAR * pixels + V4_COST_COEFF_STEP * pixels * steps);
}

/** Small inpaint areas are billed as if they were ~1MP (official behaviour). */
export function inpaintBilledSize(width: number, height: number): { width: number; height: number } {
  const pixels = width * height;
  if (pixels === 0 || pixels >= OPUS_FREE_PIXELS * INPAINT_THRESHOLD_RATIO) return { width, height };
  const scale = Math.sqrt(OPUS_FREE_PIXELS / pixels);
  const snap = (v: number) => Math.max(GRID_SIZE, Math.floor(Math.floor(v * scale) / GRID_SIZE) * GRID_SIZE);
  return { width: snap(width), height: snap(height) };
}

export function calculateCost(params: CostEstimateRequest): CostResultDto {
  const mode = params.mode ?? "txt2img";
  const { width, height } = mode === "inpaint"
    ? inpaintBilledSize(params.width, params.height)
    : params;
  const pixels = width * height;
  const isV5 = params.model ? isV5Model(params.model) : false;
  const strength = mode === "txt2img" ? 1 : Math.min(1, Math.max(0, params.strength ?? 1));
  const perImageCost = baseCost(width, height, params.steps) * (isV5 ? V5_COST_MULTIPLIER : 1);
  const adjustedCost = Math.min(
    Math.max(Math.ceil(perImageCost * strength), MIN_COST_PER_IMAGE),
    MAX_COST_PER_IMAGE,
  );

  const isOpusFree =
    !(isV5 && params.opusUsageExhausted) &&
    !params.hasCharacterReference &&
    pixels <= OPUS_FREE_PIXELS &&
    params.steps <= OPUS_FREE_MAX_STEPS &&
    params.tier >= OPUS_MIN_TIER;

  const generationCost = isOpusFree ? 0 : adjustedCost;
  const charRefCost = params.hasCharacterReference ? CHAR_REF_PRICE : 0;
  // Vibes are not billed alongside a character reference or for inpainting
  const vibeBatchCost = params.hasCharacterReference || mode === "inpaint"
    ? 0
    : Math.max(0, params.vibeCount - VIBE_FREE_THRESHOLD) * VIBE_BATCH_PRICE;
  const totalCost = generationCost + charRefCost + vibeBatchCost;

  return { totalCost, isOpusFree };
}

/** Director Tools cost (official site): clamp to 3MP → enlarge towards 1MP → 28-step base cost. */
export function calculateAugmentCost(
  tool: AugmentTool,
  width: number,
  height: number,
  tier: number,
): CostResultDto {
  let w = width;
  let h = height;
  if (w * h > MAX_PIXELS) {
    const s = Math.sqrt(MAX_PIXELS / (w * h));
    w = Math.floor(w * s);
    h = Math.floor(h * s);
  }
  // Official site (`Rj`): enlarge small images towards 1MP, flooring both sides
  if (w * h < AUGMENT_MIN_PIXELS) {
    const s = Math.sqrt(AUGMENT_MIN_PIXELS / (w * h));
    w = Math.floor(w * s);
    h = Math.floor(h * s);
  }
  const base = baseCost(w, h, AUGMENT_FIXED_STEPS);
  const finalCost = tool === "bg-removal" ? Math.ceil(BG_REMOVAL_MULTIPLIER * base + BG_REMOVAL_ADDEND) : base;
  const isOpusFree = tool !== "bg-removal" && w * h <= OPUS_FREE_PIXELS && tier >= OPUS_MIN_TIER;
  return { totalCost: isOpusFree ? 0 : finalCost, isOpusFree };
}

/** Upscale cost from the pixel table, or null when the image is too large. */
export function calculateUpscaleCost(width: number, height: number): number | null {
  const pixels = width * height;
  if (pixels > UPSCALE_MAX_PIXELS) return null;
  const row = UPSCALE_COST_TABLE.find(([max]) => pixels <= max);
  return row ? row[1] : null;
}
