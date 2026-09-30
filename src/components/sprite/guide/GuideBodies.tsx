import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowLeftToLine, Brush, Check, FolderOutput, Grid3x3, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpriteStore } from "@/stores/sprite-store";
import { useSpriteMaskEditorStore } from "@/stores/sprite-mask-editor-store";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { allCells, cellKey, isSkipped, parseCellKey } from "@/lib/sprite/cells";
import { baseKey, misplacedLookTags, missingMaskRegions, regionsUsedBy } from "@/lib/sprite/guide";
import { projectImageUrl } from "@/lib/sprite/image-url";
import SetSettingsSection from "../define/SetSettingsSection";
import { BatchCost, BatchGenerateButton, useSpriteBatch } from "../matrix/batch";
import { Tip } from "../Hint";
import { Fold } from "./Fold";

const box = "mx-4 space-y-2 rounded-md border border-border p-3 text-xs";

export function LookStep({ lookText }: { lookText: string }) {
  const { t } = useTranslation();
  const characters = useGenerationParamsStore((s) => s.characters.length);
  const misplaced = useMemo(() => misplacedLookTags(lookText), [lookText]);
  return (
    <div className="space-y-3">
      <div className={box}>
        <p className="flex items-center gap-1 font-medium"><ArrowLeftToLine className="h-3.5 w-3.5" />{t("sprite.wizard.look.where")}</p>
        {lookText.trim()
          ? <p className="break-words rounded bg-muted/50 p-2 font-mono text-[11px]">{lookText}</p>
          : <p className="text-amber-700 dark:text-amber-300">{t("sprite.wizard.look.empty")}</p>}
        {characters > 0 && <p className="text-muted-foreground">{t("sprite.wizard.look.characters", { count: characters })}</p>}
      </div>
      {misplaced.length > 0 && (
        <div className="mx-4 space-y-1 rounded-md bg-amber-500/10 p-2 text-[11px] text-amber-700 dark:text-amber-300">
          {misplaced.map((m) => <p key={m.kind}>{t(`sprite.wizard.look.misplaced.${m.kind}`, { tags: m.tags.join(", ") })}</p>)}
        </div>
      )}
    </div>
  );
}

/** A pose's base image (or its state); click to open it on the right. */
function PoseThumb({ poseId, label, sub, small }: { poseId: string; label: string; sub?: React.ReactNode; small?: boolean }) {
  const { t } = useTranslation();
  const spec = useSpriteStore((s) => s.spec)!;
  const key = baseKey(poseId);
  const cell = useSpriteStore((s) => s.cells[key]);
  const selected = useSpriteStore((s) => s.selectedKey === key);
  const adopted = cell?.candidates.find((c) => c.imageId === cell.adoptedImageId);
  const src = adopted ? projectImageUrl(adopted.filePath) : undefined;
  return (
    <Tip text={t("sprite.wizard.thumbTip")}>
      <button type="button" onClick={() => useSpriteStore.getState().selectCell(key)}
        className={`flex flex-col gap-1 rounded-md border p-1 text-left ${selected ? "border-primary ring-2 ring-primary/50" : "border-border hover:border-primary/40"} ${small ? "w-20" : "w-32"}`}>
        <span className="flex items-center justify-center overflow-hidden rounded bg-muted/40" style={{ aspectRatio: String(spec.width / spec.height) }}>
          {src ? <img src={src} alt="" className="h-full w-full object-contain" draggable={false} />
            : <ImageOff className="h-4 w-4 text-muted-foreground/60" />}
        </span>
        <span className="truncate text-[11px] font-medium">{label}</span>
        {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
      </button>
    </Tip>
  );
}

export function BasesStep() {
  const { t } = useTranslation();
  const spec = useSpriteStore((s) => s.spec)!;
  const cells = useSpriteStore((s) => s.cells);
  const missing = spec.poses.filter((p) => !cells[baseKey(p.id)]?.adoptedImageId).map((p) => baseKey(p.id));
  const unmade = missing.filter((k) => !cells[k]?.candidates.length);
  const toAdopt = missing.length - unmade.length;
  return (
    <div className="space-y-3">
      <Fold title={t("sprite.wizard.settingsFold")}><SetSettingsSection /></Fold>
      <div className={box}>
        <div className="flex flex-wrap gap-2">
          {spec.poses.map((p) => {
            const c = cells[baseKey(p.id)];
            const sub = c?.adoptedImageId ? t("sprite.wizard.bases.adopted")
              : c?.candidates.length ? t("sprite.wizard.bases.pick", { count: c.candidates.length }) : t("sprite.wizard.bases.none");
            return <PoseThumb key={p.id} poseId={p.id} label={p.label} sub={sub} />;
          })}
        </div>
        {unmade.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <BatchGenerateButton keys={unmade} tip={t("sprite.wizard.bases.generateTip")}
              label={(count) => t("sprite.wizard.bases.generate", { count })} />
            <BatchCost keys={unmade} />
          </div>
        ) : (
          <p className="text-muted-foreground">{t("sprite.wizard.bases.allMade")}</p>
        )}
        {toAdopt > 0 && <p className="text-sky-700 dark:text-sky-300">{t("sprite.wizard.bases.adoptHint", { count: toAdopt })}</p>}
      </div>
    </div>
  );
}

