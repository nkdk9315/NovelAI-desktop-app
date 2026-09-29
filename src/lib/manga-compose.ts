import type { CustomBubbleStyle } from "@/lib/bubble-styles";
import { appendTargetExtras, appendTextParts, textParts, type TextPart } from "@/lib/in-image-text";
import { castCenters, mangaLayout } from "@/lib/manga-layouts";
import { bbox, centroid, hasSideBySide, isAxisAligned, shapeLabel, type Shape } from "@/lib/manga-geometry";
import { castTargetId, pageShapes, pageSize, sceneTargetId, type MangaPage } from "@/lib/manga-page";
import { joinPrompt, resolveOutfit, withoutTags } from "@/lib/outfits";

/**
 * Turn a manga page into prompts. The main prompt describes the page and each
 * panel in natural language; every character appearance in a panel becomes
 * its own character prompt placed at the panel's center, carrying its look
 * (base − switched-off tags + outfit), action, dialogue, sound effects and
 * effects (a line there is spoken by that character). Text nobody says goes
 * to the main prompt's `Text:` block. Verified on V5 with the built-in
 * layouts, custom rectangular ones described from their geometry, and slanted
 * borders drawn as an img2img template (2026-09-27 / 28).
 */

export interface MangaCharacterInput {
  id: string;
  /** "genre-female" / "genre-male" / other, for the count tag */
  genreId: string;
  /** The character card's prompt (its base look) */
  prompt: string;
  negativePrompt: string;
  outfits?: ReadonlyArray<{ id: string; prompt: string; negativePrompt: string }>;
  /** The card's current outfit (used when an appearance keeps the default) */
  outfitId?: string | null;
}

/** Text of a scene / appearance prompt target, keyed by target id. */
export type MangaTexts = Readonly<Record<string, { positive: string; negative: string }>>;

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
  /** Slanted borders can't be described in words: send the panel outlines as an img2img template */
  template: { shapes: Shape[]; width: number; height: number } | null;
}

const COLOR_TAGS = { color: "full color", mono: "monochrome, greyscale, screentone" } as const;

function tidy(text: string | undefined): string {
  return (text ?? "").trim().replace(/^,\s*|,\s*$/g, "").trim();
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

/** First sentence and tags describing the page's panel arrangement. */
function describeLayout(page: MangaPage, shapes: readonly Shape[], slanted: boolean): { description: string; tags: string } {
  if (page.layoutId !== "custom") {
    const layout = mangaLayout(page.layoutId);
    return { description: layout.description, tags: layout.tags };
  }
  const n = shapes.length;
  const description = `a manga page with ${n} panel${n > 1 ? "s" : ""}`
    + (slanted ? " separated by diagonal borders" : "")
    + (hasSideBySide(shapes) ? ", read from right to left" : "");
  return { description, tags: n > 1 ? "multiple panels" : "" };
}

function panelLabel(page: MangaPage, shape: Shape, i: number, width: number, height: number): string {
  if (page.layoutId !== "custom") return mangaLayout(page.layoutId).panels[i]?.label ?? "";
  return shapeLabel(shape, width, height);
}

export function composeMangaPage(
  page: MangaPage,
  userMain: string,
  characters: readonly MangaCharacterInput[],
  customs: readonly CustomBubbleStyle[] = [],
  texts: MangaTexts = {},
): ComposedMangaPage {
  const shapes = pageShapes(page);
  const { width, height } = pageSize(page);
  const slanted = page.layoutId === "custom" && !shapes.every(isAxisAligned);
  const layout = describeLayout(page, shapes, slanted);
  const byId = new Map(characters.map((c) => [c.id, c]));
  const onPage = [...new Set(page.panels.flatMap((p) => p.cast.map((c) => c.characterId)))]
    .map((id) => byId.get(id))
    .filter((c): c is MangaCharacterInput => c != null);

  const composed: ComposedCharacter[] = [];
  const panelParts: TextPart[] = [];
  const sentences = [`${sentenceStart(layout.description)}.`];

  shapes.forEach((shape, i) => {
    const panel = page.panels[i];
    const n = i + 1;
    const cast = (panel?.cast ?? []).filter((c) => byId.has(c.characterId));
    const b = bbox(shape);
    const cy = centroid(shape).y;
    const centers = castCenters(b, cast.length).map((p) => ({ ...p, y: Math.round(cy * 1000) / 1000 }));
    const bits: string[] = [];
    const scene = panel ? texts[sceneTargetId(panel.id)] : undefined;
    const sceneText = tidy(scene ? scene.positive : panel?.scene);
    if (sceneText) bits.push(sceneText);
    cast.forEach((c, ci) => {
      const ch = byId.get(c.characterId)!;
      const own = texts[castTargetId(c.id)];
      const action = tidy(own ? own.positive : c.action);
      const base = withoutTags(ch.prompt, c.excludeTags ?? []);
      const outfitId = resolveOutfit(c.outfitId, ch.outfits ?? [], ch.outfitId);
      const outfit = ch.outfits?.find((o) => o.id === outfitId);
      bits.push(action ? `${castHandle(base)} is ${action}` : castHandle(base));
      composed.push({
        characterId: ch.id,
        panel: n,
        prompt: appendTargetExtras(
          joinPrompt(base, outfit?.prompt, `panel ${n}`, action),
          { dialogue: c.dialogue, sfx: c.sfx, effects: c.effects },
          customs,
        ),
        centerX: centers[ci].x,
        centerY: centers[ci].y,
        negativePrompt: joinPrompt(ch.negativePrompt, outfit?.negativePrompt, own?.negative),
      });
    });
    // Unspoken text of this panel: its phrase is tied to the panel in the page description
    const parts = textParts({ dialogue: panel?.text, sfx: panel?.sfx }, customs)
      .map((p) => ({ ...p, phrase: `${p.phrase} in panel ${n}` }));
    panelParts.push(...parts);
    const label = panelLabel(page, shape, i, width, height);
    sentences.push(`Panel ${n}${label ? ` (${label})` : ""}${bits.length ? `: ${bits.join("; ")}` : ""}.`);
  });

  const head = [
    tidy(userMain), "comic, manga", COLOR_TAGS[page.colorMode], "black panel borders", layout.tags,
    ...castCountTags(onPage),
  ].filter(Boolean).join(", ");
  return {
    main: appendTextParts(`${head}. ${sentences.join(" ")}`, panelParts),
    characters: composed,
    template: slanted ? { shapes, width, height } : null,
  };
}
