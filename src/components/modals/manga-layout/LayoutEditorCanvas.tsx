import { useEffect, useRef, useState } from "react";
import { centroid, contains, insetShape, readingOrder, snapLine, type Point, type Shape } from "@/lib/manga-geometry";
import { GUTTER } from "@/lib/manga-template";

interface LayoutEditorCanvasProps {
  shapes: Shape[];
  width: number;
  height: number;
  selected: number[];
  onSplit: (a: Point, b: Point) => void;
  onToggleSelect: (index: number) => void;
}

/** Minimum drag (page fraction) that counts as drawing a line rather than a click */
const MIN_LINE = 0.03;

/** The page: drag anywhere to draw a splitting line (snaps when nearly straight), click a panel to select it. */
export default function LayoutEditorCanvas({ shapes, width, height, selected, onSplit, onToggleSelect }: LayoutEditorCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 300, h: 400 });
  const [line, setLine] = useState<{ a: Point; b: Point } | null>(null);
  const order = readingOrder(shapes);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const fit = () => {
      const s = Math.min(el.clientWidth / width, el.clientHeight / height);
      setSize({ w: width * s, h: height * s });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, height]);

  const toPage = (e: React.PointerEvent): Point => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };
  // Snap in screen space so "nearly horizontal" means what it looks like
  const snapped = (a: Point, b: Point): Point => {
    const s = snapLine({ x: a.x * width, y: a.y * height }, { x: b.x * width, y: b.y * height });
    return { x: s.x / width, y: s.y / height };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const p = toPage(e);
    setLine({ a: p, b: p });
    svgRef.current!.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (line) setLine({ a: line.a, b: snapped(line.a, toPage(e)) });
  };
  const onPointerUp = () => {
    if (!line) return;
    const { a, b } = line;
    setLine(null);
    if (Math.hypot((b.x - a.x) * width, (b.y - a.y) * height) / width >= MIN_LINE) {
      onSplit(a, b);
      return;
    }
    const hit = shapes.findIndex((s) => contains(s, a));
    if (hit >= 0) onToggleSelect(hit);
  };

  const pts = (s: Shape) => insetShape(s, GUTTER).map((p) => `${p.x * size.w},${p.y * size.h}`).join(" ");

  return (
    <div ref={wrapRef} className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden rounded-md bg-muted/40 p-2">
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        className="cursor-crosshair touch-none bg-white shadow"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setLine(null)}
      >
        {shapes.map((s, i) => {
          const c = centroid(s);
          const on = selected.includes(i);
          return (
            <g key={i}>
              <polygon points={pts(s)} fill={on ? "#f59e0b33" : "#ffffff"} stroke={on ? "#f59e0b" : "#111111"} strokeWidth={on ? 3 : 2} />
              <text
                x={c.x * size.w} y={c.y * size.h} textAnchor="middle" dominantBaseline="central"
                fontSize={Math.max(12, size.w * 0.06)} fontWeight={700} fill="#11111166" className="pointer-events-none select-none"
              >
                {order.indexOf(i) + 1}
              </text>
            </g>
          );
        })}
        {line && (
          <line
            x1={line.a.x * size.w} y1={line.a.y * size.h} x2={line.b.x * size.w} y2={line.b.y * size.h}
            stroke="#e11d48" strokeWidth={2} strokeDasharray="6 4"
          />
        )}
      </svg>
    </div>
  );
}
