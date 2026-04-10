import { describe, expect, it } from "vitest";
import { normalizeStrengths } from "../normalize-strength";

describe("normalizeStrengths", () => {
  it("returns empty array unchanged", () => {
    expect(normalizeStrengths([])).toEqual([]);
  });

  it("returns values unchanged when sum is 0", () => {
    expect(normalizeStrengths([0, 0, 0])).toEqual([0, 0, 0]);
  });

  it("returns values unchanged when sum is less than 1", () => {
    expect(normalizeStrengths([0.3, 0.3])).toEqual([0.3, 0.3]);
  });

  it("returns values unchanged when sum equals 1", () => {
    expect(normalizeStrengths([0.5, 0.5])).toEqual([0.5, 0.5]);
  });

  it("normalizes values when sum exceeds 1", () => {
    const result = normalizeStrengths([0.8, 0.8]);
    expect(result[0]).toBeCloseTo(0.5, 2);
    expect(result[1]).toBeCloseTo(0.5, 2);
  });

  it("normalizes proportionally", () => {
    const result = normalizeStrengths([2, 1, 1]);
    expect(result[0]).toBeCloseTo(0.5, 2);
    expect(result[1]).toBeCloseTo(0.25, 2);
    expect(result[2]).toBeCloseTo(0.25, 2);
  });

  it("rounds to 2 decimal places", () => {
    const result = normalizeStrengths([1, 1, 1]);
    expect(result[0]).toBe(0.33);
    expect(result[1]).toBe(0.33);
    expect(result[2]).toBe(0.33);
  });

  it("handles single value greater than 1", () => {
    const result = normalizeStrengths([5]);
    expect(result[0]).toBe(1);
  });

  it("handles single value equal to 1", () => {
    expect(normalizeStrengths([1])).toEqual([1]);
  });

  it("handles single value less than 1", () => {
    expect(normalizeStrengths([0.5])).toEqual([0.5]);
  });
});
