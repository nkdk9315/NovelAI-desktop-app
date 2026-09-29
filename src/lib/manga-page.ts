import type { DialogueLine } from "@/lib/dialogue";
import type { SfxLine } from "@/lib/sound-effects";
import { DEFAULT_MANGA_LAYOUT, mangaLayout, type MangaLayoutId } from "@/lib/manga-layouts";

/** Manga mode: one generation = one page of panels. Stored per project. */

export type MangaColorMode = "color" | "mono";

/** A character appearing in a panel: who, what they do, and what they say. */
export interface MangaCast {
  id: string;
  /** Id of a character card (its prompt is the character's look) */
  characterId: string;
  action: string;
  dialogue: DialogueLine[];
  sfx: SfxLine[];
  effects: string[];
}

export interface MangaPanel {
  id: string;
  scene: string;
  cast: MangaCast[];
  /** Text nobody says: narration boxes, signs… */
  text: DialogueLine[];
  sfx: SfxLine[];
}

export interface MangaPage {
  enabled: boolean;
  layoutId: MangaLayoutId;
  colorMode: MangaColorMode;
  panels: MangaPanel[];
}

export function newPanel(): MangaPanel {
  return { id: crypto.randomUUID(), scene: "", cast: [], text: [], sfx: [] };
}

export function newCast(characterId: string): MangaCast {
  return { id: crypto.randomUUID(), characterId, action: "", dialogue: [], sfx: [], effects: [] };
}

export function newMangaPage(enabled = false): MangaPage {
  const layoutId = DEFAULT_MANGA_LAYOUT;
  return { enabled, layoutId, colorMode: "mono", panels: mangaLayout(layoutId).panels.map(newPanel) };
}

/** Keep the panels' contents by position and add / drop panels to match the layout. */
export function fitPanels(panels: readonly MangaPanel[], layoutId: MangaLayoutId): MangaPanel[] {
  const count = mangaLayout(layoutId).panels.length;
  return Array.from({ length: count }, (_, i) => panels[i] ?? newPanel());
}

/** Loose check for a page read from settings or a history snapshot. */
export function isMangaPage(v: unknown): v is MangaPage {
  const o = v as Record<string, unknown> | null;
  return !!o && typeof o.enabled === "boolean" && typeof o.layoutId === "string" && Array.isArray(o.panels);
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
