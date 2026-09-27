/**
 * Manga effect symbols and lines (sweat drops, anger veins, emphasis lines…),
 * added as plain tags. Checked on V5 (2026-09-27): symbols in a character
 * prompt stay on that character; lines and backgrounds only work in the main
 * prompt. `unreliable` ones appeared in about half of the images.
 */

export type EffectScope = "character" | "main";

export interface MangaEffectDef {
  tags: string;
  scope: EffectScope;
  unreliable?: boolean;
}

export const MANGA_EFFECTS = {
  sweat: { tags: "sweatdrop", scope: "character" },
  flyingSweat: { tags: "flying sweatdrops", scope: "character", unreliable: true },
  anger: { tags: "anger vein", scope: "character" },
  heart: { tags: "1.5::spoken heart::", scope: "character" },
  sparkle: { tags: "1.5::sparkle::", scope: "character" },
  pale: { tags: "turn pale, shaded face", scope: "character" },
  sigh: { tags: "sigh, puff of air", scope: "character" },
  exclamation: { tags: "1.5::spoken exclamation mark::", scope: "character", unreliable: true },
  question: { tags: "1.5::spoken question mark::", scope: "character", unreliable: true },
  note: { tags: "1.5::spoken musical note::", scope: "character", unreliable: true },
  emphasisLines: { tags: "emphasis lines", scope: "main" },
  speedLines: { tags: "speed lines, motion lines", scope: "main" },
  flowers: { tags: "flower background, sparkle background", scope: "main" },
} as const satisfies Record<string, MangaEffectDef>;

export type MangaEffectId = keyof typeof MANGA_EFFECTS;

export const MANGA_EFFECT_IDS = Object.keys(MANGA_EFFECTS) as MangaEffectId[];

export function isMangaEffectId(id: string): id is MangaEffectId {
  return Object.prototype.hasOwnProperty.call(MANGA_EFFECTS, id);
}

export function effectsForScope(scope: EffectScope): MangaEffectId[] {
  return MANGA_EFFECT_IDS.filter((id) => MANGA_EFFECTS[id].scope === scope);
}

export function isUnreliableEffect(id: MangaEffectId): boolean {
  const def: MangaEffectDef = MANGA_EFFECTS[id];
  return def.unreliable === true;
}

/** Tags of the enabled effects (unknown ids are ignored), in the palette's order. */
export function effectTags(ids: readonly string[] | undefined): string[] {
  const on = new Set(ids ?? []);
  return MANGA_EFFECT_IDS.filter((id) => on.has(id)).map((id) => MANGA_EFFECTS[id].tags);
}
