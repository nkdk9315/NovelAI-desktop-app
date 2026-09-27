import { useEffect, useRef, useState } from "react";
import { boxGeometry, hitTest, renderTypeset } from "@/lib/typeset-render";
import { FRAMES_WITH_TAIL, type TypesetBox } from "@/lib/typeset";

interface TypesetCanvasProps {
  image: HTMLImageElement;
  boxes: TypesetBox[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Move a box (x / y) or its tail tip, in 0–1 image coordinates; `key` groups one drag into one undo step */
  onMove: (id: string, patch: Partial<TypesetBox>, key: string) => void;
  onAddAt: (x: number, y: number) => void;
}

type Drag = { mode: "move" | "tail"; id: string; dx: number; dy: number; key: string };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** The image with its text boxes, fitted to the available space. Drag to move, double-click to add. */
export default function TypesetCanvas({ image, boxes, selectedId, onSelect, onMove, onAddAt }: TypesetCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<Drag | null>(null);
  const [scale, setScale] = useState(1);
  const W = image.naturalWidth;
  const H = image.naturalHeight;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const fit = () => setScale(Math.min(el.clientWidth / W, el.clientHeight / H) || 1);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [W, H]);

  // Redraw: image + boxes, then the selection outline and tail handle (editor only, never saved)
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    renderTypeset(ctx, image, boxes, W, H);
    const sel = boxes.find((b) => b.id === selectedId);
    if (!sel) return;
    const g = boxGeometry(ctx, sel, W, H);
    const px = 1 / scale;
    ctx.save();
    ctx.setLineDash([6 * px, 4 * px]);
    ctx.lineWidth = 2 * px;
    ctx.strokeStyle = "#f59e0b";
    const m = g.sizePx * 0.3;
    ctx.strokeRect(g.cx - g.rx - m, g.cy - g.ry - m, (g.rx + m) * 2, (g.ry + m) * 2);
    if (sel.tail && FRAMES_WITH_TAIL.includes(sel.frame)) {
      ctx.setLineDash([]);
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.arc(sel.tail.x * W, sel.tail.y * H, 7 * px, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }, [image, boxes, selectedId, W, H, scale]);

  const toImage = (e: React.PointerEvent | React.MouseEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { px: ((e.clientX - r.left) / r.width) * W, py: ((e.clientY - r.top) / r.height) * H };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || e.button !== 0) return;
    const { px, py } = toImage(e);
    const key = `drag-${Date.now()}`;
    const sel = boxes.find((b) => b.id === selectedId);
    if (sel?.tail && Math.hypot(px - sel.tail.x * W, py - sel.tail.y * H) < 14 / scale) {
      drag.current = { mode: "tail", id: sel.id, dx: 0, dy: 0, key };
    } else {
      const id = hitTest(ctx, boxes, W, H, px, py);
      onSelect(id);
      const box = boxes.find((b) => b.id === id);
      drag.current = box ? { mode: "move", id: box.id, dx: px - box.x * W, dy: py - box.y * H, key } : null;
    }
    if (drag.current) canvasRef.current!.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const { px, py } = toImage(e);
    const x = clamp01((px - d.dx) / W);
    const y = clamp01((py - d.dy) / H);
    onMove(d.id, d.mode === "tail" ? { tail: { x, y } } : { x, y }, d.key);
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { px, py } = toImage(e);
    if (!hitTest(ctx, boxes, W, H, px, py)) onAddAt(px / W, py / H);
  };

  return (
    <div ref={wrapRef} className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden rounded-md bg-muted/40">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ width: W * scale, height: H * scale, touchAction: "none" }}
        className="cursor-crosshair shadow"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
        onDoubleClick={onDoubleClick}
      />
    </div>
  );
}
