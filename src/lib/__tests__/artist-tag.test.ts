import { describe, expect, it } from "vitest";
import { balanceStrengths, buildArtistPrefix, formatArtistTag } from "../artist-tag";

describe("formatArtistTag", () => {
  it("separates a trailing digit from the closing ::", () => {
    expect(formatArtistTag({ name: "2equal8", strength: 0.9 })).toBe("{0.9::artist:2equal8 ::}");
  });

  it("returns the bare tag at strength 0", () => {
    expect(formatArtistTag({ name: "foo", strength: 0 })).toBe("artist:foo");
  });
});

describe("buildArtistPrefix", () => {
  it("is empty without tags", () => {
    expect(buildArtistPrefix([])).toBe("");
  });

  it("skips tags that are switched off", () => {
    expect(buildArtistPrefix([{ name: "a", strength: 1, enabled: false }, { name: "b", strength: 1 }]))
      .toBe("{1::artist:b ::}, ");
  });

  it("joins tags with a trailing separator", () => {
    expect(buildArtistPrefix([{ name: "a", strength: 1 }, { name: "b", strength: 0.35 }]))
      .toBe("{1::artist:a ::}, {0.35::artist:b ::}, ");
  });
});

describe("balanceStrengths", () => {
  const sum = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) * 100) / 100;

  it("keeps ratios and sums to exactly 1", () => {
    const out = balanceStrengths([1, 1, 2]);
    expect(out).toEqual([0.25, 0.25, 0.5]);
    expect(sum(out)).toBe(1);
  });

  it("absorbs rounding drift", () => {
    const out = balanceStrengths([1, 1, 1]);
    expect(out).toEqual([0.34, 0.33, 0.33]);
    expect(sum(out)).toBe(1);
  });

  it("splits evenly when all zero", () => {
    expect(balanceStrengths([0, 0])).toEqual([0.5, 0.5]);
  });
});
