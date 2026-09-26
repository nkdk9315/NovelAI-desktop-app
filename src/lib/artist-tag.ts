import type { ArtistTag } from "@/types";

/**
 * Format one artist tag for the prompt.
 *
 * A space is always inserted before the closing `::`. Without it, a name that
 * ends in a digit (e.g. `2equal8`) runs into the delimiter as `8::`, which
 * NovelAI parses as the start of a new strength block and garbles the prompt.
 */
export function formatArtistTag(tag: ArtistTag): string {
  const base = `artist:${tag.name}`;
  return tag.strength === 0 ? base : `{${tag.strength}::${base} ::}`;
}

export const isArtistTagOn = (tag: ArtistTag): boolean => tag.enabled !== false;

/** Comma-joined enabled artist tags followed by `", "`, or `""` when there are none. */
export function buildArtistPrefix(tags: ArtistTag[]): string {
  const on = tags.filter(isArtistTagOn);
  return on.length > 0 ? on.map(formatArtistTag).join(", ") + ", " : "";
}

/**
 * Rescale strengths so they sum to exactly 1.00 (two decimals). Rounding drift
 * is absorbed by the largest entry. All-zero input is split evenly.
 */
export function balanceStrengths(values: number[]): number[] {
  if (values.length === 0) return [];
  const sum = values.reduce((a, b) => a + b, 0);
  const raw = sum > 0 ? values.map((v) => v / sum) : values.map(() => 1 / values.length);
  const cents = raw.map((v) => Math.round(v * 100));
  const drift = 100 - cents.reduce((a, b) => a + b, 0);
  if (drift !== 0) {
    const maxIdx = cents.indexOf(Math.max(...cents));
    cents[maxIdx] += drift;
  }
  return cents.map((c) => c / 100);
}
