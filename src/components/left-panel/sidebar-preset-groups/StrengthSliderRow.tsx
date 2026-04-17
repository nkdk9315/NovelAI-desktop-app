import { Slider } from "@/components/ui/slider";

interface Props {
  label: string;
  value: number;
  onChange: (v: number) => void;
  placeholderHint?: string;
}

const MIN = 1.0;
const MAX = 10.0;
const STEP = 0.1;

function roundOneDecimal(v: number): number {
  return Math.round(v * 10) / 10;
}

export default function StrengthSliderRow({ label, value, onChange, placeholderHint }: Props) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs text-muted-foreground">{label}</label>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={MIN}
            max={MAX}
            step={STEP}
            value={value}
            onChange={(e) => {
              const parsed = parseFloat(e.target.value);
              if (Number.isNaN(parsed)) return;
              const clamped = Math.min(Math.max(parsed, MIN), MAX);
              onChange(roundOneDecimal(clamped));
            }}
            className="h-6 w-14 rounded border border-border bg-background px-1 text-xs font-mono"
          />
        </div>
      </div>
      <Slider
        min={MIN}
        max={MAX}
        step={STEP}
        value={[value]}
        onValueChange={([v]) => onChange(roundOneDecimal(v))}
        className="[&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-range]]:h-1"
      />
      {placeholderHint && (
        <p className="text-[10px] text-muted-foreground">{placeholderHint}</p>
      )}
    </div>
  );
}
