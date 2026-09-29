import { useTranslation } from "react-i18next";
import { Copy, Trash2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import BubbleShapeIcon from "@/components/shared/BubbleShapeIcon";
import { fontFamily } from "@/lib/typeset-render";
import { FRAMES_WITH_TAIL, TYPESET_FONTS, TYPESET_FRAMES, type TypesetBox, type TypesetFrame } from "@/lib/typeset";
import type { BubbleShape } from "@/lib/bubble-styles";

const FRAME_ICON: Record<TypesetFrame, BubbleShape> = {
  none: "plain", round: "round", rect: "rect", spiky: "spiky", cloud: "cloud",
};
const SWATCHES = ["#000000", "#ffffff", "#e11d48", "#2563eb", "#16a34a"];

const seg = (on: boolean) =>
  `rounded px-2 py-1 text-xs transition-colors ${on ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`;

/** Properties of the selected text box. `key` groups continuous edits of one field into one undo step. */
export default function TypesetInspector({ box, onChange, onDuplicate, onDelete }: {
  box: TypesetBox;
  onChange: (patch: Partial<TypesetBox>, key?: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const hasTail = FRAMES_WITH_TAIL.includes(box.frame);

  return (
    <div className="space-y-3">
      <textarea
        value={box.text}
        onChange={(e) => onChange({ text: e.target.value }, `text-${box.id}`)}
        aria-label={t("typeset.text")}
        placeholder={t("typeset.textPlaceholder")}
        rows={4}
        className="block w-full resize-y rounded-md border border-input bg-background px-2 py-1.5 text-sm leading-relaxed outline-none focus-visible:border-ring"
      />

      <div className="flex items-center gap-2">
        <div className="flex rounded-md border border-border p-px">
          <button type="button" aria-pressed={box.vertical} className={seg(box.vertical)} onClick={() => onChange({ vertical: true })}>
            {t("typeset.vertical")}
          </button>
          <button type="button" aria-pressed={!box.vertical} className={seg(!box.vertical)} onClick={() => onChange({ vertical: false })}>
            {t("typeset.horizontal")}
          </button>
        </div>
        <div className="flex rounded-md border border-border p-px">
          {TYPESET_FONTS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={box.font === f}
              title={t(`typeset.font.${f}`)}
              className={seg(box.font === f)}
              style={{ fontFamily: fontFamily(f) }}
              onClick={() => onChange({ font: f })}
            >
              {t(`typeset.fontShort.${f}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-[10px] text-muted-foreground">{t("typeset.size")}</p>
        <Slider
          value={[box.size * 1000]}
          min={12}
          max={120}
          step={1}
          onValueChange={([v]) => onChange({ size: v / 1000 }, `size-${box.id}`)}
          aria-label={t("typeset.size")}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={c}
            aria-pressed={box.color === c}
            onClick={() => onChange({ color: c })}
            className={`h-5 w-5 rounded-full border ${box.color === c ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : "border-border"}`}
            style={{ background: c }}
          />
        ))}
        <input
          type="color"
          value={box.color}
          onChange={(e) => onChange({ color: e.target.value }, `color-${box.id}`)}
          aria-label={t("typeset.color")}
          className="h-5 w-7 cursor-pointer rounded border border-border bg-transparent"
        />
        <button type="button" aria-pressed={box.bold} className={seg(box.bold)} onClick={() => onChange({ bold: !box.bold })}>
          <b>{t("typeset.bold")}</b>
        </button>
        <button type="button" aria-pressed={box.outline} className={seg(box.outline)} onClick={() => onChange({ outline: !box.outline })} title={t("typeset.outlineHint")}>
          {t("typeset.outline")}
        </button>
      </div>

      <div className="space-y-1">
        <p className="text-[10px] text-muted-foreground">{t("typeset.frameLabel")}</p>
        <div className="grid grid-cols-5 gap-1">
          {TYPESET_FRAMES.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={box.frame === f}
              title={t(`typeset.frame.${f}`)}
              onClick={() => onChange({ frame: f })}
              className={`flex flex-col items-center gap-0.5 rounded-md border p-1 transition-colors ${
                box.frame === f ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              <BubbleShapeIcon shape={FRAME_ICON[f]} className="h-5 w-7" />
              <span className="text-[9px] leading-tight">{t(`typeset.frame.${f}`)}</span>
            </button>
          ))}
        </div>
        {hasTail && (
          <label className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={box.tail != null}
              onChange={(e) => onChange({ tail: e.target.checked ? { x: Math.max(0, box.x - 0.06), y: Math.min(1, box.y + 0.12) } : null })}
            />
            {t("typeset.tail")}
          </label>
        )}
      </div>

      <div className="flex gap-1">
        <button type="button" onClick={onDuplicate} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground">
          <Copy className="h-3.5 w-3.5" />{t("typeset.duplicate")}
        </button>
        <button type="button" onClick={onDelete} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />{t("typeset.delete")}
        </button>
      </div>
    </div>
  );
}
