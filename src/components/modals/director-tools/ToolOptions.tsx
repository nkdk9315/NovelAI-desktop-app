import { useTranslation } from "react-i18next";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { EMOTIONS, MAX_DEFRY } from "@/lib/constants";
import type { DirectorTool } from "./tool-defs";

export interface ToolOptionValues {
  prompt: string;
  emotion: string;
  defry: number;
}

interface ToolOptionsProps {
  tool: DirectorTool;
  values: ToolOptionValues;
  onChange: (partial: Partial<ToolOptionValues>) => void;
}

/** Prompt / emotion / defry controls for colorize and emotion. */
export default function ToolOptions({ tool, values, onChange }: ToolOptionsProps) {
  const { t } = useTranslation();
  if (tool !== "colorize" && tool !== "emotion") return null;

  return (
    <div className="space-y-3">
      {tool === "emotion" && (
        <div className="grid grid-cols-8 gap-1">
          {EMOTIONS.map((e) => (
            <button
              key={e.key}
              type="button"
              onClick={() => onChange({ emotion: e.key })}
              className={`flex flex-col items-center rounded-md border px-1 py-1.5 text-[10px] transition-colors ${
                values.emotion === e.key
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <span className="text-lg leading-none">{e.emoji}</span>
              <span className="mt-1 truncate">{t(`tools.emotions.${e.key}`)}</span>
            </button>
          ))}
        </div>
      )}

      {tool === "colorize" && (
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">{t("tools.colorizePrompt")}</span>
          <Textarea
            value={values.prompt}
            onChange={(e) => onChange({ prompt: e.target.value })}
            placeholder={t("tools.colorizePlaceholder")}
            className="min-h-14 text-xs"
          />
        </div>
      )}

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t("tools.defry")}</span>
          <span className="tabular">{t(`tools.defryLevel.${values.defry}`)}</span>
        </div>
        <Slider min={0} max={MAX_DEFRY} step={1} value={[values.defry]} onValueChange={([v]) => onChange({ defry: v })} />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{t("tools.defryStrong")}</span>
          <span>{t("tools.defryWeak")}</span>
        </div>
      </div>
    </div>
  );
}
