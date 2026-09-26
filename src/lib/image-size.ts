import { DIMENSION_STEP, MAX_DIMENSION, MAX_TOTAL_PIXELS, MIN_DIMENSION } from "@/lib/constants";

export interface Size {
  width: number;
  height: number;
}

const snap = (v: number) =>
  Math.min(MAX_DIMENSION, Math.max(MIN_DIMENSION, Math.round(v / DIMENSION_STEP) * DIMENSION_STEP));

/**
 * Closest generation size for an image: multiples of 64, each side 64–2048,
 * at most MAX_TOTAL_PIXELS, keeping the aspect ratio as well as possible.
 */
export function fitGenerationSize(width: number, height: number): Size {
  if (width <= 0 || height <= 0) return { width: MIN_DIMENSION, height: MIN_DIMENSION };
  const scale = Math.min(
    1,
    Math.sqrt(MAX_TOTAL_PIXELS / (width * height)),
    MAX_DIMENSION / width,
    MAX_DIMENSION / height,
  );
  let w = snap(width * scale);
  let h = snap(height * scale);
  // Rounding up may overshoot the pixel budget: shrink the longer side.
  while (w * h > MAX_TOTAL_PIXELS) {
    if (w >= h) w -= DIMENSION_STEP;
    else h -= DIMENSION_STEP;
  }
  return { width: w, height: h };
}

/** Output size for Enhance: the image enlarged by `magnitude`, fitted to the limits. */
export function enhanceSize(width: number, height: number, magnitude: number): Size {
  return fitGenerationSize(width * magnitude, height * magnitude);
}
