/**
 * Pixel compositing for `composite` axes: paste a region (whole 8px cells)
 * of the single-axis cell onto the cell without that axis. Verified on V5:
 * works when the pasted region doesn't overlap the other axes' regions (they
 * are subtracted first); overlapping regions leave a seam.
 */
import type { MaskCells } from "@/lib/mask-grid";
import { canvasToBase64Png, createCanvas, loadImageElement } from "@/lib/canvas-image";

/** Full-size canvas with the masked cells filled opaque. */
export function maskCanvas(m: MaskCells, width: number, height: number): HTMLCanvasElement {
  const c = createCanvas(width, height);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  const cw = width / m.cols;
  const ch = height / m.rows;
  for (let y = 0; y < m.rows; y++) {
    for (let x = 0; x < m.cols; x++) {
      if (m.cells[y * m.cols + x]) ctx.fillRect(Math.floor(x * cw), Math.floor(y * ch), Math.ceil(cw), Math.ceil(ch));
    }
  }
  return c;
}

/** `background` with `overlay`'s pixels inside `mask`; both are data URLs. Returns PNG base64. */
export async function compositeImages(backgroundSrc: string, overlaySrc: string, mask: MaskCells): Promise<string> {
  const [bg, ov] = await Promise.all([loadImageElement(backgroundSrc), loadImageElement(overlaySrc)]);
  const w = bg.naturalWidth;
  const h = bg.naturalHeight;
  const layer = createCanvas(w, h);
  const lctx = layer.getContext("2d")!;
  lctx.drawImage(ov, 0, 0, w, h);
  lctx.globalCompositeOperation = "destination-in";
  lctx.drawImage(maskCanvas(mask, w, h), 0, 0);

  const out = createCanvas(w, h);
  const ctx = out.getContext("2d")!;
  ctx.drawImage(bg, 0, 0);
  ctx.drawImage(layer, 0, 0);
  return canvasToBase64Png(out);
}
