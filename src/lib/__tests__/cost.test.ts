import { describe, it, expect } from "vitest";
import { calculateAugmentCost, calculateCost, calculateUpscaleCost, inpaintBilledSize } from "@/lib/cost";
import type { CostEstimateRequest } from "@/types";

function req(
  overrides: Partial<CostEstimateRequest> = {},
): CostEstimateRequest {
  return {
    width: 832,
    height: 1216,
    steps: 23,
    vibeCount: 0,
    hasCharacterReference: false,
    tier: 0,
    ...overrides,
  };
}

describe("calculateCost", () => {
  it("txt2img basic cost", () => {
    const result = calculateCost(req());
    expect(result).toEqual({ totalCost: 17, isOpusFree: false });
  });

  it("opus free generation", () => {
    const result = calculateCost(
      req({ width: 1024, height: 1024, steps: 28, tier: 3 }),
    );
    expect(result).toEqual({ totalCost: 0, isOpusFree: true });
  });

  it("vibe cost added", () => {
    const result = calculateCost(req({ vibeCount: 5 }));
    // 17 (base) + max(0, 5-4)*2 = 19
    expect(result.totalCost).toBe(19);
    expect(result.isOpusFree).toBe(false);
  });

  it("char ref cost added", () => {
    const result = calculateCost(req({ hasCharacterReference: true }));
    // 17 (base) + 5*1*1 = 22
    expect(result.totalCost).toBe(22);
    expect(result.isOpusFree).toBe(false);
  });

  it("minimum cost floor", () => {
    // Very small image, few steps → should still be at least 2
    const result = calculateCost(
      req({ width: 64, height: 64, steps: 1 }),
    );
    expect(result.totalCost).toBeGreaterThanOrEqual(2);
  });

  it("opus free generation applies even with vibes (batch cost only beyond 4)", () => {
    const resultWithOneVibe = calculateCost(
      req({ width: 1024, height: 1024, steps: 28, tier: 3, vibeCount: 1 }),
    );
    expect(resultWithOneVibe).toEqual({ totalCost: 0, isOpusFree: true });

    const resultWithFiveVibes = calculateCost(
      req({ width: 1024, height: 1024, steps: 28, tier: 3, vibeCount: 5 }),
    );
    // Generation is free, but 1 vibe beyond the free-4 threshold costs 2 Anlas
    expect(resultWithFiveVibes).toEqual({ totalCost: 2, isOpusFree: true });
  });

  it("opus free does not apply with character reference", () => {
    const result = calculateCost(
      req({
        width: 1024,
        height: 1024,
        steps: 28,
        tier: 3,
        hasCharacterReference: true,
      }),
    );
    expect(result.isOpusFree).toBe(false);
  });

  it("opus free does not apply above pixel limit", () => {
    const result = calculateCost(
      req({ width: 1280, height: 1280, steps: 28, tier: 3 }),
    );
    expect(result.isOpusFree).toBe(false);
    expect(result.totalCost).toBeGreaterThan(0);
  });

  it("non-opus tier never qualifies for free", () => {
    const result = calculateCost(
      req({ width: 1024, height: 1024, steps: 28, tier: 2 }),
    );
    expect(result.isOpusFree).toBe(false);
  });

  it("V5 costs 1.5x the V4 formula", () => {
    // V4 base 17 -> ceil(17 * 1.5) = 26
    const result = calculateCost(req({ model: "nai-diffusion-5-full" }));
    expect(result).toEqual({ totalCost: 26, isOpusFree: false });
  });

  it("V5 is Opus-free until the usage is exhausted", () => {
    const base = { width: 1024, height: 1024, steps: 28, tier: 3, model: "nai-diffusion-5-curated" };
    expect(calculateCost(req(base))).toEqual({ totalCost: 0, isOpusFree: true });
    const exhausted = calculateCost(req({ ...base, opusUsageExhausted: true }));
    expect(exhausted.isOpusFree).toBe(false);
    expect(exhausted.totalCost).toBeGreaterThan(0);
  });

  it("usage exhaustion does not affect V4.5", () => {
    const result = calculateCost(
      req({ width: 1024, height: 1024, steps: 28, tier: 3, opusUsageExhausted: true }),
    );
    expect(result).toEqual({ totalCost: 0, isOpusFree: true });
  });
});

describe("calculateCost img2img / inpaint", () => {
  it("img2img scales the cost by strength", () => {
    // 17 * 0.5 = 8.5 -> 9
    expect(calculateCost(req({ mode: "img2img", strength: 0.5 })).totalCost).toBe(9);
    expect(calculateCost(req({ mode: "img2img", strength: 0.01 })).totalCost).toBe(2);
  });

  it("txt2img ignores strength", () => {
    expect(calculateCost(req({ strength: 0.1 })).totalCost).toBe(17);
  });

  it("small inpaint areas are billed as ~1MP and ignore vibes", () => {
    expect(inpaintBilledSize(512, 512)).toEqual({ width: 1024, height: 1024 });
    expect(inpaintBilledSize(832, 1216)).toEqual({ width: 832, height: 1216 });
    const r = calculateCost(req({ mode: "inpaint", strength: 1, width: 512, height: 512, vibeCount: 8 }));
    expect(r.totalCost).toBe(calculateCost(req({ width: 1024, height: 1024 })).totalCost);
  });

  it("vibes are not billed with a character reference", () => {
    expect(calculateCost(req({ hasCharacterReference: true, vibeCount: 8 })).totalCost).toBe(22);
  });
});

describe("calculateAugmentCost", () => {
  it("small images are expanded to 1MP and free for Opus", () => {
    const free = calculateAugmentCost("lineart", 512, 512, 3);
    expect(free).toEqual({ totalCost: 0, isOpusFree: true });
    const paid = calculateAugmentCost("lineart", 512, 512, 0);
    expect(paid.totalCost).toBeGreaterThan(0);
  });

  it("832x1216 is enlarged to just under 1MP and stays Opus-free", () => {
    expect(calculateAugmentCost("declutter-keep-bubbles", 832, 1216, 3)).toEqual({ totalCost: 0, isOpusFree: true });
  });

  it("bg-removal is always billed with the multiplier", () => {
    const base = calculateAugmentCost("lineart", 1024, 1024, 0).totalCost;
    const bg = calculateAugmentCost("bg-removal", 1024, 1024, 3);
    expect(bg.isOpusFree).toBe(false);
    expect(bg.totalCost).toBe(Math.ceil(3 * base + 5));
  });
});

describe("calculateUpscaleCost", () => {
  it("uses the pixel table and rejects >1MP inputs", () => {
    expect(calculateUpscaleCost(1024, 1536)).toBeNull();
    expect(calculateUpscaleCost(832, 1216)).toBe(1);
    expect(calculateUpscaleCost(1024, 1024)).toBe(1);
    expect(calculateUpscaleCost(512, 768)).toBe(1);
  });
});
