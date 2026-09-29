/**
 * Typesetting (写植): exact text drawn over an image in the app, as a
 * fallback for text the model gets wrong. Boxes live in 0–1 image
 * coordinates so they survive any preview scale; the layout helpers here are
 * pure (canvas drawing is in `typeset-render.ts`).
 */

export type TypesetFont = "gothic" | "mincho" | "maru";
export type TypesetFrame = "none" | "round" | "rect" | "spiky" | "cloud";

export const TYPESET_FONTS: readonly TypesetFont[] = ["gothic", "mincho", "maru"];
export const TYPESET_FRAMES: readonly TypesetFrame[] = ["none", "round", "rect", "spiky", "cloud"];
/** Frames that can point at a speaker */
export const FRAMES_WITH_TAIL: readonly TypesetFrame[] = ["round", "spiky", "cloud"];

export interface TypesetBox {
  id: string;
  text: string;
  /** Center, 0–1 of the image */
  x: number;
  y: number;
  /** Font size as a fraction of the image width */
  size: number;
  vertical: boolean;
  font: TypesetFont;
  bold: boolean;
  color: string;
  /** White outline around the letters (readable on busy art) */
  outline: boolean;
  frame: TypesetFrame;
  /** Tail tip, 0–1 of the image (null = no tail) */
  tail: { x: number; y: number } | null;
}

/** What is stored in the history snapshot for re-editing. */
export interface TypesetLayers {
  version: 1;
  /** History image the boxes are drawn on */
  baseImageId: string;
  boxes: TypesetBox[];
}

export const DEFAULT_TYPESET_SIZE = 0.035;

export function newTypesetBox(text: string, x = 0.5, y = 0.5, preset: Partial<TypesetBox> = {}): TypesetBox {
  return {
    id: crypto.randomUUID(), text, x, y, size: DEFAULT_TYPESET_SIZE, vertical: true, font: "gothic", bold: false,
    color: "#000000", outline: false, frame: "round", tail: null, ...preset,
  };
}

// ---- Vertical writing ----

/** Drawn rotated 90° in vertical text (long vowel, dashes, brackets, ellipses). */
const ROTATE_IN_VERTICAL = new Set([..."ー―—─〜～…‥-–()（）「」『』【】〔〕［］[]<>〈〉《》=＝→←"]);
/** Sit in the upper right of their cell in vertical text. */
const PUNCT_IN_VERTICAL = new Set([..."、。，．,."]);
const SMALL_KANA = new Set([..."ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ"]);

export interface Glyph {
  text: string;
  /** Cell center relative to the text block's center, in font-size units */
  x: number;
  y: number;
  rotate: boolean;
}

export interface TextLayout {
  glyphs: Glyph[];
  /** Block size in font-size units */
  width: number;
  height: number;
}

const COLUMN_PITCH = 1.3;
const LINE_PITCH = 1.35;

/**
 * Vertical: one glyph per cell, columns (one per line) from right to left.
 * Horizontal: one glyph per line, centered; `measure(line)` gives its width in font-size units.
 */
export function layoutText(text: string, vertical: boolean, measure: (line: string) => number): TextLayout {
  const lines = text.split(/\r?\n/);
  if (!vertical) {
    const width = Math.max(0, ...lines.map(measure));
    const height = lines.length * LINE_PITCH;
    return {
      glyphs: lines.map((line, i) => ({ text: line, x: 0, y: (i + 0.5) * LINE_PITCH - height / 2, rotate: false })),
      width,
      height,
    };
  }
  const columns = lines.map((l) => [...l]);
  const rows = Math.max(1, ...columns.map((c) => c.length));
  const width = columns.length * COLUMN_PITCH;
  const glyphs: Glyph[] = [];
  columns.forEach((chars, col) => {
    const x = width / 2 - (col + 0.5) * COLUMN_PITCH;
    chars.forEach((ch, row) => {
      let dx = 0;
      let dy = 0;
      if (PUNCT_IN_VERTICAL.has(ch)) { dx = 0.3; dy = -0.3; }
      else if (SMALL_KANA.has(ch)) { dx = 0.1; dy = -0.1; }
      glyphs.push({ text: ch, x: x + dx, y: row + 0.5 - rows / 2 + dy, rotate: ROTATE_IN_VERTICAL.has(ch) });
    });
  });
  return { glyphs, width, height: rows };
}

/** Lines of dialogue / sound effects in a history snapshot (to insert quickly), without duplicates. */
export function snapshotTexts(snapshot: Record<string, unknown> | null | undefined): string[] {
  const ui = (snapshot?.ui_snapshot ?? null) as Record<string, unknown> | null;
  const out: string[] = [];
  const take = (list: unknown) => {
    if (!Array.isArray(list)) return;
    for (const item of list) {
      const text = (item as { text?: unknown })?.text;
      if (typeof text === "string" && text.trim()) out.push(text.trim());
    }
  };
  const targets = ui?.sidebarPromptTargets as Record<string, { dialogue?: unknown; sfx?: unknown }> | undefined;
  for (const t of Object.values(targets ?? {})) { take(t?.dialogue); take(t?.sfx); }
  const manga = ui?.mangaPage as { enabled?: unknown; panels?: unknown } | undefined;
  if (manga?.enabled === true && Array.isArray(manga.panels)) {
    for (const p of manga.panels as Array<{ cast?: unknown; text?: unknown; sfx?: unknown }>) {
      if (Array.isArray(p.cast)) for (const c of p.cast as Array<{ dialogue?: unknown; sfx?: unknown }>) { take(c.dialogue); take(c.sfx); }
      take(p.text);
      take(p.sfx);
    }
  }
  return [...new Set(out)];
}

/** Layers stored in a typeset image's snapshot, if any. */
export function snapshotLayers(snapshot: Record<string, unknown> | null | undefined): TypesetLayers | null {
  const l = snapshot?.typeset as Partial<TypesetLayers> | undefined;
  if (!l || l.version !== 1 || typeof l.baseImageId !== "string" || !Array.isArray(l.boxes)) return null;
  return { version: 1, baseImageId: l.baseImageId, boxes: l.boxes as TypesetBox[] };
}
