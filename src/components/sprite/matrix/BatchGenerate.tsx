import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cellStateOf, useSpriteStore } from "@/stores/sprite-store";
import { batchProblems, withMissingAncestors } from "@/lib/sprite/plan";
import { estimateSpriteCost } from "@/lib/sprite/cost";
import { enqueueCells } from "@/lib/sprite/run";
import { Tip } from "../Hint";

/** The cells a batch really makes (parents not adopted yet come first), its problems and cost. */
export function useSpriteBatch(keys: string[]) {
  const spec = useSpriteStore((s) => s.spec)!;
  const cells = useSpriteStore((s) => s.cells);
  const batch = useMemo(
    () => withMissingAncestors(spec, keys, cellStateOf).filter((k) => !cellStateOf(k)?.excluded),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cells: adoption / excluded flags change the batch
    [spec, keys, cells],
  );
  const problems = useMemo(() => batchProblems(spec, batch), [spec, batch]);
  const estimate = useMemo(
    () => estimateSpriteCost(spec, batch, cellStateOf, spec.candidatesPerCell),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cells: excluded flags change the plan
    [spec, batch, cells],
  );
  return { batch, problems, estimate };
}

/** Generate a batch; asks first when it costs Anlas. */
export function BatchGenerateButton({ keys, label, tip, className, variant, onStarted }: {
  keys: string[];
  label: (count: number) => string;
  tip?: string;
  className?: string;
  variant?: "default" | "outline";
  onStarted?: () => void;
}) {
  const { t } = useTranslation();
  const spec = useSpriteStore((s) => s.spec)!;
  const { batch, estimate } = useSpriteBatch(keys);
  const [confirm, setConfirm] = useState<{ keys: string[]; total: number } | null>(null);

  const run = (list: string[]) => {
    enqueueCells(list.map((key) => ({ key, count: spec.candidatesPerCell })));
    onStarted?.();
  };
  const start = () => {
    if (estimate.total > 0) setConfirm({ keys: batch, total: estimate.total });
    else run(batch);
  };

  return (
    <>
      <Tip text={tip}>
        <span className="inline-flex">
          <Button size="sm" variant={variant} className={`h-7 gap-1 text-xs ${className ?? ""}`} disabled={batch.length === 0} onClick={start}>
            <Play className="h-3.5 w-3.5" />{label(batch.length)}
          </Button>
        </span>
      </Tip>
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
    </>
  );
}

/** "12 cells · 30 Anlas" */
export function BatchCost({ keys }: { keys: string[] }) {
  const { t } = useTranslation();
  const { batch, estimate } = useSpriteBatch(keys);
  if (batch.length === 0) return null;
  return (
    <span className="text-muted-foreground">
      {t("sprite.matrix.batchSummary", { cells: batch.length, images: estimate.generations, composites: estimate.composites })}
      {" · "}
      {estimate.total === 0 ? t("sprite.matrix.free") : t("sprite.matrix.anlas", { count: estimate.total })}
    </span>
  );
}
