import { useCallback, useEffect, useRef, useState } from "react";
import { createCanvas, loadImageElement } from "@/lib/canvas-image";
import type { EditorLayer } from "@/stores/image-edit-store";

export type EditorTool = "brush" | "eraser" | "rect" | "eyedropper";

/** Color the mask is painted with (only its alpha matters). */
export const MASK_COLOR = "#ff3b6b";
const MAX_HISTORY = 20;

export interface BrushSettings {
  tool: EditorTool;
  size: number;
  color: string;
  opacity: number;
}

interface HistoryEntry {
  layer: EditorLayer;
  data: ImageData;
}

interface Point {
  x: number;
  y: number;
}

/**
 * Paint / mask layers of the canvas editor: stroke drawing (via a temporary
 * stroke canvas so opacity does not accumulate), rectangle masks, the
 * eyedropper and a bounded undo / redo history.
 */
export function useCanvasLayers(
  width: number,
  height: number,
  baseSrc: string,
  initialPaint: string | null,
  initialMask: string | null,
) {
  const paintRef = useRef<HTMLCanvasElement>(null);
  const maskRef = useRef<HTMLCanvasElement>(null);
  const strokeRef = useRef<HTMLCanvasElement>(null);
  const undoStack = useRef<HistoryEntry[]>([]);
  const redoStack = useRef<HistoryEntry[]>([]);
  const active = useRef<{ layer: EditorLayer; tool: EditorTool; start: Point; last: Point } | null>(null);
  const baseImg = useRef<HTMLImageElement | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [strokeStyle, setStrokeStyle] = useState<{ opacity: number; color: string } | null>(null);

  // Load the base image (for the eyedropper) and restore previously applied layers
  useEffect(() => {
    let cancelled = false;
    loadImageElement(baseSrc).then((img) => { if (!cancelled) baseImg.current = img; }).catch(() => {});
    const restore = async (canvas: HTMLCanvasElement | null, src: string | null) => {
      if (!canvas || !src) return;
      const img = await loadImageElement(src);
      if (cancelled) return;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      setHistoryVersion((v) => v + 1);
    };
    restore(paintRef.current, initialPaint).catch(() => {});
    restore(maskRef.current, initialMask).catch(() => {});
    return () => { cancelled = true; };
  }, [baseSrc, initialPaint, initialMask, width, height]);

  const canvasOf = (layer: EditorLayer) => (layer === "paint" ? paintRef.current : maskRef.current);

  const pushHistory = useCallback((layer: EditorLayer) => {
    const c = canvasOf(layer);
    if (!c) return;
    undoStack.current.push({ layer, data: c.getContext("2d")!.getImageData(0, 0, width, height) });
    if (undoStack.current.length > MAX_HISTORY) undoStack.current.shift();
    redoStack.current = [];
    setHistoryVersion((v) => v + 1);
  }, [width, height]);

  const swap = (from: HistoryEntry[], to: HistoryEntry[]) => {
    const entry = from.pop();
    if (!entry) return;
    const ctx = canvasOf(entry.layer)!.getContext("2d")!;
    to.push({ layer: entry.layer, data: ctx.getImageData(0, 0, width, height) });
    ctx.putImageData(entry.data, 0, 0);
    setHistoryVersion((v) => v + 1);
  };
  const undo = () => swap(undoStack.current, redoStack.current);
  const redo = () => swap(redoStack.current, undoStack.current);

  const segment = (ctx: CanvasRenderingContext2D, a: Point, b: Point, size: number) => {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = size;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  };

  const rectOf = (a: Point, b: Point) =>
    [Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(a.x - b.x), Math.abs(a.y - b.y)] as const;

  /** Sample the visible color (base + paint layer) at an image position. */
  const sampleColor = (p: Point): string | null => {
    if (!baseImg.current || !paintRef.current) return null;
    const c = createCanvas(1, 1);
    const ctx = c.getContext("2d")!;
    ctx.drawImage(baseImg.current, -Math.floor(p.x), -Math.floor(p.y));
    ctx.drawImage(paintRef.current, -Math.floor(p.x), -Math.floor(p.y));
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  };

  const begin = (layer: EditorLayer, s: BrushSettings, p: Point, subtract: boolean): string | null => {
    if (s.tool === "eyedropper") return sampleColor(p);
    const target = canvasOf(layer);
    const stroke = strokeRef.current;
    if (!target || !stroke) return null;
    pushHistory(layer);
    const tool: EditorTool = subtract && s.tool !== "rect" ? "eraser" : s.tool;
    active.current = { layer, tool, start: p, last: p };
    const color = layer === "mask" ? MASK_COLOR : s.color;
    if (tool === "eraser") {
      const ctx = target.getContext("2d")!;
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "#000";
      segment(ctx, p, p, s.size);
      ctx.globalCompositeOperation = "source-over";
      return null;
    }
    const sctx = stroke.getContext("2d")!;
    sctx.clearRect(0, 0, width, height);
    sctx.strokeStyle = color;
    sctx.fillStyle = color;
    if (tool === "brush") segment(sctx, p, p, s.size);
    setStrokeStyle({ color, opacity: layer === "mask" ? 1 : s.opacity });
    return null;
  };

  const move = (s: BrushSettings, p: Point) => {
    const a = active.current;
    if (!a) return;
    if (a.tool === "eraser") {
      const ctx = canvasOf(a.layer)!.getContext("2d")!;
      ctx.globalCompositeOperation = "destination-out";
      segment(ctx, a.last, p, s.size);
      ctx.globalCompositeOperation = "source-over";
    } else if (a.tool === "brush") {
      segment(strokeRef.current!.getContext("2d")!, a.last, p, s.size);
    } else if (a.tool === "rect") {
      const sctx = strokeRef.current!.getContext("2d")!;
      sctx.clearRect(0, 0, width, height);
      sctx.fillRect(...rectOf(a.start, p));
    }
    a.last = p;
  };

  const end = (s: BrushSettings, subtract: boolean) => {
    const a = active.current;
    active.current = null;
    if (!a) return;
    setHistoryVersion((v) => v + 1);
    if (a.tool === "eraser") return;
    const stroke = strokeRef.current!;
    const ctx = canvasOf(a.layer)!.getContext("2d")!;
    ctx.globalAlpha = a.layer === "mask" ? 1 : s.opacity;
    ctx.globalCompositeOperation = a.tool === "rect" && subtract ? "destination-out" : "source-over";
    ctx.drawImage(stroke, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    stroke.getContext("2d")!.clearRect(0, 0, width, height);
    setStrokeStyle(null);
  };

  const clearLayer = (layer: EditorLayer) => {
    pushHistory(layer);
    canvasOf(layer)!.getContext("2d")!.clearRect(0, 0, width, height);
  };

  const fillMask = () => {
    pushHistory("mask");
    const ctx = maskRef.current!.getContext("2d")!;
    ctx.fillStyle = MASK_COLOR;
    ctx.fillRect(0, 0, width, height);
  };

  const invertMask = () => {
    pushHistory("mask");
    const ctx = maskRef.current!.getContext("2d")!;
    const img = ctx.getImageData(0, 0, width, height);
    const [r, g, b] = [0xff, 0x3b, 0x6b];
    for (let i = 0; i < img.data.length; i += 4) {
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255 - img.data[i + 3];
    }
    ctx.putImageData(img, 0, 0);
  };

  return {
    paintRef, maskRef, strokeRef, strokeStyle,
    begin, move, end, undo, redo, clearLayer, fillMask, invertMask,
    canUndo: historyVersion >= 0 && undoStack.current.length > 0,
    canRedo: historyVersion >= 0 && redoStack.current.length > 0,
    historyVersion,
  };
}

/** True when a canvas has at least one non-transparent pixel. */
export function hasContent(canvas: HTMLCanvasElement): boolean {
  const data = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 3; i < data.length; i += 4) if (data[i] !== 0) return true;
  return false;
}
