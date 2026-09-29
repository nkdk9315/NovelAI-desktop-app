import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpriteStore } from "@/stores/sprite-store";
import { useSpriteMaskEditorStore } from "@/stores/sprite-mask-editor-store";
import { allCells, cellKey } from "@/lib/sprite/cells";
import { hasMask } from "@/lib/sprite/plan";

/**
 * The order of work, with progress: 1. bases (one per pose) → 2. region masks
 * over each base → 3. the variants.
 */
export default function MatrixGuide() {
  const { t } = useTranslation();
  const spec = useSpriteStore((s) => s.spec)!;
  const cells = useSpriteStore((s) => s.cells);

  const status = useMemo(() => {
    const baseKey = (poseId: string) => cellKey({ poseId, levels: {} });
    const missingBases = spec.poses.filter((p) => !cells[baseKey(p.id)]?.adoptedImageId);
    const usedRegions = (poseId: string) => [...new Set(spec.axes
      .filter((a) => !spec.poses.find((p) => p.id === poseId)?.skipAxes.includes(a.id))
      .flatMap((a) => a.regionIds))];
    const missingMasks = spec.poses.filter((p) => usedRegions(p.id).some((r) => !hasMask(spec, p.id, r)));
    const keys = allCells(spec).map(cellKey);
    const adopted = keys.filter((k) => cells[k]?.adoptedImageId || cells[k]?.excluded).length;
    return { missingBases, missingMasks, adopted, total: keys.length, baseKeys: missingBases.map((p) => baseKey(p.id)) };
  }, [spec, cells]);

  const steps = [
    {
      done: status.missingBases.length === 0,
      label: t("sprite.guide.bases", { done: spec.poses.length - status.missingBases.length, total: spec.poses.length }),
      action: status.missingBases.length > 0
        ? { label: t("sprite.guide.checkBases"), run: () => useSpriteStore.getState().setChecked(status.baseKeys) }
        : null,
    },
    {
      done: status.missingMasks.length === 0,
      label: t("sprite.guide.masks", { done: spec.poses.length - status.missingMasks.length, total: spec.poses.length }),
      action: status.missingMasks.length > 0
        ? {
          label: t("sprite.guide.drawMasks", { pose: status.missingMasks[0].label }),
          run: () => useSpriteMaskEditorStore.getState().open({ kind: "regions", poseId: status.missingMasks[0].id }),
        }
        : null,
    },
    {
      done: status.adopted === status.total,
      label: t("sprite.guide.variants", { done: status.adopted, total: status.total }),
      action: null,
    },
  ];
  if (steps.every((s) => s.done)) return null;

  return (
    <ol className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/30 px-3 py-2 text-[11px]">
      {steps.map((s, i) => (
        <li key={i} className="flex items-center gap-1.5">
          <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] ${s.done ? "bg-primary text-primary-foreground" : "border border-border"}`}>
            {s.done ? <Check className="h-2.5 w-2.5" /> : i + 1}
          </span>
          <span className={s.done ? "text-muted-foreground" : ""}>{s.label}</span>
          {s.action && (
            <Button size="sm" variant="outline" className="h-6 text-[11px]" onClick={s.action.run}>{s.action.label}</Button>
          )}
          {i < steps.length - 1 && <span className="px-1 text-muted-foreground">→</span>}
        </li>
      ))}
    </ol>
  );
}
