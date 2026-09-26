import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { useGenerationStore } from "@/stores/generation-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useGenerationPlan } from "@/hooks/use-generation-plan";
import { useRunGeneration } from "@/hooks/use-run-generation";
import { ENHANCE_LEVELS, ENHANCE_MAGNITUDES } from "@/lib/constants";
import { enhanceSize } from "@/lib/image-size";
import { calculateCost } from "@/lib/cost";
import { collectActiveVibes } from "@/lib/generation-request";
import { loadHistoryImage, stripDataUrl, type LoadedImage } from "@/lib/canvas-image";

/**
 * Enhance: re-generate the shown image as img2img on an upsized copy, with the
 * official strength / noise presets. Uses the current prompt and settings.
 */
export default function EnhancePopover({ imageId, trigger }: { imageId: string; trigger: React.ReactNode }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [magnitude, setMagnitude] = useState<number>(1.5);
  const [level, setLevel] = useState(3);
  const params = useGenerationParamsStore();
  const anlas = useSettingsStore((s) => s.anlas);
  const isGenerating = useGenerationStore((s) => s.isGenerating);
  const plan = useGenerationPlan();
  const runGeneration = useRunGeneration();

  useEffect(() => {
    if (!open) return;
    setImage(null);
    loadHistoryImage(imageId)
      .then(setImage)
      .catch((e) => toast.error(t("imageEdit.loadFailed", { error: String(e) })));
  }, [open, imageId, t]);

  const preset = ENHANCE_LEVELS.find((l) => l.level === level)!;
  const size = image ? enhanceSize(image.width, image.height, magnitude) : null;
  const cost = size && calculateCost({
    width: size.width,
    height: size.height,
    steps: params.steps,
    vibeCount: plan.charRefActive ? 0 : collectActiveVibes(params).length,
    hasCharacterReference: plan.charRefActive,
    tier: anlas?.tier ?? 0,
    model: params.model,
    opusUsageExhausted: anlas?.opusUsage?.isExhausted ?? false,
    mode: "img2img",
    strength: preset.strength,
  });

  const run = async () => {
    if (!image || !size) return;
    setOpen(false);
    await runGeneration({
      width: size.width,
      height: size.height,
      action: { type: "img2Img", sourceImageBase64: stripDataUrl(image.src), strength: preset.strength, noise: preset.noise },
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3 text-xs" onPointerDown={(e) => e.stopPropagation()}>
        <div>
          <p className="text-sm font-medium">{t("enhance.title")}</p>
          <p className="text-muted-foreground">{t("enhance.description")}</p>
        </div>
        <div className="space-y-1">
          <span className="text-muted-foreground">{t("enhance.magnitude")}</span>
          <div className="flex gap-1">
            {ENHANCE_MAGNITUDES.map((m) => (
              <Button key={m} size="sm" variant={magnitude === m ? "default" : "outline"} className="h-7 flex-1" onClick={() => setMagnitude(m)}>
                ×{m}
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-muted-foreground">
            <span>{t("enhance.level")}</span>
            <span className="tabular">{t("enhance.levelDetail", { strength: preset.strength, noise: preset.noise })}</span>
          </div>
          <div className="flex gap-1">
            {ENHANCE_LEVELS.map((l) => (
              <Button key={l.level} size="sm" variant={level === l.level ? "default" : "outline"} className="h-7 flex-1 px-0" onClick={() => setLevel(l.level)}>
                {l.level}
              </Button>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{t("enhance.subtle")}</span>
            <span>{t("enhance.strong")}</span>
          </div>
        </div>
        <p className="tabular text-muted-foreground">
          {image && size
            ? t("enhance.size", { w: image.width, h: image.height, tw: size.width, th: size.height })
            : <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        </p>
        <Button size="sm" className="w-full" disabled={!image || isGenerating} onClick={run}>
          <Sparkles className="mr-1 h-4 w-4" />
          {t("enhance.run")}
          {cost && ` (${cost.isOpusFree ? t("generation.free") : `${cost.totalCost} ${t("generation.anlas")}`})`}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
