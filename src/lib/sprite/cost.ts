/** Anlas estimate of a batch of sprite cells (composites are free: no API call). */
import { calculateCost } from "@/lib/cost";
import { collectActiveVibes, currentCharacterReference } from "@/lib/generation-request";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { useSettingsStore } from "@/stores/settings-store";
import { planCell, type CellLookup } from "./plan";
import type { SpriteSpec } from "./spec";

export interface SpriteCostEstimate {
  total: number;
  generations: number;
  composites: number;
}

export function estimateSpriteCost(spec: SpriteSpec, keys: string[], lookup: CellLookup, count: number): SpriteCostEstimate {
  const params = useGenerationParamsStore.getState();
  const anlas = useSettingsStore.getState().anlas;
  const charRef = !!currentCharacterReference(params.model);
  const vibeCount = charRef ? 0 : collectActiveVibes(params).length;
  const out: SpriteCostEstimate = { total: 0, generations: 0, composites: 0 };
  for (const key of keys) {
    // Parents made earlier in the same batch count as adopted
    const plan = planCell(spec, key, (k) => ({ adoptedImageId: "x", excluded: lookup(k)?.excluded ?? false }));
    if (plan.method === "composite") {
      out.composites++;
      continue;
    }
    const inpaint = plan.method === "inpaint";
    const cost = calculateCost({
      width: spec.width,
      height: spec.height,
      steps: params.steps,
      vibeCount,
      hasCharacterReference: charRef,
      tier: anlas?.tier ?? 0,
      model: params.model,
      opusUsageExhausted: anlas?.opusUsage?.isExhausted ?? false,
      mode: inpaint ? "inpaint" : "txt2img",
      strength: inpaint ? spec.inpaintStrength : 1,
    });
    out.total += cost.totalCost * count;
    out.generations += count;
  }
  return out;
}
