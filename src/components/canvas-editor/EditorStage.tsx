import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useZoomPan } from "@/hooks/use-zoom-pan";
import { maskCellsOf } from "@/lib/canvas-image";
import type { EditorLayer } from "@/stores/image-edit-store";
import { MASK_COLOR, type BrushSettings, type useCanvasLayers } from "./use-canvas-layers";

interface EditorStageProps {
  baseSrc: string;
  width: number;
  height: number;
  targetWidth: number;
  targetHeight: number;
  layer: EditorLayer;
  brush: BrushSettings;
  showGrid: boolean;
  panning: boolean;
  layers: ReturnType<typeof useCanvasLayers>;
  onPickColor: (color: string) => void;
  onMaskCoverage: (coverage: number) => void;
}

const MASK_OPACITY = 0.5;

/**
 * The editable image: base image, paint layer, mask layer, the 8px mask grid
 * preview and a brush-size cursor. Wheel / pinch zooms, Space + drag pans.
 */
export default function EditorStage(props: EditorStageProps) {
  const { baseSrc, width, height, targetWidth, targetHeight, layer, brush, showGrid, panning, layers } = props;
  const zoom = useZoomPan(baseSrc);
  const hitRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLCanvasElement>(null);
  const [fit, setFit] = useState(1);
  const subtractRef = useRef(false);

  // Fit the image into the stage
  useLayoutEffect(() => {
    const el = zoom.containerRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setFit(Math.min((r.width - 32) / width, (r.height - 32) / height));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [zoom.containerRef, width, height]);

  // Redraw the mask grid (what the API will actually regenerate) after each edit
  const { onMaskCoverage } = props;
  useEffect(() => {
    const mask = layers.maskRef.current;
    const grid = gridRef.current;
    if (!mask || !grid) return;
    const cells = maskCellsOf(mask, targetWidth, targetHeight);
    onMaskCoverage(cells.count / cells.cells.length);
    grid.width = cells.cols;
    grid.height = cells.rows;
    const ctx = grid.getContext("2d")!;
    const img = ctx.createImageData(cells.cols, cells.rows);
    for (let i = 0; i < cells.cells.length; i++) {
      if (!cells.cells[i]) continue;
      img.data.set([0xff, 0x3b, 0x6b, 255], i * 4);
    }
    ctx.putImageData(img, 0, 0);
  }, [layers.historyVersion, layers.maskRef, targetWidth, targetHeight, onMaskCoverage]);

  const toImage = (e: React.PointerEvent) => {
    const r = hitRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * width, y: ((e.clientY - r.top) / r.height) * height };
  };

  const moveCursor = (e: React.PointerEvent) => {
    const cursor = cursorRef.current;
    const container = zoom.containerRef.current;
    if (!cursor || !container) return;
    const c = container.getBoundingClientRect();
    const r = hitRef.current!.getBoundingClientRect();
    const d = brush.tool === "brush" || brush.tool === "eraser" ? (brush.size * r.width) / width : 0;
    cursor.style.display = d > 0 && !panning ? "block" : "none";
    cursor.style.width = cursor.style.height = `${d}px`;
    cursor.style.transform = `translate(${e.clientX - c.left - d / 2}px, ${e.clientY - c.top - d / 2}px)`;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (panning || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    subtractRef.current = e.altKey;
    const picked = layers.begin(layer, brush, toImage(e), e.altKey);
    if (picked) props.onPickColor(picked);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    moveCursor(e);
    if (!panning) layers.move(brush, toImage(e));
  };

  const onPointerUp = () => layers.end(brush, subtractRef.current);

  const { scale, x, y } = zoom.view;
  const stroke = layers.strokeStyle;
  const maskVisible = layer === "mask" ? MASK_OPACITY : MASK_OPACITY * 0.35;
  const layerCls = "pointer-events-none absolute inset-0 h-full w-full";

  return (
    <div
      ref={zoom.containerRef}
      {...(panning ? zoom.handlers : {})}
      onPointerLeave={() => { if (cursorRef.current) cursorRef.current.style.display = "none"; }}
      className={`editor-checker relative flex-1 touch-none select-none overflow-hidden ${panning ? "cursor-grab" : ""}`}
    >
      <div
        className="absolute left-1/2 top-1/2 shadow-lg"
        style={{
          width: width * fit,
          height: height * fit,
          transform: `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale})`,
        }}
      >
        <img src={baseSrc} alt="" draggable={false} className={layerCls} />
        <canvas ref={layers.paintRef} width={width} height={height} className={layerCls} />
        <canvas
          ref={layers.maskRef}
          width={width}
          height={height}
          className={layerCls}
          style={{ opacity: showGrid ? maskVisible * 0.5 : maskVisible }}
        />
        <canvas
          ref={gridRef}
          className={layerCls}
          style={{ opacity: showGrid ? maskVisible : 0, imageRendering: "pixelated" }}
        />
        <canvas
          ref={layers.strokeRef}
          width={width}
          height={height}
          className={layerCls}
          style={{ opacity: stroke ? stroke.opacity * (stroke.color === MASK_COLOR ? maskVisible : 1) : 0 }}
        />
        <div
          ref={hitRef}
          className="absolute inset-0"
          style={{ cursor: panning ? "grab" : brush.tool === "eyedropper" || brush.tool === "rect" ? "crosshair" : "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>
      <div
        ref={cursorRef}
        className="pointer-events-none absolute left-0 top-0 hidden rounded-full border border-white mix-blend-difference"
      />
    </div>
  );
}
