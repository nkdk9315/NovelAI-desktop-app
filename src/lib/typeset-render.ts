import { FRAMES_WITH_TAIL, layoutText, type TextLayout, type TypesetBox, type TypesetFont } from "@/lib/typeset";

/** Canvas drawing of typeset boxes. The same code draws the editor preview and the saved image. */

const FONT_FAMILIES: Record<TypesetFont, string> = {
  gothic: "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif",
  mincho: "'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif JP', serif",
  maru: "'Hiragino Maru Gothic ProN', 'Zen Maru Gothic', 'Arial Rounded MT Bold', 'Noto Sans JP', sans-serif",
};

export function fontFamily(font: TypesetFont): string {
  return FONT_FAMILIES[font] ?? FONT_FAMILIES.gothic;
}

/** Make sure the web fonts are ready before measuring / drawing. */
export async function loadTypesetFonts(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  await Promise.all([
    document.fonts.load("500 16px 'Noto Sans JP'", "あ"),
    document.fonts.load("700 16px 'Noto Sans JP'", "あ"),
  ]).catch(() => undefined);
}

export interface BoxGeometry {
  cx: number;
  cy: number;
  sizePx: number;
  layout: TextLayout;
  /** Half extents of the frame (or of the text when there is no frame) */
  rx: number;
  ry: number;
}

function setFont(ctx: CanvasRenderingContext2D, box: TypesetBox, sizePx: number) {
  ctx.font = `${box.bold ? 800 : 500} ${sizePx}px ${fontFamily(box.font)}`;
}

export function boxGeometry(ctx: CanvasRenderingContext2D, box: TypesetBox, w: number, h: number): BoxGeometry {
  const sizePx = Math.max(4, box.size * w);
  setFont(ctx, box, sizePx);
  const layout = layoutText(box.text || " ", box.vertical, (line) => ctx.measureText(line).width / sizePx);
  const textW = layout.width * sizePx;
  const textH = layout.height * sizePx;
  const pad = sizePx * 0.6;
  // An ellipse needs ~√2 of the text block to contain it
  const k = box.frame === "rect" || box.frame === "none" ? 1 : 1.3;
  return {
    cx: box.x * w, cy: box.y * h, sizePx, layout,
    rx: (textW / 2) * k + (box.frame === "none" ? 0 : pad),
    ry: (textH / 2) * k + (box.frame === "none" ? 0 : pad),
  };
}

function ellipsePoint(g: BoxGeometry, theta: number, scale = 1): [number, number] {
  return [g.cx + Math.cos(theta) * g.rx * scale, g.cy + Math.sin(theta) * g.ry * scale];
}

function framePath(ctx: CanvasRenderingContext2D, box: TypesetBox, g: BoxGeometry) {
  ctx.beginPath();
  if (box.frame === "rect") {
    ctx.rect(g.cx - g.rx, g.cy - g.ry, g.rx * 2, g.ry * 2);
  } else if (box.frame === "spiky") {
    const n = 22;
    for (let i = 0; i < n; i++) {
      const [x, y] = ellipsePoint(g, (i / n) * Math.PI * 2, i % 2 ? 0.92 : 1.2);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  } else if (box.frame === "cloud") {
    const n = 12;
    const [x0, y0] = ellipsePoint(g, 0);
    ctx.moveTo(x0, y0);
    for (let i = 1; i <= n; i++) {
      const [cx, cy] = ellipsePoint(g, ((i - 0.5) / n) * Math.PI * 2, 1.22);
      const [x, y] = ellipsePoint(g, (i / n) * Math.PI * 2);
      ctx.quadraticCurveTo(cx, cy, x, y);
    }
    ctx.closePath();
  } else {
    ctx.ellipse(g.cx, g.cy, g.rx, g.ry, 0, 0, Math.PI * 2);
  }
}

function tailPath(ctx: CanvasRenderingContext2D, box: TypesetBox, g: BoxGeometry, w: number, h: number): boolean {
  if (!box.tail || !FRAMES_WITH_TAIL.includes(box.frame)) return false;
  const tx = box.tail.x * w;
  const ty = box.tail.y * h;
  const theta = Math.atan2((ty - g.cy) / g.ry, (tx - g.cx) / g.rx);
  const [ax, ay] = ellipsePoint(g, theta - 0.22, 0.85);
  const [bx, by] = ellipsePoint(g, theta + 0.22, 0.85);
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(tx, ty);
  ctx.lineTo(bx, by);
  ctx.closePath();
  return true;
}

export function drawBox(ctx: CanvasRenderingContext2D, box: TypesetBox, w: number, h: number): BoxGeometry {
  const g = boxGeometry(ctx, box, w, h);
  ctx.save();
  if (box.frame !== "none") {
    // Strokes first, then white fills on top: the tail merges into the bubble without a seam
    ctx.lineWidth = Math.max(2, g.sizePx * 0.14);
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#000000";
    ctx.fillStyle = "#ffffff";
    if (tailPath(ctx, box, g, w, h)) ctx.stroke();
    framePath(ctx, box, g);
    ctx.stroke();
    if (tailPath(ctx, box, g, w, h)) ctx.fill();
    framePath(ctx, box, g);
    ctx.fill();
  }
  setFont(ctx, box, g.sizePx);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  for (const pass of box.outline ? ["stroke", "fill"] : ["fill"]) {
    for (const glyph of g.layout.glyphs) {
      ctx.save();
      ctx.translate(g.cx + glyph.x * g.sizePx, g.cy + glyph.y * g.sizePx);
      if (glyph.rotate) ctx.rotate(Math.PI / 2);
      if (pass === "stroke") {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = g.sizePx * 0.22;
        ctx.strokeText(glyph.text, 0, 0);
      } else {
        ctx.fillStyle = box.color;
        ctx.fillText(glyph.text, 0, 0);
      }
      ctx.restore();
    }
  }
  ctx.restore();
  return g;
}

/** Draw the image and every box (no editor overlays). */
export function renderTypeset(ctx: CanvasRenderingContext2D, image: CanvasImageSource, boxes: readonly TypesetBox[], w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(image, 0, 0, w, h);
  for (const box of boxes) drawBox(ctx, box, w, h);
}

/** Topmost box under an image-space point. */
export function hitTest(ctx: CanvasRenderingContext2D, boxes: readonly TypesetBox[], w: number, h: number, px: number, py: number): string | null {
  for (let i = boxes.length - 1; i >= 0; i--) {
    const g = boxGeometry(ctx, boxes[i], w, h);
    const m = g.sizePx * 0.3;
    if (Math.abs(px - g.cx) <= g.rx + m && Math.abs(py - g.cy) <= g.ry + m) return boxes[i].id;
  }
  return null;
}
