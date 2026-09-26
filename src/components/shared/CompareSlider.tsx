import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface CompareSliderProps {
  before: string;
  after: string;
  /** width / height of the images, for the frame's aspect ratio */
  aspect: number;
}

/** Before / after comparison: drag the divider to reveal the result. */
export default function CompareSlider({ before, after, aspect }: CompareSliderProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(50);

  const update = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };

  return (
    <div
      ref={ref}
      className="editor-checker relative max-h-full max-w-full cursor-ew-resize touch-none select-none overflow-hidden rounded-md"
      style={{ aspectRatio: aspect, height: "100%" }}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); update(e.clientX); }}
      onPointerMove={(e) => { if (e.buttons) update(e.clientX); }}
      role="slider"
      aria-valuenow={Math.round(pos)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={t("tools.compare")}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 5));
        if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 5));
      }}
    >
      <img src={before} alt="" draggable={false} className="absolute inset-0 h-full w-full object-contain" />
      <img
        src={after}
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full object-contain"
        style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
      />
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${pos}%` }}>
        <div className="absolute top-1/2 left-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white bg-black/50 text-[10px] text-white">
          ⇆
        </div>
      </div>
      <span className="pointer-events-none absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">{t("tools.before")}</span>
      <span className="pointer-events-none absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">{t("tools.after")}</span>
    </div>
  );
}
