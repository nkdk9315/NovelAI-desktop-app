import { centroid, insetShape, type Shape } from "@/lib/manga-geometry";
import { GUTTER } from "@/lib/manga-template";

/** Page thumbnail with numbered panels (reading order); `highlight` marks one panel. */
export default function MangaLayoutThumb({ shapes, width, height, highlight, className }: {
  shapes: readonly Shape[]; width: number; height: number; highlight?: number; className?: string;
}) {
  const w = 100;
  const h = (w * height) / width;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden>
      {shapes.map((s, i) => {
        const pts = insetShape(s, GUTTER * 1.5).map((p) => `${(p.x * w).toFixed(1)},${(p.y * h).toFixed(1)}`).join(" ");
        const c = centroid(s);
        const on = highlight === undefined || highlight === i;
        return (
          <g key={i}>
            <polygon
              points={pts}
              fill={highlight === i ? "currentColor" : "none"} fillOpacity={0.15}
              stroke="currentColor" strokeWidth={highlight === i ? 3 : 2} strokeLinejoin="round" opacity={on ? 1 : 0.35}
            />
            <text
              x={c.x * w} y={c.y * h} textAnchor="middle" dominantBaseline="central"
              fontSize={Math.min(w, h) * (shapes.length > 4 ? 0.13 : 0.18)} fontWeight={700} fill="currentColor" opacity={on ? 0.8 : 0.3}
            >
              {i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
