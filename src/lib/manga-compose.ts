import type { CustomBubbleStyle } from "@/lib/bubble-styles";
import { appendTargetExtras, appendTextParts, textParts, type TextPart } from "@/lib/in-image-text";
import { castCenters, mangaLayout } from "@/lib/manga-layouts";
import type { MangaPage } from "@/lib/manga-page";

/**
 * Turn a manga page into prompts. The main prompt describes the page and each
 * panel in natural language; every character appearance in a panel becomes
 * its own character prompt placed at the panel's center, carrying its action,
 * dialogue, sound effects and effects (a line there is spoken by that
 * character). Text nobody says goes to the main prompt's `Text:` block.
 * Verified on V5 with every layout (2026-09-27).
 */

export interface MangaCharacterInput {
  id: string;
  /** "genre-female" / "genre-male" / other, for the count tag */
  genreId: string;
  /** The character card's prompt (its look) */
  prompt: string;
  negativePrompt: string;
}

export interface ComposedCharacter {
  characterId: string;
  /** 1-based panel number */
  panel: number;
  prompt: string;
  centerX: number;
  centerY: number;
  negativePrompt: string;
}

export interface ComposedMangaPage {
  /** Main prompt before quality tags (user's own main text first) */
  main: string;
  characters: ComposedCharacter[];
}

const COLOR_TAGS = { color: "full color", mono: "monochrome, greyscale, screentone" } as const;

function tidy(text: string): string {
  return text.trim().replace(/^,\s*|,\s*$/g, "").trim();
}

/** `2girls, 1boy`-style count of the distinct characters on the page. */
export function castCountTags(characters: readonly MangaCharacterInput[]): string[] {
  const girls = characters.filter((c) => c.genreId === "genre-female").length;
  const boys = characters.filter((c) => c.genreId === "genre-male").length;
  const others = characters.length - girls - boys;
  return [
    girls ? `${girls}girl${girls > 1 ? "s" : ""}` : "",
    boys ? `${boys}boy${boys > 1 ? "s" : ""}` : "",
    others ? `${others}other${others > 1 ? "s" : ""}` : "",
  ].filter(Boolean);
}

/** "a girl with blonde hair, twintails" — a short handle for a character in the page description. */
export function castHandle(prompt: string): string {
  const tags = prompt.split(",").map((t) => t.trim()).filter((t) => t && !t.includes("::"));
  if (tags.length === 0) return "a character";
  const [head, ...rest] = tags;
  return rest.length ? `a ${head} with ${rest.slice(0, 2).join(", ")}` : `a ${head}`;
}

function sentenceStart(text: string): string {
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}

export function composeMangaPage(
  page: MangaPage,
  userMain: string,
  characters: readonly MangaCharacterInput[],
  customs: readonly CustomBubbleStyle[] = [],
): ComposedMangaPage {
  const layout = mangaLayout(page.layoutId);
  const byId = new Map(characters.map((c) => [c.id, c]));
  const onPage = [...new Set(page.panels.flatMap((p) => p.cast.map((c) => c.characterId)))]
    .map((id) => byId.get(id))
    .filter((c): c is MangaCharacterInput => c != null);

  const composed: ComposedCharacter[] = [];
  const panelParts: TextPart[] = [];
  const sentences = [`${sentenceStart(layout.description)}.`];

  layout.panels.forEach(({ label, rect }, i) => {
    const panel = page.panels[i];
    const n = i + 1;
    const cast = (panel?.cast ?? []).filter((c) => byId.has(c.characterId));
    const centers = castCenters(rect, cast.length);
    const bits: string[] = [];
    if (panel?.scene.trim()) bits.push(tidy(panel.scene));
    cast.forEach((c, ci) => {
      const ch = byId.get(c.characterId)!;
      const action = tidy(c.action);
      bits.push(action ? `${castHandle(ch.prompt)} is ${action}` : castHandle(ch.prompt));
      const own = [tidy(ch.prompt), `panel ${n}`, action].filter(Boolean).join(", ");
      composed.push({
        characterId: ch.id,
        panel: n,
        prompt: appendTargetExtras(own, { dialogue: c.dialogue, sfx: c.sfx, effects: c.effects }, customs),
        centerX: centers[ci].x,
        centerY: centers[ci].y,
        negativePrompt: ch.negativePrompt,
      });
    });
    // Unspoken text of this panel: its phrase is tied to the panel in the page description
    const parts = textParts({ dialogue: panel?.text, sfx: panel?.sfx }, customs)
      .map((p) => ({ ...p, phrase: `${p.phrase} in panel ${n}` }));
    panelParts.push(...parts);
    sentences.push(`Panel ${n} (${label})${bits.length ? `: ${bits.join("; ")}` : ""}.`);
  });

  const head = [
    tidy(userMain), "comic, manga", COLOR_TAGS[page.colorMode], "black panel borders", layout.tags,
    ...castCountTags(onPage),
  ].filter(Boolean).join(", ");
  return { main: appendTextParts(`${head}. ${sentences.join(" ")}`, panelParts), characters: composed };
}
