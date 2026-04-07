interface PositionSlidersProps {
  centerX: number;
  centerY: number;
  onChangeX: (value: number) => void;
  onChangeY: (value: number) => void;
}

export default function PositionSliders({ centerX, centerY, onChangeX, onChangeY }: PositionSlidersProps) {
  return (
    <div className="space-y-1">
      {/* TODO: implement X/Y position sliders */}
      <p className="text-xs text-muted-foreground">
        Position: {centerX.toFixed(2)}, {centerY.toFixed(2)}
      </p>
      <input type="range" min={0} max={1} step={0.01} value={centerX} onChange={(e) => onChangeX(Number(e.target.value))} className="w-full" />
      <input type="range" min={0} max={1} step={0.01} value={centerY} onChange={(e) => onChangeY(Number(e.target.value))} className="w-full" />
    </div>
  );
}
