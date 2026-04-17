import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
import { Input } from "@/components/ui/input";
import { SlidersHorizontal } from "lucide-react";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import {
  MODELS,
  SAMPLERS,
  SIZE_PRESET_GROUPS,
  MIN_DIMENSION,
  MAX_DIMENSION,
  DIMENSION_STEP,
  MAX_TOTAL_PIXELS,
} from "@/lib/constants";

const CUSTOM_SIZE_VALUE = "__custom__";

function clampDimension(v: number): number {
  if (!Number.isFinite(v)) return MIN_DIMENSION;
  const stepped = Math.round(v / DIMENSION_STEP) * DIMENSION_STEP;
  return Math.max(MIN_DIMENSION, Math.min(MAX_DIMENSION, stepped));
}

export default function GenerationParams() {
  const { t } = useTranslation();
  const { model, width, height, steps, scale, sampler, setParam } = useGenerationParamsStore();

  const matchedPreset = SIZE_PRESET_GROUPS.flatMap((g) =>
    g.items.map((item) => ({ ...item, group: g.group })),
  ).find((p) => p.w === width && p.h === height);

  const selectValue = matchedPreset
    ? `${matchedPreset.group}:${matchedPreset.w}x${matchedPreset.h}`
    : CUSTOM_SIZE_VALUE;

  const totalPixels = width * height;
  const totalPixelError = totalPixels > MAX_TOTAL_PIXELS;
  const isCustom = !matchedPreset;

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
        value={selectValue}
        onValueChange={(v) => {
          if (v === CUSTOM_SIZE_VALUE) return;
          const [, dims] = v.split(":");
          const [wStr, hStr] = dims.split("x");
          const w = Number(wStr);
          const h = Number(hStr);
          if (Number.isFinite(w) && Number.isFinite(h)) {
            setParam("width", w);
            setParam("height", h);
          }
        }}
      >
        <SelectTrigger className="h-8 w-40 text-xs">
          <SelectValue>
            {isCustom
              ? `${t("generation.sizeCustom")} (${width}x${height})`
              : `${t(`generation.sizeOrient.${matchedPreset.orient}`)} (${matchedPreset.w}x${matchedPreset.h})`}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {SIZE_PRESET_GROUPS.map((group) => (
            <SelectGroup key={group.group}>
              <SelectLabel>{t(`generation.sizeGroup.${group.group}`)}</SelectLabel>
              {group.items.map((p) => {
                const value = `${group.group}:${p.w}x${p.h}`;
                return (
                  <SelectItem key={value} value={value} className="text-xs">
                    {t(`generation.sizeOrient.${p.orient}`)} ({p.w}x{p.h})
                  </SelectItem>
                );
              })}
            </SelectGroup>
          ))}
          <SelectGroup>
            <SelectLabel>{t("generation.sizeGroup.custom")}</SelectLabel>
            <SelectItem value={CUSTOM_SIZE_VALUE} className="text-xs">
              {t("generation.sizeCustom")}
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>

      {isCustom && (
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={MIN_DIMENSION}
            max={MAX_DIMENSION}
            step={DIMENSION_STEP}
            value={width}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) setParam("width", n);
            }}
            onBlur={(e) => setParam("width", clampDimension(Number(e.target.value)))}
            className="h-8 w-20 text-xs"
            aria-label={t("generation.width")}
            aria-invalid={totalPixelError}
            title={t("generation.sizeHint")}
          />
          <span className="text-xs text-muted-foreground">×</span>
          <Input
            type="number"
            min={MIN_DIMENSION}
            max={MAX_DIMENSION}
            step={DIMENSION_STEP}
            value={height}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) setParam("height", n);
            }}
            onBlur={(e) => setParam("height", clampDimension(Number(e.target.value)))}
            className="h-8 w-20 text-xs"
            aria-label={t("generation.height")}
            aria-invalid={totalPixelError}
            title={t("generation.sizeHint")}
          />
          {totalPixelError && (
            <span className="text-xs text-destructive" role="alert">
              {t("generation.sizeErrorTotal", { max: MAX_TOTAL_PIXELS })}
            </span>
          )}
        </div>
      )}

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
