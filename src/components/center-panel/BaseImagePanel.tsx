import { useTranslation } from "react-i18next";
import { Brush, FolderOpen, ImagePlay, ImageUp, SquareDashed, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useImageEditStore, type EditMode } from "@/stores/image-edit-store";
import { useGenerationStore } from "@/stores/generation-store";
import { useImageSourceActions } from "@/hooks/use-image-source-actions";

/** Qualitative label for a 0–1 strength so the slider reads at a glance. */
function strengthLevel(v: number): "low" | "mid" | "high" {
  return v < 0.35 ? "low" : v < 0.65 ? "mid" : "high";
}

function ParamSlider({ label, hint, value, min, max, step, onChange }: {
  label: string; hint?: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  return (
    <label className="flex min-w-44 flex-1 items-center gap-2 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={([v]) => onChange(Math.round(v * 100) / 100)} className="flex-1" />
      <span className="w-8 shrink-0 text-right tabular">{value.toFixed(2)}</span>
      {hint && <span className="w-10 shrink-0 text-[10px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

/**
 * The img2img / inpaint base image: preview with paint + mask overlay, mode
 * switch and the mode's parameters. Hidden while no base image is set.
 */
export default function BaseImagePanel() {
  const { t } = useTranslation();
  const s = useImageEditStore();
  const lastResult = useGenerationStore((st) => st.lastResult);
  const { setAsBase } = useImageSourceActions();
  if (!s.base) return null;

  const pickFile = async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const path = await open({ multiple: false, filters: [{ name: "Image", extensions: ["png", "jpg", "jpeg", "webp"] }] });
    if (typeof path === "string") setAsBase({ path }, s.mode);
  };

  const modeButton = (mode: EditMode, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => s.setMode(mode)}
      className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
        s.enabled && s.mode === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {icon}
      {t(`imageEdit.mode.${mode}`)}
    </button>
  );

  const aspect = `${s.base.width} / ${s.base.height}`;
  const inpaint = s.mode === "inpaint";

  return (
    <div className={`flex gap-3 border-t border-border px-3 py-2 ${s.enabled ? "" : "opacity-60"}`}>
      <button
        type="button"
        onClick={() => s.openEditor(inpaint ? "mask" : "paint")}
        title={t("imageEdit.openEditor")}
        className="editor-checker relative h-16 shrink-0 overflow-hidden rounded border border-border hover:border-primary"
        style={{ aspectRatio: aspect }}
      >
        <img src={s.base.src} alt="" className="absolute inset-0 h-full w-full" />
        {s.paintSrc && <img src={s.paintSrc} alt="" className="absolute inset-0 h-full w-full" />}
        {inpaint && s.maskSrc && <img src={s.maskSrc} alt="" className="absolute inset-0 h-full w-full opacity-50" />}
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Switch checked={s.enabled} onCheckedChange={s.setEnabled} aria-label={t("imageEdit.enabled")} />
          <div className="flex rounded-md border border-border p-0.5">
            {modeButton("img2img", <ImagePlay className="h-3.5 w-3.5" />)}
            {modeButton("inpaint", <SquareDashed className="h-3.5 w-3.5" />)}
          </div>
          <span className="text-[11px] tabular text-muted-foreground" title={t("imageEdit.outputSizeHint")}>
            {t("imageEdit.outputSize", { w: s.targetWidth, h: s.targetHeight })}
          </span>
          <div className="ml-auto flex items-center gap-0.5">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => s.openEditor(inpaint ? "mask" : "paint")}>
              {inpaint ? <SquareDashed className="mr-1 h-3.5 w-3.5" /> : <Brush className="mr-1 h-3.5 w-3.5" />}
              {t(inpaint ? "imageEdit.editMask" : "imageEdit.editPaint")}
            </Button>
            <Button
              variant="ghost" size="icon" className="h-7 w-7" disabled={!lastResult}
              title={t("imageEdit.replaceWithCurrent")}
              onClick={() => lastResult && setAsBase({ imageId: lastResult.id }, s.mode)}
            >
              <ImageUp className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title={t("imageEdit.openFile")} onClick={pickFile}>
              <FolderOpen className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title={t("imageEdit.clearBase")} onClick={s.clear}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {inpaint ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className={`text-xs ${s.maskBase64 ? "text-muted-foreground" : "text-destructive"}`}>
              {s.maskBase64
                ? t("imageEdit.maskCoverage", { percent: Math.max(1, Math.round(s.maskCoverage * 100)) })
                : t("imageEdit.inpaintNeedsMask")}
            </span>
            <ParamSlider
              label={t("imageEdit.inpaintStrength")}
              hint={t(`imageEdit.level.${strengthLevel(s.inpaintStrength)}`)}
              value={s.inpaintStrength} min={0.01} max={1} step={0.01}
              onChange={(v) => s.setParam("inpaintStrength", v)}
            />
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground" title={t("imageEdit.colorCorrectHint")}>
              <Checkbox checked={s.colorCorrect} onCheckedChange={(v) => s.setParam("colorCorrect", v === true)} />
              {t("imageEdit.colorCorrect")}
            </label>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <ParamSlider
              label={t("imageEdit.strength")}
              hint={t(`imageEdit.level.${strengthLevel(s.img2imgStrength)}`)}
              value={s.img2imgStrength} min={0.01} max={0.99} step={0.01}
              onChange={(v) => s.setParam("img2imgStrength", v)}
            />
            <ParamSlider
              label={t("imageEdit.noise")}
              value={s.img2imgNoise} min={0} max={0.99} step={0.01}
              onChange={(v) => s.setParam("img2imgNoise", v)}
            />
          </div>
        )}
        <p className="text-[10px] text-muted-foreground">
          {t(inpaint ? "imageEdit.inpaintHelp" : "imageEdit.img2imgHelp")}
        </p>
      </div>
    </div>
  );
}
