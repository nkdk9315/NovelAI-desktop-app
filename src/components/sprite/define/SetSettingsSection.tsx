import { useTranslation } from "react-i18next";
import { Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useSpriteStore } from "@/stores/sprite-store";
import { randomSeed, slugKey } from "@/lib/sprite/spec";
import { CommitInput, Section, updateSpec } from "./common";

const STEP = 64;
const clampSize = (v: number) => Math.min(2048, Math.max(256, Math.round((Number.isFinite(v) ? v : 832) / STEP) * STEP));

export default function SetSettingsSection() {
  const { t } = useTranslation();
  const spec = useSpriteStore((s) => s.spec)!;
  const hasImages = useSpriteStore((s) => Object.values(s.cells).some((c) => c.candidates.length > 0));

  return (
    <Section title={t("sprite.define.settings")} hint={t("sprite.define.settingsHint")}>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs sm:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs">{t("sprite.define.characterKey")}</Label>
          <CommitInput value={spec.characterKey} className="font-mono"
            onCommit={(v) => updateSpec((s) => ({ ...s, characterKey: slugKey(v, "chara") }))} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("sprite.define.size")}</Label>
          <div className="flex items-center gap-1">
            <CommitInput value={String(spec.width)} className="w-20" type="number" step={STEP} aria-label={t("generation.width")}
              onCommit={(v) => updateSpec((s) => ({ ...s, width: clampSize(Number(v)) }))} />
            <span>×</span>
            <CommitInput value={String(spec.height)} className="w-20" type="number" step={STEP} aria-label={t("generation.height")}
              onCommit={(v) => updateSpec((s) => ({ ...s, height: clampSize(Number(v)) }))} />
          </div>
          {hasImages && <p className="text-[10px] text-amber-600 dark:text-amber-400">{t("sprite.define.sizeWarning")}</p>}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("sprite.define.seed")}</Label>
          <div className="flex items-center gap-1">
            <Switch checked={spec.seed != null} aria-label={t("sprite.define.seedFixed")}
              onCheckedChange={(on) => updateSpec((s) => ({ ...s, seed: on ? randomSeed() : null }))} />
            {spec.seed != null ? (
              <>
                <CommitInput value={String(spec.seed)} className="w-28 font-mono" type="number"
                  onCommit={(v) => updateSpec((s) => ({ ...s, seed: Math.max(0, Math.floor(Number(v) || 0)) }))} />
                <Button size="icon" variant="ghost" className="h-7 w-7" title={t("sprite.define.newSeed")}
                  onClick={() => updateSpec((s) => ({ ...s, seed: randomSeed() }))}>
                  <Dices className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <span className="text-muted-foreground">{t("sprite.define.seedRandom")}</span>
            )}
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("sprite.define.candidates", { count: spec.candidatesPerCell })}</Label>
          <Slider min={1} max={4} step={1} value={[spec.candidatesPerCell]}
            onValueChange={([v]) => updateSpec((s) => ({ ...s, candidatesPerCell: v }))} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("sprite.define.inpaintStrength", { value: spec.inpaintStrength.toFixed(2) })}</Label>
          <Slider min={0.3} max={1} step={0.05} value={[spec.inpaintStrength]}
            onValueChange={([v]) => updateSpec((s) => ({ ...s, inpaintStrength: v }))} />
        </div>
      </div>
    </Section>
  );
}
