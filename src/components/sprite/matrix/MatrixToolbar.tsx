import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Play, Rows3, SquareCheck, SquareDashed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cellStateOf, useSpriteStore } from "@/stores/sprite-store";
import { allCells, cellKey, levelsOf } from "@/lib/sprite/cells";
import { withMissingAncestors } from "@/lib/sprite/plan";
import { estimateSpriteCost } from "@/lib/sprite/cost";
import { enqueueCells } from "@/lib/sprite/run";

const NONE = "__none__";

const chip = (on: boolean) =>
  `rounded-md border px-1.5 py-0.5 text-[10px] transition-colors ${
    on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
  }`;

export default function MatrixToolbar({ visibleKeys }: { visibleKeys: string[] }) {
  const { t } = useTranslation();
  const spec = useSpriteStore((s) => s.spec)!;
  const cells = useSpriteStore((s) => s.cells);
  const view = useSpriteStore((s) => s.view);
  const checkedKeys = useSpriteStore((s) => s.checkedKeys);
  const setView = useSpriteStore((s) => s.setView);
  const setChecked = useSpriteStore((s) => s.setChecked);
  const [confirm, setConfirm] = useState<{ keys: string[]; total: number } | null>(null);

  const ungenerated = (keys: string[]) => keys.filter((k) => !cells[k]?.candidates.length && !cells[k]?.excluded);
  const everyKey = useMemo(() => allCells(spec).map(cellKey), [spec]);
  // Parents that aren't adopted yet are made first, in the same batch
  const batch = useMemo(
    () => withMissingAncestors(spec, checkedKeys, cellStateOf).filter((k) => !cellStateOf(k)?.excluded),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cells: adoption / excluded flags change the batch
    [spec, checkedKeys, cells],
  );
  const estimate = useMemo(
    () => estimateSpriteCost(spec, batch, cellStateOf, spec.candidatesPerCell),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cells: excluded flags change the plan
    [spec, checkedKeys, cells],
  );

  const run = (keys: string[]) => {
    enqueueCells(keys.map((key) => ({ key, count: spec.candidatesPerCell })));
    setChecked([]);
  };
  const start = () => {
    if (estimate.total > 0) setConfirm({ keys: batch, total: estimate.total });
    else run(batch);
  };

  return (
    <div className="sticky top-0 z-10 space-y-2 border-b border-border bg-background/95 px-3 py-2 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Rows3 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">{t("sprite.matrix.columns")}</span>
        <Select value={view.columnAxisId ?? NONE} onValueChange={(v) => setView({ columnAxisId: v === NONE ? null : v })}>
          <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE} className="text-xs">{t("sprite.matrix.noColumns")}</SelectItem>
            {spec.axes.map((a) => <SelectItem key={a.id} value={a.id} className="text-xs">{a.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {spec.axes.filter((a) => a.id !== view.columnAxisId).map((axis) => {
          const current = view.filter[axis.id] ?? 0;
          return (
            <div key={axis.id} className="flex flex-wrap items-center gap-1" role="radiogroup" aria-label={axis.label}>
              <span className="ml-2 text-[10px] font-medium text-muted-foreground">{axis.label}</span>
              {levelsOf(spec, axis).map((l, i) => (
                <button
                  key={l.id}
                  type="button"
                  role="radio"
                  aria-checked={current === i}
                  className={chip(current === i)}
                  onClick={() => setView({ filter: { ...view.filter, [axis.id]: i } })}
                >
                  {l.label}
                </button>
              ))}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setChecked(ungenerated(visibleKeys))}>
          <SquareDashed className="h-3.5 w-3.5" />{t("sprite.matrix.checkUngeneratedHere")}
        </Button>
        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setChecked(ungenerated(everyKey))}>
          <SquareCheck className="h-3.5 w-3.5" />{t("sprite.matrix.checkUngeneratedAll", { count: ungenerated(everyKey).length })}
        </Button>
        {checkedKeys.length > 0 && (
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setChecked([])}>
            {t("sprite.matrix.uncheck")}
          </Button>
        )}
        <div className="flex-1" />
        {checkedKeys.length > 0 && (
          <span className="text-muted-foreground">
            {t("sprite.matrix.batchSummary", {
              cells: batch.length, images: estimate.generations, composites: estimate.composites,
            })}
            {" · "}
            {estimate.total === 0 ? t("sprite.matrix.free") : t("sprite.matrix.anlas", { count: estimate.total })}
          </span>
        )}
        <Button size="sm" className="h-7 gap-1 text-xs" disabled={batch.length === 0} onClick={start}>
          <Play className="h-3.5 w-3.5" />{t("sprite.matrix.generateChecked", { count: batch.length })}
        </Button>
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(o) => { if (!o) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("sprite.matrix.costTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("sprite.matrix.costBody", { count: confirm?.total ?? 0, cells: confirm?.keys.length ?? 0 })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirm) run(confirm.keys); setConfirm(null); }}>
              {t("sprite.matrix.generate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
