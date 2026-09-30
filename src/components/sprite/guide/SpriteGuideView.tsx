import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Check, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpriteStore } from "@/stores/sprite-store";
import { GUIDE_STEPS, type GuideStepId, type GuideStepStatus } from "@/lib/sprite/guide";
import OutfitSection from "../define/OutfitSection";
import PosesSection from "../define/PosesSection";
import AxesSection from "../define/AxesSection";
import RegionsSection from "../define/RegionsSection";
import { Fold } from "./Fold";
import { BasesStep, ExportStep, LookStep, MasksStep, VariantsStep } from "./GuideBodies";
import { useGuide } from "./use-guide";

/**
 * ガイド: the whole job as eight steps, each with what to do, tips and the
 * controls it needs. Steps can be done in any order; the first unfinished
 * one opens by default.
 */
export default function SpriteGuideView() {
  const { t } = useTranslation();
  const { steps, current, lookText } = useGuide();
  // Stay on the opened step: finishing it (typing a prompt…) must not move the page away
  useEffect(() => {
    if (useSpriteStore.getState().guideStep == null) useSpriteStore.getState().setGuideStep(current);
  }, [current]);
  const go = (id: GuideStepId) => useSpriteStore.getState().setGuideStep(id);
  const index = GUIDE_STEPS.indexOf(current);
  const status = steps[index];
  const tips = t(`sprite.wizard.steps.${current}.tips`, { returnObjects: true }) as unknown as string[];

  return (
    <div className="flex min-h-full flex-col">
      <StepBar steps={steps} current={current} onPick={go} />
      <div className="mx-auto w-full max-w-4xl flex-1 pb-16">
        <div className="space-y-3 px-4 pt-4">
          <p className="text-[11px] font-medium text-muted-foreground">
            {t("sprite.wizard.stepOf", { n: index + 1, total: GUIDE_STEPS.length })}
            {status.optional && ` · ${t("sprite.wizard.optional")}`}
          </p>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            {t(`sprite.wizard.steps.${current}.title`)}
            {status.done && <span className="flex items-center gap-0.5 rounded bg-primary/15 px-1.5 text-[10px] font-medium text-primary"><Check className="h-3 w-3" />{t("sprite.wizard.done")}</span>}
          </h2>
          <p className="text-xs leading-relaxed">{t(`sprite.wizard.steps.${current}.what`)}</p>
          {Array.isArray(tips) && tips.length > 0 && (
            <div className="space-y-1 rounded-md border border-sky-500/30 bg-sky-500/5 p-2.5 text-[11px] leading-relaxed">
              <p className="flex items-center gap-1 font-medium text-sky-700 dark:text-sky-300"><Lightbulb className="h-3.5 w-3.5" />{t("sprite.wizard.tips")}</p>
              <ul className="list-disc space-y-0.5 pl-5">
                {tips.map((tip) => <li key={tip}>{tip}</li>)}
              </ul>
            </div>
          )}
          {status.missing.length > 0 && !status.optional && (
            <p className="rounded-md bg-amber-500/10 px-2 py-1 text-[11px] text-amber-700 dark:text-amber-300">
              {t(`sprite.wizard.steps.${current}.missing`, { items: status.missing.join("・") })}
            </p>
          )}
        </div>

        <div className="pt-2">
          {current === "look" && <LookStep lookText={lookText} />}
          {current === "outfit" && <OutfitSection />}
          {current === "poses" && <PosesSection />}
          {current === "axes" && (
            <>
              <AxesSection />
              <Fold title={t("sprite.wizard.regionsFold")}><RegionsSection /></Fold>
            </>
          )}
          {current === "bases" && <BasesStep />}
          {current === "masks" && <MasksStep />}
          {current === "variants" && <VariantsStep />}
          {current === "export" && <ExportStep />}
        </div>

        <div className="flex items-center gap-2 border-t border-border px-4 py-3">
          <Button size="sm" variant="ghost" className="gap-1 text-xs" disabled={index === 0} onClick={() => go(GUIDE_STEPS[index - 1])}>
            <ArrowLeft className="h-3.5 w-3.5" />{t("sprite.wizard.back")}
          </Button>
          <div className="flex-1" />
          {index < GUIDE_STEPS.length - 1 && (
            <Button size="sm" variant={status.done || status.optional ? "default" : "outline"} className="gap-1 text-xs"
              onClick={() => go(GUIDE_STEPS[index + 1])}>
              {status.done || status.optional ? t("sprite.wizard.next") : t("sprite.wizard.skip")}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepBar({ steps, current, onPick }: { steps: GuideStepStatus[]; current: GuideStepId; onPick: (id: GuideStepId) => void }) {
  const { t } = useTranslation();
  return (
    <ol className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-border bg-background/95 px-3 py-2 backdrop-blur">
      {steps.map((s, i) => {
        const on = s.id === current;
        return (
          <li key={s.id}>
            <button
              type="button"
              aria-current={on ? "step" : undefined}
              onClick={() => onPick(s.id)}
              className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] transition-colors ${
                on ? "border-primary bg-primary/10 text-foreground" : "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] ${
                s.done ? "bg-primary text-primary-foreground" : s.optional ? "border border-dashed border-border" : "border border-border"
              }`}>
                {s.done ? <Check className="h-2.5 w-2.5" /> : i + 1}
              </span>
              {t(`sprite.wizard.steps.${s.id}.short`)}
              {s.count && s.count.total > 0 && !s.done && (
                <span className="tabular text-[10px] text-muted-foreground">{s.count.done}/{s.count.total}</span>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
