/**
 * Page layouts for manga mode. Panels are listed in Japanese reading order
 * (right to left, top to bottom) with their rectangle in 0–1 page
 * coordinates, used to place each character inside its panel. Every layout
 * was checked on V5 (2026-09-27): panel count, arrangement and reading order
 * were followed in all test images.
 */

export interface PanelRect { x0: number; y0: number; x1: number; y1: number }

export interface MangaLayout {
  /** Tags describing the page */
  tags: string;
  /** Natural-language description of the arrangement (first sentence of the page) */
  description: string;
  panels: ReadonlyArray<{ label: string; rect: PanelRect }>;
  /** Page size (within the Opus free tier) */
  width: number;
  height: number;
}

const r = (x0: number, y0: number, x1: number, y1: number): PanelRect => ({ x0, y0, x1, y1 });

export const MANGA_LAYOUTS = {
  koma4: {
    tags: "4koma, four stacked panels",
    description: "a vertical 4koma comic strip with four equal panels stacked from top to bottom",
    panels: [
      { label: "top", rect: r(0, 0, 1, 0.25) }, { label: "second", rect: r(0, 0.25, 1, 0.5) },
      { label: "third", rect: r(0, 0.5, 1, 0.75) }, { label: "bottom", rect: r(0, 0.75, 1, 1) },
    ],
    width: 640, height: 1600,
  },
  two: {
    tags: "multiple panels",
    description: "a manga page with two wide panels stacked vertically",
    panels: [{ label: "top", rect: r(0, 0, 1, 0.5) }, { label: "bottom", rect: r(0, 0.5, 1, 1) }],
    width: 832, height: 1216,
  },
  three: {
    tags: "multiple panels",
    description: "a manga page with a wide panel across the top and two panels side by side at the bottom, read from right to left",
    panels: [
      { label: "top", rect: r(0, 0, 1, 0.45) }, { label: "bottom right", rect: r(0.5, 0.45, 1, 1) },
      { label: "bottom left", rect: r(0, 0.45, 0.5, 1) },
    ],
    width: 832, height: 1216,
  },
  tall: {
    tags: "multiple panels",
    description: "a manga page with one tall panel on the right side and two panels stacked on the left side, read from right to left",
    panels: [
      { label: "tall right", rect: r(0.45, 0, 1, 1) }, { label: "top left", rect: r(0, 0, 0.45, 0.5) },
      { label: "bottom left", rect: r(0, 0.5, 0.45, 1) },
    ],
    width: 832, height: 1216,
  },
  grid: {
    tags: "multiple panels",
    description: "a manga page with four equal panels in a 2x2 grid, read from right to left, top to bottom",
    panels: [
      { label: "top right", rect: r(0.5, 0, 1, 0.5) }, { label: "top left", rect: r(0, 0, 0.5, 0.5) },
      { label: "bottom right", rect: r(0.5, 0.5, 1, 1) }, { label: "bottom left", rect: r(0, 0.5, 0.5, 1) },
    ],
    width: 1024, height: 1024,
  },
} as const satisfies Record<string, MangaLayout>;

export type MangaLayoutId = keyof typeof MANGA_LAYOUTS;
export const MANGA_LAYOUT_IDS = Object.keys(MANGA_LAYOUTS) as MangaLayoutId[];
export const DEFAULT_MANGA_LAYOUT: MangaLayoutId = "koma4";

export function isMangaLayoutId(id: string): id is MangaLayoutId {
  return Object.prototype.hasOwnProperty.call(MANGA_LAYOUTS, id);
}

export function mangaLayout(id: string): MangaLayout {
  return MANGA_LAYOUTS[isMangaLayoutId(id) ? id : DEFAULT_MANGA_LAYOUT];
}

/** Centers for `count` characters spread across a panel (left to right, vertically centered). */
export function castCenters(rect: PanelRect, count: number): Array<{ x: number; y: number }> {
  const round = (v: number) => Math.round(v * 1000) / 1000;
  return Array.from({ length: count }, (_, i) => ({
    x: round(rect.x0 + ((rect.x1 - rect.x0) * (i + 1)) / (count + 1)),
    y: round((rect.y0 + rect.y1) / 2),
  }));
}
