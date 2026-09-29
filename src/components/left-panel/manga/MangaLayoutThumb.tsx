import { mangaLayout, type MangaLayoutId } from "@/lib/manga-layouts";

/** Page thumbnail with numbered panels (reading order); `highlight` marks one panel. */
export default function MangaLayoutThumb({ layoutId, highlight, className }: {
  layoutId: MangaLayoutId; highlight?: number; className?: string;
}) {
  const layout = mangaLayout(layoutId);
  const w = 100;
  const h = (w * layout.height) / layout.width;
  const gap = 3;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden>
      {layout.panels.map(({ rect }, i) => {
        const x = rect.x0 * w + gap / 2;
        const y = rect.y0 * h + gap / 2;
        const pw = (rect.x1 - rect.x0) * w - gap;
        const ph = (rect.y1 - rect.y0) * h - gap;
        const on = highlight === undefined || highlight === i;
        return (
          <g key={i}>
            <rect
              x={x} y={y} width={pw} height={ph} rx={1.5}
              fill={highlight === i ? "currentColor" : "none"} fillOpacity={0.15}
              stroke="currentColor" strokeWidth={highlight === i ? 3 : 2} opacity={on ? 1 : 0.35}
            />
            <text
              x={x + pw / 2} y={y + ph / 2} textAnchor="middle" dominantBaseline="central"
              fontSize={Math.min(pw, ph) * 0.45} fontWeight={700} fill="currentColor" opacity={on ? 0.8 : 0.3}
            >
              {i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
