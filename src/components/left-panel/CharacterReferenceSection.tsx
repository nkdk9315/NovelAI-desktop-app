import { useTranslation } from "react-i18next";
import { AlertTriangle, FolderOpen, ImageUp, UserSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useCharRefStore } from "@/stores/char-ref-store";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { useGenerationStore } from "@/stores/generation-store";
import { useImageSourceActions } from "@/hooks/use-image-source-actions";
import { supportsCharacterReference } from "@/lib/constants";
import type { CharRefMode } from "@/types";

const MODES: CharRefMode[] = ["character&style", "character", "style"];
const modeKey = (m: CharRefMode) => (m === "character&style" ? "characterAndStyle" : m);

/** Character Reference (V4.5): keep a character's look / style from one image. */
export default function CharacterReferenceSection() {
  const { t } = useTranslation();
  const c = useCharRefStore();
  const model = useGenerationParamsStore((s) => s.model);
  const lastResult = useGenerationStore((s) => s.lastResult);
  const { setAsCharacterReference } = useImageSourceActions();
  const supported = supportsCharacterReference(model);

  const pickFile = async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const path = await open({ multiple: false, filters: [{ name: "Image", extensions: ["png", "jpg", "jpeg", "webp"] }] });
    if (typeof path === "string") setAsCharacterReference({ path });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <UserSquare className="h-3 w-3 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground">{t("charRef.title")}</p>
          <span className="rounded bg-muted px-1 text-[9px] text-muted-foreground">+5 Anlas</span>
        </div>
        {c.image && <Switch checked={c.enabled} onCheckedChange={c.setEnabled} aria-label={t("charRef.enabled")} />}
      </div>

      {!supported && (
        <p className="flex items-start gap-1 text-[11px] text-amber-600 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          {t("charRef.unsupported")}
        </p>
      )}

      {c.image ? (
        <div className={`flex gap-3 ${c.enabled && supported ? "" : "opacity-50"}`}>
          <div className="relative h-24 shrink-0 overflow-hidden rounded border border-border" style={{ aspectRatio: `${c.image.width} / ${c.image.height}` }}>
            <img src={c.image.src} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              aria-label={t("common.delete")}
              onClick={() => c.setImage(null)}
              className="absolute right-0.5 top-0.5 rounded bg-black/60 p-0.5 text-white hover:bg-black/80"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap gap-1">
              {MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => c.setMode(m)}
                  title={t(`charRef.modes.${modeKey(m)}Hint`)}
                  className={`rounded border px-1.5 py-0.5 text-[10px] ${
                    c.mode === m ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t(`charRef.modes.${modeKey(m)}`)}
                </button>
              ))}
            </div>
            {([["strength", c.strength, c.setStrength], ["fidelity", c.fidelity, c.setFidelity]] as const).map(([key, value, set]) => (
              <label key={key} className="flex items-center gap-2 text-[11px]" title={t(`charRef.${key}Hint`)}>
                <span className="w-10 shrink-0 text-muted-foreground">{t(`charRef.${key}`)}</span>
                <Slider min={0} max={1} step={0.05} value={[value]} onValueChange={([v]) => set(Math.round(v * 100) / 100)} className="flex-1" />
                <span className="w-7 text-right tabular">{value.toFixed(2)}</span>
              </label>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="h-7 flex-1 text-xs" onClick={pickFile}>
            <FolderOpen className="mr-1 h-3.5 w-3.5" />
            {t("charRef.pickFile")}
          </Button>
          <Button
            variant="outline" size="sm" className="h-7 flex-1 text-xs" disabled={!lastResult}
            onClick={() => lastResult && setAsCharacterReference({ imageId: lastResult.id })}
          >
            <ImageUp className="mr-1 h-3.5 w-3.5" />
            {t("charRef.useCurrent")}
          </Button>
        </div>
      )}
      {c.image && c.enabled && supported && (
        <p className="text-[10px] text-muted-foreground">{t("charRef.vibesDisabled")}</p>
      )}
    </div>
  );
}
