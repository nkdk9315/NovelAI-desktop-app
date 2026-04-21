import type { CostEstimateRequest, CostResultDto } from "@/types";

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

export function calculateCost(params: CostEstimateRequest): CostResultDto {
  const pixels = params.width * params.height;
  const baseCost = Math.ceil(
    V4_COST_COEFF_LINEAR * pixels +
      V4_COST_COEFF_STEP * pixels * params.steps,
  );
  const adjustedCost = Math.min(Math.max(baseCost, MIN_COST_PER_IMAGE), MAX_COST_PER_IMAGE);

  const isOpusFree =
    !params.hasCharacterReference &&
    pixels <= OPUS_FREE_PIXELS &&
    params.steps <= OPUS_FREE_MAX_STEPS &&
    params.tier >= OPUS_MIN_TIER;

  const generationCost = isOpusFree ? 0 : adjustedCost;
  const charRefCost = params.hasCharacterReference ? CHAR_REF_PRICE : 0;
  const vibeBatchCost =
    Math.max(0, params.vibeCount - VIBE_FREE_THRESHOLD) * VIBE_BATCH_PRICE;
  const totalCost = generationCost + charRefCost + vibeBatchCost;

  return { totalCost, isOpusFree };
}
