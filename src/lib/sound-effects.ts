import type { TextPart } from "@/lib/in-image-text";

/**
 * Written sound effects (onomatopoeia such as ブンッ / チョロロロ). Like
 * dialogue they are drawn from the `Text:` block, each bound to a phrase that
 * sets its texture and size. Checked on V5 (2026-09-27): in a character prompt
 * the effect lands next to that character's action; "small"/"thin" effects
 * tend to vanish, so the sizes are medium (clearly visible) and huge only.
 */

export type SfxTexture = "standard" | "impact" | "sharp" | "light" | "liquid" | "ominous" | "silence";
export type SfxSize = "medium" | "large";

export const SFX_TEXTURES: readonly SfxTexture[] = [
  "standard", "impact", "sharp", "light", "liquid", "ominous", "silence",
];
export const SFX_SIZES: readonly SfxSize[] = ["medium", "large"];

/** Tag that makes the model add fitting sound effects on its own (verified: 4/4 on action scenes). */
export const SFX_TAG = "sound effects";

const SIZE_WORDS: Record<SfxSize, string> = {
  medium: "medium-sized clearly visible",
  large: "huge",
};

const TEXTURE_PHRASES: Record<SfxTexture, (size: string) => string> = {
  standard: (s) => `as a ${s} hand-drawn sound effect`,
  impact: (s) => `as a ${s} heavy bold impactful hand-drawn sound effect with a jagged outline`,
  sharp: (s) => `as a ${s} sharp slanted hand-drawn sound effect with speed lines`,
  light: (s) => `as a ${s} light casual hand-drawn sound effect`,
  liquid: (s) => `as a ${s} soft wavy hand-drawn sound effect`,
  // Already fills the background; the verified phrase has no size
  ominous: () => "as repeated ominous heavy hand-drawn sound effects in the background",
  silence: (s) => `as a ${s} quiet hand-drawn sound effect written in the empty space`,
};

export interface SfxLine {
  id: string;
  text: string;
  texture: SfxTexture;
  size: SfxSize;
}

export function newSfxLine(text = "", texture: SfxTexture = "standard"): SfxLine {
  return { id: crypto.randomUUID(), text, texture, size: "medium" };
}

/** Everyday onomatopoeia grouped by scene, each with the texture that suits it. */
export const SFX_PRESETS: ReadonlyArray<{ category: string; items: ReadonlyArray<{ text: string; texture: SfxTexture }> }> = [
  { category: "motion", items: [
    { text: "ブンッ", texture: "sharp" }, { text: "シュッ", texture: "sharp" },
    { text: "ビュンッ", texture: "sharp" }, { text: "サッ", texture: "light" },
  ] },
  { category: "impact", items: [
    { text: "ドカッ", texture: "impact" }, { text: "バキッ", texture: "impact" },
    { text: "ドーン", texture: "impact" }, { text: "ガシャーン", texture: "impact" },
  ] },
  { category: "miss", items: [{ text: "スカッ", texture: "light" }, { text: "ズコー", texture: "impact" }] },
  { category: "liquid", items: [
    { text: "チョロロロ", texture: "liquid" }, { text: "ポチャン", texture: "liquid" },
    { text: "ザーッ", texture: "liquid" }, { text: "ゴクゴク", texture: "liquid" },
  ] },
  { category: "mind", items: [
    { text: "ドキッ", texture: "standard" }, { text: "ギクッ", texture: "standard" },
    { text: "ガーン", texture: "impact" }, { text: "ゴゴゴゴ", texture: "ominous" }, { text: "シーン", texture: "silence" },
  ] },
  { category: "daily", items: [
    { text: "ガチャ", texture: "light" }, { text: "コンコン", texture: "light" },
    { text: "パタパタ", texture: "standard" }, { text: "モグモグ", texture: "light" },
  ] },
];

function isTexture(v: string): v is SfxTexture {
  return (SFX_TEXTURES as readonly string[]).includes(v);
}

/** Sound effects that will be sent (single line, non-empty). */
export function activeSfx(lines: readonly SfxLine[] | undefined): SfxLine[] {
  return (lines ?? [])
    .map((l) => ({ ...l, text: l.text.replace(/\s+/g, " ").trim() }))
    .filter((l) => l.text);
}

/** `"ブンッ" as a huge sharp slanted hand-drawn sound effect…` for each effect. */
export function sfxParts(lines: readonly SfxLine[] | undefined): TextPart[] {
  return activeSfx(lines).map((l) => {
    const texture = isTexture(l.texture) ? l.texture : "standard";
    return { text: l.text, tags: [SFX_TAG], phrase: TEXTURE_PHRASES[texture](SIZE_WORDS[l.size] ?? SIZE_WORDS.medium) };
  });
}
