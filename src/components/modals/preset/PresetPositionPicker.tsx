import { useCallback, useRef, useState } from "react";
import { User } from "lucide-react";
import { useGenerationParamsStore } from "@/stores/generation-params-store";

const RECT_MAX_W = 160;
const RECT_MAX_H = 120;

function clamp01(v: number) {
  return Math.round(Math.max(0, Math.min(1, v)) * 100) / 100;
}

interface Props {
  x: number;
  y: number;
  onChange: (x: number, y: number) => void;
  color?: string;
  label?: string;
  peerX?: number;
  peerY?: number;
  peerColor?: string;
}

/**
 * Reusable position picker for the preset editor. Mirrors the sidebar
 * PositionEditor drag/click interaction but without any generation-params
 * side effects — it just emits x/y in [0,1].
 */
export default function PresetPositionPicker({
  x, y, onChange, color = "var(--primary)", label, peerX, peerY, peerColor,
}: Props) {
  const width = useGenerationParamsStore((s) => s.width);
  const height = useGenerationParamsStore((s) => s.height);
  const rectRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const aspect = width / height;
  let rectW: number;
  let rectH: number;
  if (aspect >= 1) {
    rectW = RECT_MAX_W;
    rectH = RECT_MAX_W / aspect;
    if (rectH > RECT_MAX_H) { rectH = RECT_MAX_H; rectW = RECT_MAX_H * aspect; }
  } else {
    rectH = RECT_MAX_H;
    rectW = RECT_MAX_H * aspect;
    if (rectW > RECT_MAX_W) { rectW = RECT_MAX_W; rectH = RECT_MAX_W / aspect; }
  }

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setDragging(true);
      const rect = rectRef.current?.getBoundingClientRect();
      if (rect) {
        onChange(
          clamp01((e.clientX - rect.left) / rect.width),
          clamp01((e.clientY - rect.top) / rect.height),
        );
      }
      const move = (ev: MouseEvent) => {
        const r = rectRef.current?.getBoundingClientRect();
        if (!r) return;
        onChange(
          clamp01((ev.clientX - r.left) / r.width),
          clamp01((ev.clientY - r.top) / r.height),
        );
      };
      const up = () => {
        setDragging(false);
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    },
    [onChange],
  );

  return (
    <div className="space-y-1">
      {label && (
        <div className="text-[10px] text-muted-foreground">
          {label}: {x.toFixed(2)}, {y.toFixed(2)}
        </div>
      )}
      <div
        ref={rectRef}
        role="presentation"
        className="relative rounded border border-border bg-muted/30"
        style={{ width: rectW, height: rectH, cursor: dragging ? "grabbing" : "crosshair" }}
        onMouseDown={handleMouseDown}
      >
        {peerX != null && peerY != null && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${peerX * 100}%`, top: `${peerY * 100}%` }}
          >
            <User style={{ width: 14, height: 14, color: peerColor ?? "var(--muted-foreground)", opacity: 0.4 }} />
          </div>
        )}
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${x * 100}%`, top: `${y * 100}%`, zIndex: 10 }}
        >
          <User style={{ width: 18, height: 18, color }} />
        </div>
      </div>
    </div>
  );
}
