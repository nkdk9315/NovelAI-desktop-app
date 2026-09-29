/**
 * Character outfits and per-panel look overrides. A character card holds the
 * base look (face, hair, body) and named outfits; each outfit's tags live in
 * its own prompt target (`outfit:<id>`) so they can be picked from tag groups
 * like any other prompt. Verified on V5: the same character keeps its identity
 * across panels with different outfits or a changed hairstyle.
 */

export interface Outfit {
  id: string;
  name: string;
}

export const outfitTargetId = (outfitId: string) => `outfit:${outfitId}`;

/** A panel appearance's outfit choice: the card's current one, none, or a specific outfit. */
export type OutfitChoice = "default" | "none" | string;

export function newOutfit(name: string): Outfit {
  return { id: crypto.randomUUID(), name };
}

/** The outfit id an appearance uses (null = no outfit). */
export function resolveOutfit(
  choice: OutfitChoice | undefined, outfits: ReadonlyArray<{ id: string }>, current: string | null | undefined,
): string | null {
  const id = !choice || choice === "default" ? current : choice === "none" ? null : choice;
  return id && outfits.some((o) => o.id === id) ? id : null;
}

function isPlainTag(tag: string): boolean {
  return tag !== "" && !/[:{}[\]|]/.test(tag);
}

/** Tags of a prompt that can be switched off one by one (weighted groups are left alone). */
export function plainTags(text: string): string[] {
  return [...new Set(text.split(",").map((t) => t.trim()).filter(isPlainTag))];
}

/** The prompt without the given plain tags. */
export function withoutTags(text: string, exclude: readonly string[]): string {
  if (exclude.length === 0) return text;
  const off = new Set(exclude);
  return text.split(",").map((t) => t.trim()).filter((t) => t && !off.has(t)).join(", ");
}

export function joinPrompt(...parts: Array<string | null | undefined>): string {
  return parts.map((p) => (p ?? "").trim().replace(/^,\s*|,\s*$/g, "").trim()).filter(Boolean).join(", ");
}
