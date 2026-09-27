import { useId } from "react";
import type { LetteringStyle } from "@/lib/lettering-styles";

const MINCHO = "'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif JP', serif";
const MARU = "'Hiragino Maru Gothic ProN', 'Zen Maru Gothic', 'Arial Rounded MT Bold', sans-serif";

/** Sample "あ" showing roughly how a lettering style looks (system fonts + SVG filters). */
export default function LetteringIcon({ style, className }: { style: LetteringStyle; className?: string }) {
  const id = useId().replace(/:/g, "");
  const rough = `rough-${id}`;
  const wobble = `wobble-${id}`;
  const text = (props: React.SVGProps<SVGTextElement>, label = "あ") => (
    <text x={24} y={26} textAnchor="middle" fontSize={22} fill="currentColor" {...props}>{label}</text>
  );

  return (
    <svg viewBox="0 0 48 36" className={className} aria-hidden>
      <defs>
        <filter id={rough}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={3} />
          <feDisplacementMap in="SourceGraphic" scale={2.2} />
        </filter>
        <filter id={wobble}>
          <feTurbulence type="turbulence" baseFrequency="0.12" numOctaves={1} seed={7} />
          <feDisplacementMap in="SourceGraphic" scale={3.5} />
        </filter>
      </defs>
      {style === "auto" && text({ fontSize: 12, fontWeight: 500, opacity: 0.7 }, "Auto")}
      {style === "bold" && text({ fontWeight: 900 })}
      {style === "impact" && text({ fontWeight: 900, fontSize: 26, filter: `url(#${rough})`, transform: "skewX(-8) translate(3 1)" })}
      {style === "mincho" && text({ fontFamily: MINCHO, fontWeight: 400 })}
      {style === "brush" && text({ fontFamily: MINCHO, fontWeight: 800, filter: `url(#${rough})` })}
      {style === "horror" && (
        <>
          {text({ fontWeight: 800, filter: `url(#${rough})` })}
          <path d="M18 27v5M25 28v3M30 27v6" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
        </>
      )}
      {style === "wavy" && text({ fontWeight: 500, filter: `url(#${wobble})` })}
      {style === "cute" && text({ fontFamily: MARU, fontWeight: 700 })}
    </svg>
  );
}
