import type { ReactNode } from "react";
import type { BubbleShape } from "@/lib/bubble-styles";

const CX = 24;
const CY = 15;

function closedPath(points: Array<[number, number]>): string {
  return `M${points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`;
}

/** Ellipse outline whose radius is scaled per angle by `scale(θ)`. */
function polar(rx: number, ry: number, n: number, scale: (theta: number, i: number) => number): string {
  return closedPath(Array.from({ length: n }, (_, i) => {
    const th = (i / n) * Math.PI * 2;
    const s = scale(th, i);
    return [CX + Math.cos(th) * rx * s, CY + Math.sin(th) * ry * s];
  }));
}

/** Cloud: arcs bulging outward between points on an ellipse. */
function cloudPath(rx: number, ry: number, bumps: number): string {
  const pts = Array.from({ length: bumps }, (_, i) => {
    const th = (i / bumps) * Math.PI * 2;
    return [CX + Math.cos(th) * rx, CY + Math.sin(th) * ry] as const;
  });
  const [x0, y0] = pts[0];
  return `M${x0.toFixed(1)} ${y0.toFixed(1)}${pts.map((_, i) => {
    const [x, y] = pts[(i + 1) % bumps];
    return `A4.6 4.6 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join("")}Z`;
}

function flashLines(): string {
  return Array.from({ length: 32 }, (_, i) => {
    const th = (i / 32) * Math.PI * 2;
    const inner = i % 2 ? 0.55 : 0.68;
    const x1 = CX + Math.cos(th) * 13 * inner;
    const y1 = CY + Math.sin(th) * 10 * inner;
    const x2 = CX + Math.cos(th) * 22;
    const y2 = CY + Math.sin(th) * 15;
    return `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }).join("");
}

const TEXT_HINT = <path d="M18 13h12M20 17.5h8" strokeWidth={1.6} opacity={0.55} />;
/** Faint frame standing for the whole picture / screen */
const SCREEN = <rect x={2.5} y={2.5} width={43} height={31} rx={1.5} opacity={0.3} />;
const TAIL = <path d="M16.5 24.5 12 33l9.5-7.6" />;

const SHAPES: Record<BubbleShape, ReactNode> = {
  round: <><ellipse cx={CX} cy={CY} rx={19} ry={11.5} />{TAIL}{TEXT_HINT}</>,
  spiky: <><path d={polar(22, 15.5, 18, (_, i) => (i % 2 ? 0.7 : 1))} />{TEXT_HINT}</>,
  jagged: <><path d={polar(20, 12.5, 30, (_, i) => (i % 2 ? 0.9 : 1))} />{TAIL}{TEXT_HINT}</>,
  wavy: (
    <>
      <path d={polar(19, 11.5, 120, (th) => 1 + 0.1 * Math.sin(th * 13))} />
      <path d="M16.5 24.5c-1 2-3 2.5-2.5 4.5s-2 2.5-2 4.5c2-1.5 5-4 9.5-7.6" />
      {TEXT_HINT}
    </>
  ),
  dashed: (
    <g strokeDasharray="2.6 2">
      <ellipse cx={CX} cy={CY} rx={19} ry={11.5} />{TAIL}{TEXT_HINT}
    </g>
  ),
  cloud: (
    <>
      <path d={cloudPath(16, 9, 9)} />
      <circle cx={13} cy={29.5} r={2.2} /><circle cx={9} cy={33.5} r={1.3} />
      {TEXT_HINT}
    </>
  ),
  rect: <><rect x={5} y={5} width={38} height={24} rx={0.5} />{TEXT_HINT}</>,
  flash: <path d={flashLines()} strokeWidth={0.9} />,
  electric: <><ellipse cx={CX} cy={CY} rx={19} ry={11.5} /><path d="M17 25.5 13 29.5h5.5L11.5 35.5" />{TEXT_HINT}</>,
  dark: (
    <>
      <ellipse cx={CX} cy={CY} rx={19} ry={11.5} fill="currentColor" />
      <path d="M16.5 24.5 12 33l9.5-7.6" fill="currentColor" />
      <path d="M18 13h12M20 17.5h8" strokeWidth={1.6} className="stroke-background" />
    </>
  ),
  square: <><rect x={6} y={4} width={36} height={21} /><path d="M14 25 10 33.5 21 25" />{TEXT_HINT}</>,
  heart: (
    <>
      <path d="M24 32C11 24 4.5 16.5 9.5 8.5 14 3 20.5 4.5 24 10c3.5-5.5 10-7 14.5-1.5C43.5 16.5 37 24 24 32Z" />
      <path d="M19.5 14.5h9M21 18.5h6" strokeWidth={1.6} opacity={0.55} />
    </>
  ),
  sfx: (
    <>
      <text
        x={24} y={24} textAnchor="middle" fontSize={17} fontWeight={900} fill="currentColor" stroke="none"
        transform="skewX(-12) translate(4 0)"
      >
        ドン
      </text>
      <path d="M5 8l4 3M4 16h5M43 8l-4 3M44 16h-5" />
    </>
  ),
  handwritten: (
    <path d="M7 19c2-6 5-8 5-3s-2 7 1 6 4-9 6-8-1 8 2 8 3-6 5-6 0 6 3 6 3-5 5-5 1 5 3 5M8 27c9-1.5 22-1.5 32 0" />
  ),
  plain: (
    <text x={24} y={23} textAnchor="middle" fontSize={16} fontWeight={600} fill="currentColor" stroke="none">
      Aa
    </text>
  ),
  window: (
    <>
      {SCREEN}
      <rect x={6} y={19} width={36} height={12} rx={2} />
      <rect x={8} y={15} width={12} height={4.5} rx={1} />
      <path d="M10 24h20M10 27.5h14" strokeWidth={1.4} opacity={0.55} />
    </>
  ),
  rpg: (
    <>
      {SCREEN}
      <rect x={5} y={17} width={38} height={15} fill="currentColor" />
      <rect x={7} y={19} width={34} height={11} className="stroke-background" />
      <path d="M10 23h18M10 26.5h12" strokeWidth={1.4} className="stroke-background" />
    </>
  ),
  chat: (
    <>
      <rect x={4} y={5} width={24} height={9} rx={4.5} />
      <rect x={18} y={19} width={26} height={9} rx={4.5} fill="currentColor" fillOpacity={0.25} />
      <path d="M8 9.5h14M23 23.5h15" strokeWidth={1.4} opacity={0.55} />
    </>
  ),
  subtitle: <>{SCREEN}<path d="M11 24h26M15 29h18" strokeWidth={2.2} /></>,
  telop: (
    <text
      x={24} y={23} textAnchor="middle" fontSize={11.5} fontWeight={900} fill="currentColor"
      strokeWidth={2.4} className="stroke-background" paintOrder="stroke"
    >
      テロップ
    </text>
  ),
  hud: (
    <>
      <path d="M8 6h28l5 5v17l-4 4H8l-4-4V10Z" />
      <path d="M8 10h7M33 28h5" strokeWidth={2} />
      <path d="M11 16h22M11 21h16" strokeWidth={1.4} opacity={0.55} />
    </>
  ),
};

/** Picture of a dialogue kind (speech bubble shape, narration box, sound effect…). */
export default function BubbleShapeIcon({ shape, className }: { shape: BubbleShape; className?: string }) {
  return (
    <svg
      viewBox="0 0 48 36"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {SHAPES[shape]}
    </svg>
  );
}
