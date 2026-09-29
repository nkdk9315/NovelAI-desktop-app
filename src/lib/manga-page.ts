import type { DialogueLine } from "@/lib/dialogue";
import type { SfxLine } from "@/lib/sound-effects";
import type { OutfitChoice } from "@/lib/outfits";
import { readingOrder, rectShape, type Shape } from "@/lib/manga-geometry";
import {
  DEFAULT_MANGA_LAYOUT, PAGE_ASPECTS, isMangaLayoutId, layoutShapes, mangaLayout,
  type MangaLayoutId, type PageAspectId,
} from "@/lib/manga-layouts";

/** Manga mode: one generation = one page of panels. Stored per project. */

export type MangaColorMode = "color" | "mono";

/**
 * A character appearing in a panel. Its action / expression / extra tags are
 * a prompt target (`castTargetId`), so tag groups work there too.
 */
export interface MangaCast {
  id: string;
  /** Id of a character card (its prompt is the character's base look) */
  characterId: string;
  /** Outfit for this panel (missing = the card's current outfit) */
  outfitId?: OutfitChoice;
  /** Base-look tags switched off in this panel (e.g. "long hair" when tied up) */
  excludeTags?: string[];
  dialogue: DialogueLine[];
  sfx: SfxLine[];
  effects: string[];
  /** Legacy plain-text action (before prompt targets); used when the target doesn't exist */
  action?: string;
}

export interface MangaPanel {
  id: string;
  /** Outline for a custom layout (0–1 page coordinates); built-in layouts use their own rectangles */
  shape?: Shape;
  cast: MangaCast[];
  /** Text nobody says: narration boxes, signs… */
  text: DialogueLine[];
  sfx: SfxLine[];
  /** Legacy plain-text scene (before prompt targets); used when the target doesn't exist */
  scene?: string;
}

export interface MangaPage {
  enabled: boolean;
  /** A built-in layout, or "custom" (panels carry their own shapes) */
  layoutId: MangaLayoutId | "custom";
  /** Page shape of a custom layout */
  aspect?: PageAspectId;
  colorMode: MangaColorMode;
  panels: MangaPanel[];
}

export const sceneTargetId = (panelId: string) => `manga-scene:${panelId}`;
export const castTargetId = (castId: string) => `manga-cast:${castId}`;

export function newPanel(shape?: Shape): MangaPanel {
  return { id: crypto.randomUUID(), cast: [], text: [], sfx: [], ...(shape ? { shape } : {}) };
}

export function newCast(characterId: string): MangaCast {
  return { id: crypto.randomUUID(), characterId, dialogue: [], sfx: [], effects: [] };
}

export function newMangaPage(enabled = false): MangaPage {
  const layoutId = DEFAULT_MANGA_LAYOUT;
  return { enabled, layoutId, colorMode: "mono", panels: mangaLayout(layoutId).panels.map(() => newPanel()) };
}

/** Keep the panels' contents by position and add / drop panels to match a built-in layout. */
export function fitPanels(panels: readonly MangaPanel[], layoutId: MangaLayoutId): MangaPanel[] {
  const count = mangaLayout(layoutId).panels.length;
  return Array.from({ length: count }, (_, i) => {
    const p = panels[i];
    if (!p) return newPanel();
    // Built-in layouts use their own rectangles
    return { ...p, shape: undefined };
  });
}

/**
 * Switch to a custom layout: shapes are put in reading order and the existing
 * panels' contents are kept by position (like picking another built-in layout).
 */
export function withCustomLayout(page: MangaPage, shapes: readonly Shape[], aspect: PageAspectId): MangaPage {
  const ordered = readingOrder(shapes).map((i) => shapes[i]);
  return {
    ...page,
    layoutId: "custom",
    aspect,
    panels: ordered.map((shape, i) => (page.panels[i] ? { ...page.panels[i], shape } : newPanel(shape))),
  };
}

/** Outline of every panel, in the page's reading order. */
export function pageShapes(page: MangaPage): Shape[] {
  if (page.layoutId !== "custom") return layoutShapes(page.layoutId);
  return page.panels.map((p) => p.shape ?? rectShape(0, 0, 1, 1));
}

export function pageSize(page: MangaPage): { width: number; height: number } {
  if (page.layoutId === "custom") return PAGE_ASPECTS[page.aspect ?? "portrait"];
  const { width, height } = mangaLayout(page.layoutId);
  return { width, height };
}

/** Prompt targets owned by these panels (scene + each appearance). */
export function panelTargetIds(panels: readonly MangaPanel[]): string[] {
  return panels.flatMap((p) => [sceneTargetId(p.id), ...p.cast.map((c) => castTargetId(c.id))]);
}

/** Loose check for a page read from settings or a history snapshot. */
export function isMangaPage(v: unknown): v is MangaPage {
  const o = v as Record<string, unknown> | null;
  return !!o && typeof o.enabled === "boolean" && Array.isArray(o.panels)
    && (o.layoutId === "custom" || (typeof o.layoutId === "string" && isMangaLayoutId(o.layoutId)));
}

function everyCast(page: MangaPage): MangaCast[] {
  return page.panels.flatMap((p) => p.cast);
}

/** Whether the page has any written sound effect (panel-level or spoken by a character). */
export function mangaHasSfx(page: MangaPage): boolean {
  return page.panels.some((p) => p.sfx.some((s) => s.text.trim()))
    || everyCast(page).some((c) => c.sfx.some((s) => s.text.trim()));
}

/** Whether the page draws any text at all. */
export function mangaDrawsText(page: MangaPage): boolean {
  return mangaHasSfx(page)
    || page.panels.some((p) => p.text.some((l) => l.text.trim()))
    || everyCast(page).some((c) => c.dialogue.some((l) => l.text.trim()));
}

/** Replace the item with `id` by `{...item, ...partial}` (for dialogue / sound-effect lists). */
export function patchById<T extends { id: string }>(list: readonly T[], id: string, partial: Partial<NoInfer<T>>): T[] {
  return list.map((item) => (item.id === id ? { ...item, ...partial } : item));
}

export function withoutId<T extends { id: string }>(list: readonly T[], id: string): T[] {
  return list.filter((item) => item.id !== id);
}
