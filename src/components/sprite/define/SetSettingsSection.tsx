import { useTranslation } from "react-i18next";
import { Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useSpriteStore } from "@/stores/sprite-store";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { isV5Model, supportsCharacterReference } from "@/lib/constants";
import { randomSeed, slugKey } from "@/lib/sprite/spec";
import { CommitInput, Section, chip, updateSpec } from "./DefineCommon";
import type { SpriteBackground } from "@/lib/sprite/spec";

const BACKGROUNDS: SpriteBackground[] = ["transparent", "white", "asis"];
import { HelpDot, Tip } from "../Hint";

const STEP = 64;
const clampSize = (v: number) => Math.min(2048, Math.max(256, Math.round((Number.isFinite(v) ? v : 832) / STEP) * STEP));

export default function SetSettingsSection() {
  const { t } = useTranslation();
  const spec = useSpriteStore((s) => s.spec)!;
  const hasImages = useSpriteStore((s) => Object.values(s.cells).some((c) => c.candidates.length > 0));
  const model = useGenerationParamsStore((s) => s.model);
  const charRefOk = supportsCharacterReference(model);
  const isV5 = isV5Model(model);

  return (
    <Section title={t("sprite.define.settings")} hint={t("sprite.define.settingsHint")}>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs sm:grid-cols-3">
        <div className="space-y-1">
          <Label className="flex items-center gap-1 text-xs">{t("sprite.define.characterKey")}<HelpDot text={t("sprite.tips.characterKey")} /></Label>
          <CommitInput value={spec.characterKey} className="font-mono"
            onCommit={(v) => updateSpec((s) => ({ ...s, characterKey: slugKey(v, "chara") }))} />
        </div>
        <div className="space-y-1">
          <Label className="flex items-center gap-1 text-xs">{t("sprite.define.size")}<HelpDot text={t("sprite.tips.size")} /></Label>
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
          <Label className="flex items-center gap-1 text-xs">{t("sprite.define.seed")}<HelpDot text={t("sprite.tips.seed")} /></Label>
          <div className="flex items-center gap-1">
            <Switch checked={spec.seed != null} aria-label={t("sprite.define.seedFixed")}
              onCheckedChange={(on) => updateSpec((s) => ({ ...s, seed: on ? randomSeed() : null }))} />
            {spec.seed != null ? (
              <>
                <CommitInput value={String(spec.seed)} className="w-28 font-mono" type="number"
                  onCommit={(v) => updateSpec((s) => ({ ...s, seed: Math.max(0, Math.floor(Number(v) || 0)) }))} />
                <Tip text={t("sprite.define.newSeed")}>
                  <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={t("sprite.define.newSeed")}
                    onClick={() => updateSpec((s) => ({ ...s, seed: randomSeed() }))}>
                    <Dices className="h-3.5 w-3.5" />
                  </Button>
                </Tip>
              </>
            ) : (
              <span className="text-muted-foreground">{t("sprite.define.seedRandom")}</span>
            )}
          </div>
        </div>
        <div className="space-y-1">
          <Label className="flex items-center gap-1 text-xs">{t("sprite.define.candidates", { count: spec.candidatesPerCell })}<HelpDot text={t("sprite.tips.candidates")} /></Label>
          <Slider min={1} max={4} step={1} value={[spec.candidatesPerCell]}
            onValueChange={([v]) => updateSpec((s) => ({ ...s, candidatesPerCell: v }))} />
        </div>
        <label className={`col-span-2 flex items-start gap-2 sm:col-span-3 ${charRefOk ? "" : "opacity-60"}`}>
          <Switch checked={spec.poseReference} onCheckedChange={(v) => updateSpec((s) => ({ ...s, poseReference: v }))} />
          <span>
            {t("sprite.define.poseReference")}
            <span className="block text-[10px] text-muted-foreground">
              {charRefOk ? t("sprite.define.poseReferenceHint") : t("sprite.define.poseReferenceV5")}
            </span>
          </span>
        </label>
        <div className="col-span-2 space-y-1 sm:col-span-3">
          <Label className="flex items-center gap-1 text-xs">{t("sprite.bg.label")}<HelpDot text={t("sprite.bg.labelHint")} /></Label>
          <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={t("sprite.bg.label")}>
            {BACKGROUNDS.map((b) => (
              <button key={b} type="button" role="radio" aria-checked={spec.background === b} className={chip(spec.background === b)}
                onClick={() => updateSpec((s) => ({ ...s, background: b }))}>
                {t(`sprite.bg.mode.${b}`)}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            {t(`sprite.bg.modeHint.${spec.background}${spec.background === "transparent" ? (isV5 ? "V5" : "V45") : ""}`)}
          </p>
        </div>
        <label className="col-span-2 flex items-start gap-2 sm:col-span-3">
          <Switch checked={spec.noText} onCheckedChange={(v) => updateSpec((s) => ({ ...s, noText: v }))} />
          <span>
            {t("sprite.bg.noText")}
            <span className="block text-[10px] text-muted-foreground">{t("sprite.bg.noTextHint")}</span>
          </span>
        </label>
        <div className="space-y-1">
          <Label className="flex items-center gap-1 text-xs">{t("sprite.define.inpaintStrength", { value: spec.inpaintStrength.toFixed(2) })}<HelpDot text={t("sprite.tips.inpaintStrength")} /></Label>
          <Slider min={0.3} max={1} step={0.05} value={[spec.inpaintStrength]}
            onValueChange={([v]) => updateSpec((s) => ({ ...s, inpaintStrength: v }))} />
        </div>
      </div>
    </Section>
  );
}
