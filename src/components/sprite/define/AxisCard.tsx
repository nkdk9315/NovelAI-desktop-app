import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import PromptTargetInput from "@/components/left-panel/PromptTargetInput";
import { useSpriteStore } from "@/stores/sprite-store";
import { newLevel, spriteTargetId, type AxisLevel, type SpriteAxis } from "@/lib/sprite/spec";
import { move, ownedTargetIds, removeAxis, removeLevel, uniqueKey } from "@/lib/sprite/edit";
import { CommitInput, KeyInput, RowActions, chip, dropTargets, updateSpec } from "./common";

export default function AxisCard({ axis, index, count }: { axis: SpriteAxis; index: number; count: number }) {
  const { t } = useTranslation();
  const spec = useSpriteStore((s) => s.spec)!;
  const patch = (fn: (a: SpriteAxis) => SpriteAxis) =>
    updateSpec((s) => ({ ...s, axes: s.axes.map((a) => (a.id === axis.id ? fn(a) : a)) }));
  const patchLevel = (id: string, p: Partial<AxisLevel>) =>
    patch((a) => ({ ...a, levels: a.levels.map((l) => (l.id === id ? { ...l, ...p } : l)) }));
  const outfit = axis.kind === "outfit";

  return (
    <div className="space-y-2 rounded-md border border-border p-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] tabular">{index + 1}</span>
        <CommitInput value={axis.label} className="w-32" aria-label={t("sprite.define.label")} onCommit={(v) => patch((a) => ({ ...a, label: v.trim() || a.label }))} />
        <KeyInput value={axis.key} fallback={`axis${index + 1}`} taken={spec.axes.filter((a) => a.id !== axis.id).map((a) => a.key)}
          onCommit={(v) => patch((a) => ({ ...a, key: v }))} />
        {outfit && <span className="text-[10px] text-muted-foreground">{t("sprite.define.outfitAxisNote")}</span>}
        <div className="flex-1" />
        <RowActions index={index} count={count}
          onMove={(d) => updateSpec((s) => ({ ...s, axes: move(s.axes, index, d) }))}
          onRemove={() => { dropTargets(ownedTargetIds(spec, "axis", axis.id)); updateSpec((s) => removeAxis(s, axis.id)); }} />
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] text-muted-foreground">{t("sprite.define.axisRegions")}</span>
          {spec.regions.map((r) => {
            const on = axis.regionIds.includes(r.id);
            return (
              <button key={r.id} type="button" aria-pressed={on} className={chip(on)}
                onClick={() => patch((a) => ({ ...a, regionIds: on ? a.regionIds.filter((x) => x !== r.id) : [...a.regionIds, r.id] }))}>
                <span className="mr-1 inline-block h-2 w-2 rounded-sm" style={{ background: r.color }} />{r.label}
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-1" title={t("sprite.define.chainHint")}>
          <Switch checked={axis.chain} onCheckedChange={(v) => patch((a) => ({ ...a, chain: v }))} />
          <span>{t("sprite.define.chain")}</span>
        </label>
        <label className="flex items-center gap-1" title={t("sprite.define.compositeHint")}>
          <Switch checked={axis.composite} onCheckedChange={(v) => patch((a) => ({ ...a, composite: v }))} />
          <span>{t("sprite.define.composite")}</span>
        </label>
      </div>
      {axis.regionIds.length === 0 && <p className="text-[10px] text-amber-600 dark:text-amber-400">{t("sprite.define.axisNoRegion")}</p>}
      {!outfit && (
        <div className="space-y-1.5">
          {axis.levels.map((level, li) => (
            <div key={level.id} className="space-y-1 rounded border border-border/60 p-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <CommitInput value={level.label} className="w-24" aria-label={t("sprite.define.label")}
                  onCommit={(v) => patchLevel(level.id, { label: v.trim() || level.label })} />
                <KeyInput value={level.key} fallback={String(li)} taken={axis.levels.filter((l) => l.id !== level.id).map((l) => l.key)}
                  onCommit={(v) => patchLevel(level.id, { key: v })} />
                <label className="flex items-center gap-1 text-[10px] text-muted-foreground" title={t("sprite.define.weightHint")}>
                  {t("sprite.define.weight")}
                  <CommitInput value={String(level.weight)} type="number" step={0.1} className="w-16"
                    onCommit={(v) => patchLevel(level.id, { weight: Math.min(3, Math.max(0.1, Number(v) || 1)) })} />
                </label>
                {li === 0 && <span className="text-[10px] text-muted-foreground">{t("sprite.define.defaultLevel")}</span>}
                <div className="flex-1" />
                <RowActions index={li} count={axis.levels.length} removeDisabled={axis.levels.length <= 1}
                  onMove={(d) => patch((a) => ({ ...a, levels: move(a.levels, li, d) }))}
                  onRemove={() => { dropTargets([level.id]); updateSpec((s) => removeLevel(s, axis.id, level.id)); }} />
              </div>
              <PromptTargetInput targetId={spriteTargetId(level.id)} initialText={level.prompt} rows={1}
                placeholder={li === 0 ? t("sprite.define.levelNonePlaceholder") : t("sprite.define.levelPlaceholder")} />
            </div>
          ))}
          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs"
            onClick={() => patch((a) => ({
              ...a,
              levels: [...a.levels, newLevel(t("sprite.define.newLevel", { n: a.levels.length }), uniqueKey(String(a.levels.length), a.levels.map((l) => l.key)))],
            }))}>
            <Plus className="h-3 w-3" />{t("sprite.define.addLevel")}
          </Button>
        </div>
      )}
    </div>
  );
}
