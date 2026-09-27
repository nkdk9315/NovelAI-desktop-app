/**
 * Kinds of dialogue / text a line can be drawn as (speech bubble shapes,
 * narration boxes, sound effects…). Each kind adds Danbooru tags plus a
 * natural-language phrase bound to its own text, e.g.
 * `"待てーっ！" in a large spiky jagged speech bubble, shouting` — so lines
 * of different kinds in one prompt keep their own shape.
 * Every phrase below was checked on V5 (2026-09-27).
 */

/** Icon drawn in the picker; custom kinds pick one of these too. */
export type BubbleShape =
  | "round" | "spiky" | "jagged" | "wavy" | "dashed" | "cloud" | "rect" | "flash"
  | "electric" | "dark" | "square" | "heart" | "sfx" | "handwritten" | "plain"
  | "window" | "rpg" | "chat" | "subtitle" | "telop" | "hud";

export const BUBBLE_SHAPES: readonly BubbleShape[] = [
  "round", "spiky", "jagged", "wavy", "dashed", "cloud", "rect", "flash",
  "electric", "dark", "square", "heart", "sfx", "handwritten", "plain",
  "window", "rpg", "chat", "subtitle", "telop", "hud",
];

/** Picker section: manga lettering, or text shown on a game / video screen */
export type BubbleStyleGroup = "manga" | "screen";

export interface BubbleStyleDef {
  shape: BubbleShape;
  tags: string[];
  phrase: string;
  group?: BubbleStyleGroup;
}

export const BUILTIN_BUBBLE_STYLES = {
  speech: { shape: "round", tags: ["speech bubble"], phrase: "in a round speech bubble" },
  shout: { shape: "spiky", tags: ["speech bubble", "shouting"], phrase: "in a large spiky jagged speech bubble, shouting" },
  surprise: {
    shape: "jagged", tags: ["speech bubble"], phrase: "in a slightly jagged speech bubble with small spikes, surprised",
  },
  weak: {
    shape: "wavy", tags: ["speech bubble"], phrase: "in a speech bubble with a thin wavy trembling outline, weak voice",
  },
  whisper: {
    shape: "dashed", tags: ["speech bubble", "whispering"], phrase: "in a speech bubble with a dashed outline, whispering",
  },
  thought: { shape: "cloud", tags: ["thought bubble"], phrase: "in a cloud-shaped thought bubble" },
  narration: { shape: "rect", tags: [], phrase: "in a rectangular narration caption box" },
  flash: { shape: "flash", tags: [], phrase: "surrounded by spiky radiating flash lines, dramatic inner monologue" },
  electronic: {
    shape: "electric", tags: ["speech bubble"],
    phrase: "in a speech bubble with a zigzag lightning-shaped tail, voice from a phone",
  },
  dark: { shape: "dark", tags: ["speech bubble"], phrase: "in a black speech bubble with white text" },
  // "robotic voice" turned the speaker into a robot, so only the shape is described
  square: { shape: "square", tags: ["speech bubble"], phrase: "in a rectangular speech bubble with sharp corners" },
  heart: { shape: "heart", tags: ["speech bubble"], phrase: "in a heart-shaped speech bubble" },
  sfx: { shape: "sfx", tags: ["sound effects"], phrase: "as a large stylized hand-drawn sound effect without a bubble" },
  handwritten: { shape: "handwritten", tags: [], phrase: "as small handwritten text" },
  plain: { shape: "plain", tags: [], phrase: "as plain text" },
  // Game / video screens (best placed in the main prompt: they frame the whole picture)
  gameWindow: {
    shape: "window", tags: [], group: "screen",
    phrase: "in a visual novel style message window at the bottom of the screen",
  },
  rpgWindow: {
    shape: "rpg", tags: [], group: "screen",
    phrase: "in a retro RPG dialogue box with a white border on a black background",
  },
  chat: {
    shape: "chat", tags: [], group: "screen",
    phrase: "in a large chat app message bubble overlaid on the image like a smartphone screen, big readable text",
  },
  subtitle: { shape: "subtitle", tags: [], group: "screen", phrase: "as movie subtitles at the bottom of the image" },
  telop: { shape: "telop", tags: [], group: "screen", phrase: "as a colorful TV variety show caption with a thick outline" },
  hologram: {
    shape: "hud", tags: [], group: "screen",
    phrase: "in a large glowing holographic sci-fi warning window floating in the air, big readable text",
  },
} as const satisfies Record<string, BubbleStyleDef>;

export type BuiltinBubbleStyle = keyof typeof BUILTIN_BUBBLE_STYLES;
/** A built-in kind, or `custom:<id>` for a user-registered one. */
export type BubbleStyleId = BuiltinBubbleStyle | `custom:${string}`;

export const BUILTIN_BUBBLE_STYLE_IDS = Object.keys(BUILTIN_BUBBLE_STYLES) as BuiltinBubbleStyle[];

export function bubbleStyleGroup(id: BuiltinBubbleStyle): BubbleStyleGroup {
  const def: BubbleStyleDef = BUILTIN_BUBBLE_STYLES[id];
  return def.group ?? "manga";
}
export const DEFAULT_BUBBLE_STYLE: BuiltinBubbleStyle = "speech";

export interface CustomBubbleStyle {
  id: string;
  name: string;
  shape: BubbleShape;
  /** Natural-language description placed after the quoted text, e.g. "in a star-shaped speech bubble" */
  phrase: string;
  /** Comma-separated tags (optional) */
  tags: string;
}

export const customBubbleStyleId = (id: string): BubbleStyleId => `custom:${id}`;

export function isBuiltinBubbleStyle(id: string): id is BuiltinBubbleStyle {
  return Object.prototype.hasOwnProperty.call(BUILTIN_BUBBLE_STYLES, id);
}

/** Definition of a kind; unknown ids (e.g. a deleted custom kind) fall back to the normal speech bubble. */
export function resolveBubbleStyle(id: string, customs: readonly CustomBubbleStyle[]): BubbleStyleDef {
  if (isBuiltinBubbleStyle(id)) return BUILTIN_BUBBLE_STYLES[id];
  const custom = customs.find((c) => customBubbleStyleId(c.id) === id);
  if (!custom) return BUILTIN_BUBBLE_STYLES[DEFAULT_BUBBLE_STYLE];
  return {
    shape: custom.shape,
    tags: custom.tags.split(",").map((t) => t.trim()).filter(Boolean),
    phrase: custom.phrase.trim(),
  };
}

/** Display name (`t` is the i18n translate function). */
export function bubbleStyleLabel(
  id: string, customs: readonly CustomBubbleStyle[], t: (key: string) => string,
): string {
  if (isBuiltinBubbleStyle(id)) return t(`dialogue.style.${id}`);
  return customs.find((c) => customBubbleStyleId(c.id) === id)?.name ?? t(`dialogue.style.${DEFAULT_BUBBLE_STYLE}`);
}
