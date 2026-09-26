/** The API receives the inpaint mask at 1/8 of the generation size. */
export const MASK_CELL = 8;

/** Average alpha (0–255) above which a mask cell counts as painted. */
export const MASK_CELL_THRESHOLD = 24;

export interface MaskCells {
  cols: number;
  rows: number;
  /** 1 = regenerate, 0 = keep; row-major, length cols*rows */
  cells: Uint8Array;
  count: number;
}

/**
 * Reduce a painted alpha channel (`srcW`×`srcH`, RGBA bytes) to the API's
 * mask grid (`targetW/8`×`targetH/8`). A cell is masked when the average
 * alpha of the source pixels that fall into it exceeds the threshold.
 */
export function alphaToMaskCells(
  rgba: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  targetW: number,
  targetH: number,
  threshold = MASK_CELL_THRESHOLD,
): MaskCells {
  const cols = Math.max(1, Math.floor(targetW / MASK_CELL));
  const rows = Math.max(1, Math.floor(targetH / MASK_CELL));
  const sum = new Float64Array(cols * rows);
  const n = new Uint32Array(cols * rows);
  for (let y = 0; y < srcH; y++) {
    const cy = Math.min(rows - 1, Math.floor((y * rows) / srcH));
    const rowBase = cy * cols;
    for (let x = 0; x < srcW; x++) {
      const cx = Math.min(cols - 1, Math.floor((x * cols) / srcW));
      sum[rowBase + cx] += rgba[(y * srcW + x) * 4 + 3];
      n[rowBase + cx]++;
    }
  }
  const cells = new Uint8Array(cols * rows);
  let count = 0;
  for (let i = 0; i < cells.length; i++) {
    if (n[i] > 0 && sum[i] / n[i] > threshold) {
      cells[i] = 1;
      count++;
    }
  }
  return { cols, rows, cells, count };
}
