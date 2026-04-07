import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal } from "lucide-react";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { MODELS, SAMPLERS } from "@/lib/constants";

const SIZE_PRESETS = [
  { label: "832x1216", w: 832, h: 1216 },
  { label: "1024x1024", w: 1024, h: 1024 },
  { label: "1216x832", w: 1216, h: 832 },
  { label: "1024x1536", w: 1024, h: 1536 },
  { label: "1536x1024", w: 1536, h: 1024 },
] as const;

export default function GenerationParams() {
  const { t } = useTranslation();
  const { model, width, height, steps, scale, sampler, setParam } = useGenerationParamsStore();

  const sizeLabel = `${width}x${height}`;

  return (
    <div className="flex items-center gap-2">
      <Select value={model} onValueChange={(v) => setParam("model", v)}>
        <SelectTrigger className="h-8 w-44 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MODELS.map((m) => (
            <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={sizeLabel}
        onValueChange={(v) => {
          const preset = SIZE_PRESETS.find((p) => p.label === v);
          if (preset) {
            setParam("width", preset.w);
            setParam("height", preset.h);
          }
        }}
      >
        <SelectTrigger className="h-8 w-28 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SIZE_PRESETS.map((p) => (
            <SelectItem key={p.label} value={p.label} className="text-xs">
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <SlidersHorizontal size={14} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 space-y-4" align="end">
          <div className="space-y-2">
            <Label className="text-xs">{t("generation.sampler")}</Label>
            <Select value={sampler} onValueChange={(v) => setParam("sampler", v)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SAMPLERS.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{t("generation.steps")}</Label>
              <span className="text-xs text-muted-foreground">{steps}</span>
            </div>
            <Slider
              value={[steps]}
              onValueChange={([v]) => setParam("steps", v)}
              min={1}
              max={50}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{t("generation.scale")}</Label>
              <span className="text-xs text-muted-foreground">{scale.toFixed(1)}</span>
            </div>
            <Slider
              value={[scale]}
              onValueChange={([v]) => setParam("scale", v)}
              min={0}
              max={10}
              step={0.1}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
