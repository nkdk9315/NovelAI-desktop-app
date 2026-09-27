import type { ReactNode } from "react";
import type { MangaEffectId } from "@/lib/manga-effects";

const DROP = "M0 -6C2.5 -2 3.5 0 3.5 1.8A3.5 3.5 0 0 1 -3.5 1.8C-3.5 0 -2.5 -2 0 -6Z";

function radial(n: number, inner: number, outer: number): string {
  return Array.from({ length: n }, (_, i) => {
    const th = (i / n) * Math.PI * 2;
    const c = Math.cos(th);
    const s = Math.sin(th);
    return `M${(24 + c * inner * 1.3).toFixed(1)} ${(18 + s * inner).toFixed(1)}L${(24 + c * outer * 1.3).toFixed(1)} ${(18 + s * outer).toFixed(1)}`;
  }).join("");
}

const ICONS: Record<MangaEffectId, ReactNode> = {
  sweat: <path d={DROP} transform="translate(24 19) scale(1.9)" />,
  flyingSweat: (
    <>
      <path d={DROP} transform="translate(17 22) rotate(-30) scale(1.3)" />
      <path d={DROP} transform="translate(27 13) rotate(-15) scale(1.1)" />
      <path d={DROP} transform="translate(34 24) rotate(20) scale(1.2)" />
    </>
  ),
  anger: (
    <g strokeWidth={2.4}>
      <path d="M19 11c0 4 1 6 4 6M29 11c0 4-1 6-4 6M19 25c0-4 1-6 4-6M29 25c0-4-1-6-4-6" />
    </g>
  ),
  heart: <path d="M24 29C14 22 11 16 15 11.5c3-3 7-2 9 1.5 2-3.5 6-4.5 9-1.5 4 4.5 1 10.5-9 17.5Z" />,
  sparkle: (
    <>
      <path d="M22 6c1 7 3 9 9 10-6 1-8 3-9 10-1-7-3-9-9-10 6-1 8-3 9-10Z" />
      <path d="M36 21c.5 3 1.5 4 4 4.5-2.5.5-3.5 1.5-4 4.5-.5-3-1.5-4-4-4.5 2.5-.5 3.5-1.5 4-4.5Z" />
    </>
  ),
  pale: (
    <>
      <circle cx={24} cy={19} r={11} />
      <path d="M16 12v6M20 11v8M24 10.5v8.5M28 11v8M32 12v6" strokeWidth={1} />
    </>
  ),
  sigh: <path d="M13 22c-4-1-4-7 1-7 0-5 7-6 9-2 3-3 9-1 8 3 4 0 5 6 0 7-1 3-6 4-8 1-3 2-8 2-10-2ZM37 26l5 3" />,
  exclamation: (
    <>
      <path d="M24 7v14" strokeWidth={3.2} />
      <circle cx={24} cy={27.5} r={2} fill="currentColor" />
    </>
  ),
  question: (
    <>
      <path d="M18 12c0-4 3-6 6-6s6 2 6 5.5c0 4.5-6 5-6 10" strokeWidth={2.8} />
      <circle cx={24} cy={28} r={2} fill="currentColor" />
    </>
  ),
  note: <path d="M20 26V9l12-3v17M20 26a3.5 3 0 1 1-7 0 3.5 3 0 0 1 7 0ZM32 23a3.5 3 0 1 1-7 0 3.5 3 0 0 1 7 0Z" />,
  emphasisLines: <path d={radial(24, 8, 16)} strokeWidth={0.9} />,
  speedLines: <path d="M4 8h30M8 13h36M2 18h28M10 23h34M5 28h26" strokeWidth={1} />,
  flowers: (
    <>
      {[[14, 13], [32, 11], [24, 24], [38, 27], [9, 28]].map(([x, y]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx={0} cy={-3.2} rx={1.9} ry={2.8} transform={`rotate(${a})`} />
          ))}
        </g>
      ))}
    </>
  ),
};

/** Picture of a manga effect (sweat drop, anger vein, emphasis lines…). */
export default function MangaEffectIcon({ effect, className }: { effect: MangaEffectId; className?: string }) {
  return (
    <svg
      viewBox="0 0 48 36"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {ICONS[effect]}
    </svg>
  );
}