export function MasksStep() {
  const { t } = useTranslation();
  const spec = useSpriteStore((s) => s.spec)!;
  const cells = useSpriteStore((s) => s.cells);
  return (
    <div className="space-y-3">
      <div className={box}>
        <p className="font-medium">{t("sprite.wizard.masks.legend")}</p>
        <ul className="space-y-0.5">
          {spec.regions.map((r) => {
            const axes = spec.axes.filter((a) => a.regionIds.includes(r.id)).map((a) => a.label);
            return (
              <li key={r.id} className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: r.color }} />
                <span className="font-medium">{r.label}</span>
                <span className="text-muted-foreground">
                  {axes.length ? t("sprite.wizard.masks.usedBy", { axes: axes.join("・") }) : t("sprite.wizard.masks.unused")}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="mx-4 space-y-2">
        {spec.poses.map((p) => {
          const needed = regionsUsedBy(spec, p.id);
          const missing = missingMaskRegions(spec, p.id);
          const hasBase = !!cells[baseKey(p.id)]?.adoptedImageId;
          return (
            <div key={p.id} className="flex items-center gap-3 rounded-md border border-border p-2 text-xs">
              <PoseThumb poseId={p.id} label={p.label} small />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap gap-1">
                  {needed.map((id) => {
                    const r = spec.regions.find((x) => x.id === id);
                    const ok = !missing.includes(id);
                    return (
                      <span key={id} className={`flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] ${ok ? "border-primary/40 text-foreground" : "border-dashed border-border text-muted-foreground"}`}>
                        <span className="inline-block h-2 w-2 rounded-sm" style={{ background: r?.color }} />
                        {r?.label}{ok && <Check className="h-2.5 w-2.5 text-primary" />}
                      </span>
                    );
                  })}
                  {needed.length === 0 && <span className="text-muted-foreground">{t("sprite.wizard.masks.noneNeeded")}</span>}
                </div>
                {!hasBase && needed.length > 0 && <p className="text-[10px] text-amber-700 dark:text-amber-300">{t("sprite.wizard.masks.needBase")}</p>}
              </div>
              {needed.length > 0 && (
                <Tip text={hasBase ? t("sprite.wizard.masks.drawTip") : t("sprite.wizard.masks.needBase")}>
                  <span className="inline-flex">
                    <Button size="sm" variant={missing.length > 0 ? "default" : "outline"} className="h-7 gap-1 text-xs" disabled={!hasBase}
                      onClick={() => useSpriteMaskEditorStore.getState().open({ kind: "regions", poseId: p.id, regionId: missing[0] })}>
                      <Brush className="h-3.5 w-3.5" />{missing.length > 0 ? t("sprite.wizard.masks.draw") : t("sprite.wizard.masks.edit")}
                    </Button>
                  </span>
                </Tip>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function VariantsStep() {
  const { t } = useTranslation();
  const spec = useSpriteStore((s) => s.spec)!;
  const cells = useSpriteStore((s) => s.cells);
  const keys = useMemo(() => allCells(spec).map(cellKey), [spec]);
  const unmade = keys.filter((k) => !cells[k]?.candidates.length && !cells[k]?.excluded && !isSkipped(spec, parseCellKey(k)));
  const toAdopt = keys.filter((k) => cells[k]?.candidates.length && !cells[k]?.adoptedImageId && !cells[k]?.excluded).length;
  const done = keys.filter((k) => cells[k]?.adoptedImageId || cells[k]?.excluded).length;
  const firstPose = spec.poses[0];
  // A small sample: the first pose, each axis's levels on their own (no combinations)
  const trial = firstPose ? unmade.filter((k) => {
    const c = parseCellKey(k);
    return c.poseId === firstPose.id && Object.keys(c.levels).length <= 1;
  }) : [];
  const { problems } = useSpriteBatch(unmade);
  const toMatrix = () => useSpriteStore.getState().setTab("matrix");

  return (
    <div className={box}>
      <div className="space-y-1">
        <p>{t("sprite.wizard.variants.progress", { done, total: keys.length })}</p>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${keys.length ? (done / keys.length) * 100 : 0}%` }} />
        </div>
      </div>
      {(problems.maskMissing.length > 0 || problems.noRegion.length > 0) && (
        <p className="flex items-center gap-1 rounded bg-amber-500/10 px-2 py-1 text-[11px] text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {problems.maskMissing.length > 0
            ? t("sprite.wizard.variants.problemMasks", { poses: problems.maskMissing.map((id) => spec.poses.find((p) => p.id === id)?.label).join("・") })
            : t("sprite.wizard.variants.problemRegions", { axes: problems.noRegion.map((id) => spec.axes.find((a) => a.id === id)?.label).join("・") })}
          <Button size="sm" variant="outline" className="ml-auto h-6 text-[11px]"
            onClick={() => useSpriteStore.getState().setGuideStep(problems.maskMissing.length > 0 ? "masks" : "axes")}>
            {t("sprite.wizard.variants.fix")}
          </Button>
        </p>
      )}
      {unmade.length > 0 ? (
        <div className="space-y-2">
          {trial.length > 0 && trial.length < unmade.length && (
            <div className="flex flex-wrap items-center gap-2">
              <BatchGenerateButton keys={trial} variant="outline" tip={t("sprite.wizard.variants.trialTip")}
                label={(count) => t("sprite.wizard.variants.trial", { pose: firstPose.label, count })} />
              <BatchCost keys={trial} />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <BatchGenerateButton keys={unmade} tip={t("sprite.wizard.variants.allTip")}
              label={(count) => t("sprite.wizard.variants.all", { count })} />
            <BatchCost keys={unmade} />
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground">{t("sprite.wizard.variants.allMade")}</p>
      )}
      {toAdopt > 0 && <p className="text-sky-700 dark:text-sky-300">{t("sprite.wizard.variants.adoptHint", { count: toAdopt })}</p>}
      <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={toMatrix}>
        <Grid3x3 className="h-3.5 w-3.5" />{t("sprite.wizard.variants.toMatrix")}
      </Button>
    </div>
  );
}

export function ExportStep() {
  const { t } = useTranslation();
  const target = useSpriteStore((s) => s.spec!.export.target);
  return (
    <div className={box}>
      <p>{t("sprite.wizard.export.current", { target: t(`sprite.export.targets.${target}.name`) })}</p>
      <p className="text-muted-foreground">{t(`sprite.export.targets.${target}.desc`)}</p>
      <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => useSpriteStore.getState().setTab("export")}>
        <FolderOutput className="h-3.5 w-3.5" />{t("sprite.wizard.export.open")}
      </Button>
    </div>
  );
}
