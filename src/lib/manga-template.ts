import { insetShape, type Shape } from "@/lib/manga-geometry";
import { canvasToBase64Png, createCanvas } from "@/lib/canvas-image";

/**
 * Slanted panel borders are drawn as black outlines on a white page and sent
 * as the img2img source, with the page described in words as usual. Verified
 * on V5: strength 0.85–0.95 followed the diagonal borders in every test
 * (0.8 sometimes added a phantom panel).
 */
export const MANGA_TEMPLATE_STRENGTH = 0.9;

/** Gap between panels, as a fraction of the page width */
export const GUTTER = 0.012;

/** Trace panel outlines (inset for the gutter) on a canvas context sized w×h. */
export function tracePanels(ctx: CanvasRenderingContext2D, shapes: readonly Shape[], w: number, h: number) {
  for (const s of shapes) {
    const inset = insetShape(s, GUTTER);
    ctx.beginPath();
    inset.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x * w, p.y * h) : ctx.lineTo(p.x * w, p.y * h)));
    ctx.closePath();
    ctx.stroke();
  }
}

/** The img2img source for a page: white with black panel borders (base64 PNG). */
export function renderLayoutTemplate(shapes: readonly Shape[], width: number, height: number): string {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = Math.max(4, width * 0.012);
  ctx.lineJoin = "miter";
  tracePanels(ctx, shapes, width, height);
  return canvasToBase64Png(canvas);
}
