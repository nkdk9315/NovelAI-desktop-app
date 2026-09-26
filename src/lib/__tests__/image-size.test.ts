import { describe, it, expect } from "vitest";
import { enhanceSize, fitGenerationSize } from "@/lib/image-size";
import { alphaToMaskCells } from "@/lib/mask-grid";
import { MAX_TOTAL_PIXELS } from "@/lib/constants";

describe("fitGenerationSize", () => {
  it("keeps valid sizes", () => {
    expect(fitGenerationSize(832, 1216)).toEqual({ width: 832, height: 1216 });
  });

  it("snaps to multiples of 64", () => {
    expect(fitGenerationSize(830, 1200)).toEqual({ width: 832, height: 1216 });
  });

  it("shrinks oversized images within the pixel budget", () => {
    const s = fitGenerationSize(4000, 3000);
    expect(s.width % 64).toBe(0);
    expect(s.height % 64).toBe(0);
    expect(s.width * s.height).toBeLessThanOrEqual(MAX_TOTAL_PIXELS);
    expect(s.width / s.height).toBeCloseTo(4 / 3, 1);
  });

  it("clamps extreme aspect ratios to 2048 per side", () => {
    const s = fitGenerationSize(5000, 200);
    expect(s.width).toBeLessThanOrEqual(2048);
    expect(s.height).toBeGreaterThanOrEqual(64);
  });
});

describe("enhanceSize", () => {
  it("enlarges by the magnitude and respects the limits", () => {
    expect(enhanceSize(832, 1216, 1)).toEqual({ width: 832, height: 1216 });
    const s = enhanceSize(832, 1216, 1.5);
    expect(s.width * s.height).toBeLessThanOrEqual(MAX_TOTAL_PIXELS);
    expect(s.width).toBeGreaterThan(832);
  });
});

describe("alphaToMaskCells", () => {
  it("maps painted pixels to 1/8 cells", () => {
    // 16x16 source, target 16x16 -> 2x2 cells; paint the top-left 8x8 block
    const rgba = new Uint8ClampedArray(16 * 16 * 4);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) rgba[(y * 16 + x) * 4 + 3] = 255;
    const m = alphaToMaskCells(rgba, 16, 16, 16, 16);
    expect([m.cols, m.rows]).toEqual([2, 2]);
    expect(Array.from(m.cells)).toEqual([1, 0, 0, 0]);
    expect(m.count).toBe(1);
  });

  it("scales between source and target sizes", () => {
    // 8x8 source fully painted, target 32x32 -> 4x4 cells, all masked
    const rgba = new Uint8ClampedArray(8 * 8 * 4).fill(255);
    expect(alphaToMaskCells(rgba, 8, 8, 32, 32).count).toBe(16);
  });

  it("ignores faint strokes below the threshold", () => {
    const rgba = new Uint8ClampedArray(8 * 8 * 4);
    rgba[3] = 255; // one pixel of 64 -> average ~4
    expect(alphaToMaskCells(rgba, 8, 8, 8, 8).count).toBe(0);
  });
});
