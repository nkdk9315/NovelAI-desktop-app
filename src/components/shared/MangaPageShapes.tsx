import { useEffect, useRef, useState } from "react";
import { centroid, insetShape, readingOrder, type Shape } from "@/lib/manga-geometry";
import { GUTTER } from "@/lib/manga-template";

/** Largest W×H box of the page's aspect that fits in the returned container ref. */
export function useFitPage(width: number, height: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 300, h: 400 });
  useEffect(() => {
    const el = ref.current;
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
  return { ref, size };
}

interface MangaPageShapesProps {
  shapes: readonly Shape[];
  /** Drawn size in pixels */
  size: { w: number; h: number };
  selected?: readonly number[];
  /** Shapes are already in reading order (an applied page): number them by index */
  ordered?: boolean;
}

/** The page's panels with their reading-order numbers (layout editor and center preview). */
export default function MangaPageShapes({ shapes, size, selected = [], ordered = false }: MangaPageShapesProps) {
  const order = ordered ? shapes.map((_, i) => i) : readingOrder(shapes);
  const pts = (s: Shape) => insetShape(s, GUTTER).map((p) => `${p.x * size.w},${p.y * size.h}`).join(" ");
  return (
    <>
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
    </>
  );
}
