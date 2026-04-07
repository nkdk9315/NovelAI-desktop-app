import { describe, it, expect } from "vitest";
import { calculateCost } from "@/lib/cost";
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

  it("opus free with vibes is not free", () => {
    const result = calculateCost(
      req({ width: 1024, height: 1024, steps: 28, tier: 3, vibeCount: 1 }),
    );
    expect(result.isOpusFree).toBe(false);
  });
});
