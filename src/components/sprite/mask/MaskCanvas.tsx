import { useEffect, useRef } from "react";
import type { MaskCells } from "@/lib/mask-grid";
import { paintCircle, paintRect } from "@/lib/sprite/mask";

export type MaskTool = "brush" | "eraser" | "rect" | "rectErase";

export interface MaskLayer {
  id: string;
  color: string;
  cells: MaskCells;
}

interface Props {
  imageSrc: string | null;
  width: number;
  height: number;
  layers: MaskLayer[];
  activeId: string;
  tool: MaskTool;
  /** Brush radius in cells */
  radius: number;
  /** Called before a stroke changes the active layer (for undo) */
  onStrokeStart: () => void;
  onChange: () => void;
}

/**
 * The image with its region masks drawn over it, one colour per layer, on
 * the 8px cell grid. Painting changes the active layer's cells in place.
 */
export default function MaskCanvas({ imageSrc, width, height, layers, activeId, tool, radius, onStrokeStart, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const drag = useRef<{ x: number; y: number; start: { x: number; y: number } } | null>(null);
  const hover = useRef<{ x: number; y: number } | null>(null);
  const active = layers.find((l) => l.id === activeId);
  const cols = active?.cells.cols ?? 1;
  const rows = active?.cells.rows ?? 1;

  const draw = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    if (imgRef.current) ctx.drawImage(imgRef.current, 0, 0, c.width, c.height);
    else {
      ctx.fillStyle = "#88888833";
      ctx.fillRect(0, 0, c.width, c.height);
    }
    const cw = c.width / cols;
    const ch = c.height / rows;
    for (const layer of layers) {
      ctx.globalAlpha = layer.id === activeId ? 0.5 : 0.22;
      ctx.fillStyle = layer.color;
      const m = layer.cells;
      for (let y = 0; y < m.rows; y++) {
        for (let x = 0; x < m.cols; x++) if (m.cells[y * m.cols + x]) ctx.fillRect(x * cw, y * ch, Math.ceil(cw), Math.ceil(ch));
      }
    }
    ctx.globalAlpha = 1;
    const d = drag.current;
    if (d && (tool === "rect" || tool === "rectErase")) {
      ctx.strokeStyle = tool === "rect" ? "#fff" : "#f00";
      ctx.setLineDash([4, 3]);
      const [x0, x1] = [Math.min(d.start.x, d.x), Math.max(d.start.x, d.x) + 1];
      const [y0, y1] = [Math.min(d.start.y, d.y), Math.max(d.start.y, d.y) + 1];
      ctx.strokeRect(x0 * cw, y0 * ch, (x1 - x0) * cw, (y1 - y0) * ch);
      ctx.setLineDash([]);
    }
    const h = hover.current;
    if (h && (tool === "brush" || tool === "eraser")) {
      ctx.strokeStyle = tool === "brush" ? "#fff" : "#f00";
      ctx.beginPath();
      ctx.arc(h.x * cw, h.y * ch, radius * cw, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  useEffect(() => {
    imgRef.current = null;
    if (!imageSrc) { draw(); return; }
    const img = new Image();
    img.onload = () => { imgRef.current = img; draw(); };
    img.src = imageSrc;
  }, [imageSrc]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(draw);

  const cellAt = (e: React.PointerEvent, exact: boolean) => {
    const r = canvasRef.current!.getBoundingClientRect();
    const fx = ((e.clientX - r.left) / r.width) * cols;
    const fy = ((e.clientY - r.top) / r.height) * rows;
    return exact ? { x: fx, y: fy } : { x: Math.min(cols - 1, Math.max(0, Math.floor(fx))), y: Math.min(rows - 1, Math.max(0, Math.floor(fy))) };
  };
  const paintAt = (e: React.PointerEvent) => {
    if (!active) return;
    const p = cellAt(e, true);
    paintCircle(active.cells, p.x, p.y, radius, tool === "brush" ? 1 : 0);
    onChange();
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="h-[70vh] max-w-full cursor-crosshair touch-none rounded border border-border"
      style={{ aspectRatio: `${width} / ${height}` }}
      onPointerDown={(e) => {
        if (!active) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        onStrokeStart();
        const p = cellAt(e, false);
        drag.current = { ...p, start: p };
        if (tool === "brush" || tool === "eraser") paintAt(e);
      }}
      onPointerMove={(e) => {
        hover.current = cellAt(e, true);
        if (drag.current) {
          const p = cellAt(e, false);
          drag.current = { ...drag.current, ...p };
          if (tool === "brush" || tool === "eraser") paintAt(e);
        }
        draw();
      }}
      onPointerUp={() => {
        const d = drag.current;
        drag.current = null;
        if (d && active && (tool === "rect" || tool === "rectErase")) {
          paintRect(active.cells, d.start.x, d.start.y, d.x, d.y, tool === "rect" ? 1 : 0);
          onChange();
        }
        draw();
      }}
      onPointerLeave={() => { hover.current = null; draw(); }}
    />
  );
}
