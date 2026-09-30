/**
 * What a sprite cell adds to the request for the background and for keeping
 * text out. Verified 2026-09-30 (V4.5 / V5, 0 Anlas):
 * - V5 `transparent background` gives real alpha, and inpainting a transparent
 *   base keeps it — the whole chain stays transparent.
 * - V4.5 cannot: its `transparent background` draws plain white, the same as
 *   `simple background, white background`, which the export then removes.
 * - A green (chroma) background tints hair and edges; white is used instead.
 * - Unrequested text is rare, but hit / tired poses draw motion lines, breath
 *   puffs, impact bursts and "!" marks; the negative tags below cut them down
 *   (V4.5 3/3 → 1/3 images with marks).
 */
import { isV5Model } from "@/lib/constants";
import type { SpriteSpec } from "./spec";

export const WHITE_BACKGROUND_TAGS = "simple background, white background";

export const NO_TEXT_NEGATIVE =
  "text, english text, japanese text, speech bubble, onomatopoeia, sound effects, signature, artist name, "
  + "watermark, logo, username, character name, motion lines, speed lines, emphasis lines";

export interface SpriteRequestExtras {
  /** Appended to the cell's prompt */
  positive: string;
  /** Appended to the cell's negative prompt */
  negative: string;
  /** V5 transparent generation */
  transparent: boolean;
  /** Leave the prompt boxes' dialogue / sound effects out and always send `no text` */
  plain: boolean;
}

export function spriteRequestExtras(spec: Pick<SpriteSpec, "background" | "noText">, model: string): SpriteRequestExtras {
  const nativeAlpha = spec.background === "transparent" && isV5Model(model);
  return {
    positive: spec.background === "asis" || nativeAlpha ? "" : WHITE_BACKGROUND_TAGS,
    negative: spec.noText ? NO_TEXT_NEGATIVE : "",
    transparent: nativeAlpha,
    plain: spec.noText,
  };
}
