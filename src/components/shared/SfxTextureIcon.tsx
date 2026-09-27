import { useId } from "react";
import type { SfxTexture } from "@/lib/sound-effects";

const SAMPLE: Record<SfxTexture, string> = {
  standard: "ドキッ",
  impact: "ドン",
  sharp: "シュッ",
  light: "パタ",
  liquid: "チョロ",
  ominous: "ゴゴゴ",
  silence: "シーン",
};

/** Sample onomatopoeia drawn roughly the way a sound-effect texture looks. */
export default function SfxTextureIcon({ texture, className }: { texture: SfxTexture; className?: string }) {
  const id = useId().replace(/:/g, "");
  const wave = `wave-${id}`;
  const rough = `rough-${id}`;
  const base = { x: 24, y: 23, textAnchor: "middle" as const, fill: "currentColor" };

  return (
    <svg viewBox="0 0 48 36" className={className} aria-hidden>
      <defs>
        <filter id={wave}>
          <feTurbulence type="turbulence" baseFrequency="0.08 0.2" numOctaves={1} seed={4} />
          <feDisplacementMap in="SourceGraphic" scale={4} />
        </filter>
        <filter id={rough}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={2} />
          <feDisplacementMap in="SourceGraphic" scale={2} />
        </filter>
      </defs>
      {texture === "standard" && <text {...base} fontSize={14} fontWeight={700}>{SAMPLE.standard}</text>}
      {texture === "impact" && (
        <text
          {...base} y={27} fontSize={24} fontWeight={900} filter={`url(#${rough})`}
          stroke="currentColor" strokeWidth={0.8}
        >
          {SAMPLE.impact}
        </text>
      )}
      {texture === "sharp" && (
        <>
          <text {...base} fontSize={15} fontWeight={800} transform="skewX(-22) translate(8 0)">{SAMPLE.sharp}</text>
          <path d="M3 30h12M6 33h14" stroke="currentColor" strokeWidth={1} strokeLinecap="round" />
        </>
      )}
      {texture === "light" && <text {...base} fontSize={13} fontWeight={500} transform="rotate(-8 24 18)">{SAMPLE.light}</text>}
      {texture === "liquid" && (
        <text {...base} fontSize={13} fontWeight={600} filter={`url(#${wave})`}>{SAMPLE.liquid}</text>
      )}
      {texture === "ominous" && (
        <>
          <text x={4} y={14} fontSize={10} fontWeight={900} fill="currentColor" opacity={0.5}>ゴ</text>
          <text {...base} y={26} fontSize={14} fontWeight={900} filter={`url(#${rough})`}>{SAMPLE.ominous}</text>
          <text x={38} y={34} fontSize={10} fontWeight={900} fill="currentColor" opacity={0.5}>ゴ</text>
        </>
      )}
      {texture === "silence" && <text {...base} fontSize={11} fontWeight={300} letterSpacing={2}>{SAMPLE.silence}</text>}
    </svg>
  );
}
