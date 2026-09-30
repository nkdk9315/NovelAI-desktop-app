/**
 * Region masks of a sprite pose: one bit per 8px cell, stored as a 1/8-size
 * black / white PNG (the format the canvas editor already sends; the API
 * client scales it to full size — a 1/8 or off-grid mask draws a grey frame on V5).
 */
import { MASK_CELL, type MaskCells } from "@/lib/mask-grid";
import { createCanvas, loadImageElement, maskCellsToBase64 } from "@/lib/canvas-image";
import type { SpriteSpec } from "./spec";

export function gridOf(spec: Pick<SpriteSpec, "width" | "height">): { cols: number; rows: number } {
  return { cols: Math.max(1, Math.floor(spec.width / MASK_CELL)), rows: Math.max(1, Math.floor(spec.height / MASK_CELL)) };
}

export function emptyCells(cols: number, rows: number): MaskCells {
  return { cols, rows, cells: new Uint8Array(cols * rows), count: 0 };
}

function withCount(cols: number, rows: number, cells: Uint8Array): MaskCells {
  let count = 0;
  for (const c of cells) count += c;
  return { cols, rows, cells, count };
}

export function unionCells(masks: MaskCells[], cols: number, rows: number): MaskCells {
  const out = new Uint8Array(cols * rows);
  for (const m of masks) {
    if (m.cols !== cols || m.rows !== rows) continue;
    for (let i = 0; i < out.length; i++) if (m.cells[i]) out[i] = 1;
  }
  return withCount(cols, rows, out);
}

export function subtractCells(a: MaskCells, b: MaskCells): MaskCells {
  const out = new Uint8Array(a.cells);
  if (b.cols === a.cols && b.rows === a.rows) {
    for (let i = 0; i < out.length; i++) if (b.cells[i]) out[i] = 0;
  }
  return withCount(a.cols, a.rows, out);
}

/** Grow a mask by `r` cells in every direction (8-neighbourhood). */
export function dilateCells(m: MaskCells, r = 1): MaskCells {
  const out = new Uint8Array(m.cells.length);
  for (let y = 0; y < m.rows; y++) {
    for (let x = 0; x < m.cols; x++) {
      if (!m.cells[y * m.cols + x]) continue;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < m.cols && ny < m.rows) out[ny * m.cols + nx] = 1;
        }
      }
    }
  }
  return withCount(m.cols, m.rows, out);
}

/** Set / clear the cells inside a circle (cell units). */
export function paintCircle(m: MaskCells, cx: number, cy: number, radius: number, value: 0 | 1): void {
  const r2 = radius * radius;
  for (let y = Math.max(0, Math.floor(cy - radius)); y <= Math.min(m.rows - 1, Math.ceil(cy + radius)); y++) {
    for (let x = Math.max(0, Math.floor(cx - radius)); x <= Math.min(m.cols - 1, Math.ceil(cx + radius)); x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy > r2) continue;
      const i = y * m.cols + x;
      if (m.cells[i] !== value) {
        m.cells[i] = value;
        m.count += value ? 1 : -1;
      }
    }
  }
}

/** Set / clear a rectangle of cells (inclusive corners, any order). */
export function paintRect(m: MaskCells, x0: number, y0: number, x1: number, y1: number, value: 0 | 1): void {
  const [ax, bx] = [Math.max(0, Math.min(x0, x1)), Math.min(m.cols - 1, Math.max(x0, x1))];
  const [ay, by] = [Math.max(0, Math.min(y0, y1)), Math.min(m.rows - 1, Math.max(y0, y1))];
  for (let y = ay; y <= by; y++) {
    for (let x = ax; x <= bx; x++) {
      const i = y * m.cols + x;
      if (m.cells[i] !== value) {
        m.cells[i] = value;
        m.count += value ? 1 : -1;
      }
    }
  }
}

export function encodeCells(m: MaskCells): string {
  return maskCellsToBase64(m);
}

/** Decode a stored mask PNG into cells of the given grid (resampled if it was drawn for another size). */
export async function decodeCells(base64: string, cols: number, rows: number): Promise<MaskCells> {
  const img = await loadImageElement(`data:image/png;base64,${base64}`);
  const c = createCanvas(cols, rows);
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, cols, rows);
  const data = ctx.getImageData(0, 0, cols, rows).data;
  const cells = new Uint8Array(cols * rows);
  for (let i = 0; i < cells.length; i++) cells[i] = data[i * 4] >= 128 ? 1 : 0;
  return withCount(cols, rows, cells);
}

/** Cells of a pose's regions, unioned (missing regions are skipped). */
export async function regionCells(spec: SpriteSpec, poseId: string, regionIds: string[]): Promise<MaskCells> {
  const { cols, rows } = gridOf(spec);
  const stored = regionIds.map((r) => spec.masks[poseId]?.[r]).filter((m): m is string => !!m);
  const decoded = await Promise.all(stored.map((b) => decodeCells(b, cols, rows)));
  return unionCells(decoded, cols, rows);
}
