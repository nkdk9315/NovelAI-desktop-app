import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { RandomPresetSettings } from "@/types";

interface RandomPresetSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: RandomPresetSettings;
  onSettingsChange: (settings: RandomPresetSettings) => void;
}

export default function RandomPresetSettingsDialog({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
}: RandomPresetSettingsDialogProps) {
  const { t } = useTranslation();
  const [local, setLocal] = useState<RandomPresetSettings>(settings);

  useEffect(() => {
    if (open) setLocal(settings);
  }, [open, settings]);

  const update = (patch: Partial<RandomPresetSettings>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onSettingsChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">{t("style.randomSettings")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Vibe count */}
          <SettingRow label={t("style.randomVibeCount")}>
            <ModeToggle
              isRandom={local.vibeCount === "random"}
              onToggle={(random) => update({ vibeCount: random ? "random" : 2 })}
            />
            {local.vibeCount !== "random" && (
              <Input
                type="number"
                min={1}
                max={4}
                value={local.vibeCount}
                onChange={(e) => update({ vibeCount: clamp(Number(e.target.value), 1, 4) })}
                className="h-7 w-16 text-xs"
              />
            )}
          </SettingRow>

          {/* Artist tag count */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t("style.randomArtistTagCount")}</Label>
            <div className="flex items-center gap-2">
              <TriToggle
                value={local.artistTagCount === 0 ? "none" : local.artistTagCount === "random" ? "random" : "fixed"}
                onChange={(v) => update({ artistTagCount: v === "none" ? 0 : v === "random" ? "random" : 1 })}
              />
              {local.artistTagCount !== "random" && local.artistTagCount !== 0 && (
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={local.artistTagCount}
                  onChange={(e) => update({ artistTagCount: clamp(Number(e.target.value), 1, 100) })}
                  className="h-7 w-16 text-xs"
                />
              )}
            </div>
            {local.artistTagCount === "random" && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{t("style.randomMin")}</span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={local.artistTagCountMin}
                  onChange={(e) => {
                    const v = clamp(Number(e.target.value), 0, 100);
                    update({ artistTagCountMin: Math.min(v, local.artistTagCountMax) });
                  }}
                  className="h-7 w-16 text-xs"
                />
                <span className="text-[10px] text-muted-foreground">{t("style.randomMax")}</span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={local.artistTagCountMax}
                  onChange={(e) => {
                    const v = clamp(Number(e.target.value), 0, 100);
                    update({ artistTagCountMax: Math.max(v, local.artistTagCountMin) });
                  }}
                  className="h-7 w-16 text-xs"
                />
              </div>
            )}
          </div>

          {/* Artist tag strength (hidden when artist tags disabled) */}
          {local.artistTagCount !== 0 && <div className="space-y-1.5">
            <Label className="text-xs">{t("style.randomArtistTagStrength")}</Label>
            <div className="flex items-center gap-2">
              <ModeToggle
                isRandom={local.artistTagStrength === "random"}
                onToggle={(random) => update({ artistTagStrength: random ? "random" : 0 })}
              />
              {local.artistTagStrength !== "random" && (
                <div className="flex items-center gap-2 flex-1">
                  <Slider
                    min={0}
                    max={10}
                    step={0.5}
                    value={[local.artistTagStrength]}
                    onValueChange={([v]) => update({ artistTagStrength: v })}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-8 text-right">
                    {local.artistTagStrength === 0 ? "—" : local.artistTagStrength.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
            {local.artistTagStrength === "random" && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{t("style.randomMin")}</span>
                  <Slider
                    min={0}
                    max={10}
                    step={0.5}
                    value={[local.artistTagStrengthMin]}
                    onValueChange={([v]) => update({ artistTagStrengthMin: Math.min(v, local.artistTagStrengthMax) })}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-8 text-right">
                    {local.artistTagStrengthMin.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{t("style.randomMax")}</span>
                  <Slider
                    min={0}
                    max={10}
                    step={0.5}
                    value={[local.artistTagStrengthMax]}
                    onValueChange={([v]) => update({ artistTagStrengthMax: Math.max(v, local.artistTagStrengthMin) })}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-8 text-right">
                    {local.artistTagStrengthMax.toFixed(1)}
                  </span>
                </div>
              </>
            )}
          </div>}

          {/* Vibe strength range */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t("style.randomVibeStrengthRange")}</Label>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">{t("style.randomMin")}</span>
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={[local.vibeStrengthMin]}
                onValueChange={([v]) => update({ vibeStrengthMin: Math.min(v, local.vibeStrengthMax) })}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-8 text-right">
                {local.vibeStrengthMin.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">{t("style.randomMax")}</span>
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={[local.vibeStrengthMax]}
                onValueChange={([v]) => update({ vibeStrengthMax: Math.max(v, local.vibeStrengthMin) })}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-8 text-right">
                {local.vibeStrengthMax.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Favorites only */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="favorites-only"
              checked={local.favoritesOnly}
              onCheckedChange={(checked) => update({ favoritesOnly: checked === true })}
            />
            <Label htmlFor="favorites-only" className="text-xs cursor-pointer">
              {t("style.randomFavoritesOnly")}
            </Label>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function ModeToggle({ isRandom, onToggle }: { isRandom: boolean; onToggle: (random: boolean) => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex rounded-md border border-border overflow-hidden">
      <button
        type="button"
        className={`px-2 py-0.5 text-[10px] ${isRandom ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"}`}
        onClick={() => onToggle(true)}
      >
        {t("style.randomOptionRandom")}
      </button>
      <button
        type="button"
        className={`px-2 py-0.5 text-[10px] ${!isRandom ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"}`}
        onClick={() => onToggle(false)}
      >
        {t("style.randomOptionFixed")}
      </button>
    </div>
  );
}

type TriValue = "none" | "random" | "fixed";

function TriToggle({ value, onChange }: { value: TriValue; onChange: (v: TriValue) => void }) {
  const { t } = useTranslation();
  const options: { key: TriValue; label: string }[] = [
    { key: "none", label: t("style.randomOptionNone") },
    { key: "random", label: t("style.randomOptionRandom") },
    { key: "fixed", label: t("style.randomOptionFixed") },
  ];
  return (
    <div className="flex rounded-md border border-border overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          className={`px-2 py-0.5 text-[10px] ${value === opt.key ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"}`}
          onClick={() => onChange(opt.key)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
