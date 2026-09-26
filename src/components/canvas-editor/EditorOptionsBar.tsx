import { useTranslation } from "react-i18next";
import {
  Brush, Eraser, FlipVertical2, Grid3x3, PaintBucket, Pipette, Redo2, Square, Trash2, Undo2,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import type { EditorLayer } from "@/stores/image-edit-store";
import type { BrushSettings, EditorTool } from "./use-canvas-layers";

const SWATCHES = [
  "#000000", "#ffffff", "#7f7f7f", "#f3d2c1", "#e0a98a", "#8a5a44",
  "#e53935", "#fb8c00", "#fdd835", "#43a047", "#1e88e5", "#8e24aa",
];

interface EditorOptionsBarProps {
  layer: EditorLayer;
  brush: BrushSettings;
  onBrush: (partial: Partial<BrushSettings>) => void;
  showGrid: boolean;
  onShowGrid: (v: boolean) => void;
  maskCoverage: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onFillMask: () => void;
  onInvertMask: () => void;
}

function IconButton({ active, label, onClick, disabled, children }: {
  active?: boolean; label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:opacity-40 ${
        active ? "border-primary bg-primary/15 text-primary" : "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

/** Tool, brush and layer-action controls shown under the editor header. */
export default function EditorOptionsBar(p: EditorOptionsBarProps) {
  const { t } = useTranslation();
  const tools: Array<{ tool: EditorTool; icon: React.ReactNode; key: string }> = p.layer === "paint"
    ? [
        { tool: "brush", icon: <Brush className="h-4 w-4" />, key: "brush" },
        { tool: "eraser", icon: <Eraser className="h-4 w-4" />, key: "eraser" },
        { tool: "eyedropper", icon: <Pipette className="h-4 w-4" />, key: "eyedropper" },
      ]
    : [
        { tool: "brush", icon: <Brush className="h-4 w-4" />, key: "maskBrush" },
        { tool: "eraser", icon: <Eraser className="h-4 w-4" />, key: "eraser" },
        { tool: "rect", icon: <Square className="h-4 w-4" />, key: "rect" },
      ];
  const divider = <div className="mx-1 h-6 w-px bg-border" />;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2 text-xs">
      <div className="flex items-center gap-0.5">
        {tools.map(({ tool, icon, key }) => (
          <IconButton key={tool} active={p.brush.tool === tool} label={t(`imageEdit.tools.${key}`)} onClick={() => p.onBrush({ tool })}>
            {icon}
          </IconButton>
        ))}
      </div>
      {divider}
      <label className="flex items-center gap-2">
        <span className="text-muted-foreground">{t("imageEdit.brushSize")}</span>
        <Slider min={2} max={300} step={1} value={[p.brush.size]} onValueChange={([v]) => p.onBrush({ size: v })} className="w-28" />
        <span className="w-8 tabular text-right">{p.brush.size}</span>
      </label>
      {p.layer === "paint" && (
        <>
          <label className="flex items-center gap-2">
            <span className="text-muted-foreground">{t("imageEdit.opacity")}</span>
            <Slider min={0.05} max={1} step={0.05} value={[p.brush.opacity]} onValueChange={([v]) => p.onBrush({ opacity: v })} className="w-20" />
            <span className="w-8 tabular text-right">{Math.round(p.brush.opacity * 100)}%</span>
          </label>
          {divider}
          <div className="flex items-center gap-1">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => p.onBrush({ color: c, tool: "brush" })}
                className={`h-5 w-5 rounded-sm border ${p.brush.color === c ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : "border-border"}`}
                style={{ backgroundColor: c }}
              />
            ))}
            <input
              type="color"
              value={p.brush.color}
              onChange={(e) => p.onBrush({ color: e.target.value, tool: "brush" })}
              title={t("imageEdit.customColor")}
              className="h-6 w-8 cursor-pointer rounded border border-border bg-transparent"
            />
          </div>
        </>
      )}
      {p.layer === "mask" && (
        <>
          {divider}
          <IconButton label={t("imageEdit.fillMask")} onClick={p.onFillMask}><PaintBucket className="h-4 w-4" /></IconButton>
          <IconButton label={t("imageEdit.invertMask")} onClick={p.onInvertMask}><FlipVertical2 className="h-4 w-4" /></IconButton>
          <IconButton active={p.showGrid} label={t("imageEdit.showGrid")} onClick={() => p.onShowGrid(!p.showGrid)}>
            <Grid3x3 className="h-4 w-4" />
          </IconButton>
          <span className="tabular text-muted-foreground" title={t("imageEdit.coverageHint")}>
            {t("imageEdit.coverage", { percent: Math.round(p.maskCoverage * 100) })}
          </span>
        </>
      )}
      <div className="ml-auto flex items-center gap-0.5">
        <IconButton label={t("imageEdit.undo")} onClick={p.onUndo} disabled={!p.canUndo}><Undo2 className="h-4 w-4" /></IconButton>
        <IconButton label={t("imageEdit.redo")} onClick={p.onRedo} disabled={!p.canRedo}><Redo2 className="h-4 w-4" /></IconButton>
        <IconButton label={t(p.layer === "paint" ? "imageEdit.clearPaint" : "imageEdit.clearMask")} onClick={p.onClear}>
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </div>
    </div>
  );
}
