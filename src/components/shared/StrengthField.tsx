import { useState } from "react";
import { Slider } from "@/components/ui/slider";

const SLIDER_MAX = 3;
const INPUT_MAX = 10;

const round2 = (v: number) => Math.round(v * 100) / 100;

interface StrengthFieldProps {
  value: number;
  onChange: (value: number) => void;
  /** Tailwind text size for the number box. */
  textClass?: string;
}

/**
 * Slider (0–3, 0.01 steps) plus a number box accepting 0–10 with two decimals.
 * 0 means "no weight" and is shown as —.
 */
export default function StrengthField({ value, onChange, textClass = "text-[10px]" }: StrengthFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const n = Number(draft);
    if (draft.trim() !== "" && Number.isFinite(n)) onChange(round2(Math.min(INPUT_MAX, Math.max(0, n))));
    setDraft(null);
  };

  return (
    <>
      <Slider
        min={0}
        max={Math.max(SLIDER_MAX, value)}
        step={0.01}
        value={[value]}
        onValueChange={([v]) => onChange(round2(v))}
        className="flex-1"
      />
      <input
        type="number"
        inputMode="decimal"
        min={0}
        max={INPUT_MAX}
        step={0.01}
        value={draft ?? (value === 0 ? "" : value.toFixed(2))}
        placeholder="—"
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          else if (e.key === "Escape") setDraft(null);
        }}
        className={`h-5 w-11 shrink-0 rounded border border-border bg-background px-1 text-right tabular outline-none focus:border-ring [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none ${textClass}`}
      />
    </>
  );
}
