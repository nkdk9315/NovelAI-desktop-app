import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Ban, Combine, ImageOff, Loader2, Lock, RefreshCcw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { projectImageUrl } from "@/lib/sprite/image-url";
import type { CellPlan } from "@/lib/sprite/plan";
import type { SpriteCellDto } from "@/types/sprite";

interface Props {
  cellKey: string;
  cell: SpriteCellDto | undefined;
  plan: CellPlan;
  selected: boolean;
  checked: boolean;
  status: "running" | "queued" | null;
  /** Made from a parent image that has since been replaced */
  stale: boolean;
  aspect: number;
  onSelect: (key: string) => void;
  onToggle: (key: string) => void;
  onGenerate: (key: string) => void;
}

/** One cell of the variant matrix: the adopted image (or its state) with a batch checkbox. */
function SpriteCellTile({ cellKey, cell, plan, selected, checked, status, stale, aspect, onSelect, onToggle, onGenerate }: Props) {
  const { t } = useTranslation();
  const adopted = cell?.candidates.find((c) => c.imageId === cell.adoptedImageId);
  const src = adopted ? projectImageUrl(adopted.filePath) : undefined;
  const candidates = cell?.candidates.length ?? 0;
  const blocker = plan.blockers.find((b) => b !== "excluded");
  const excluded = (cell?.excluded ?? false) || plan.blockers.includes("skipped");

  return (
    <div
      className={`group relative overflow-hidden rounded-md border bg-muted/30 transition-shadow ${
        selected ? "border-primary ring-2 ring-primary/60" : "border-border hover:border-primary/40"
      } ${excluded ? "opacity-40" : ""}`}
      style={{ aspectRatio: String(aspect) }}
    >
      <button
        type="button"
        className="absolute inset-0 flex items-center justify-center"
        onClick={() => onSelect(cellKey)}
        onDoubleClick={() => onGenerate(cellKey)}
        title={t("sprite.matrix.tileHint")}
        aria-label={t("sprite.matrix.tileLabel")}
      >
        {src ? (
          <img src={src} alt="" className="h-full w-full object-contain" loading="lazy" draggable={false} />
        ) : (
          <span className="flex flex-col items-center gap-1 px-1 text-center text-[10px] text-muted-foreground">
            {excluded ? <Ban className="h-4 w-4" /> : blocker ? <Lock className="h-4 w-4" /> : <ImageOff className="h-4 w-4 opacity-50" />}
            {plan.blockers.includes("skipped")
              ? t("sprite.blockerShort.skipped")
              : excluded
              ? t("sprite.matrix.excluded")
              : blocker
                ? t(`sprite.blockerShort.${blocker}`)
                : t(`sprite.method.${plan.method}`)}
          </span>
        )}
      </button>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-1">
        <span className="pointer-events-auto">
          <Checkbox
            checked={checked}
            onCheckedChange={() => onToggle(cellKey)}
            aria-label={t("sprite.matrix.check")}
            className="h-4 w-4 bg-background/80"
          />
        </span>
        <span className="flex items-center gap-1">
          {stale && <RefreshCcw className="h-3 w-3 text-amber-500" aria-label={t("sprite.matrix.stale")} />}
          {plan.method === "composite" && <Combine className="h-3 w-3 text-sky-500" aria-label={t("sprite.method.composite")} />}
          {candidates > 0 && (
            <span className="rounded bg-background/80 px-1 text-[9px] tabular">{candidates}</span>
          )}
        </span>
      </div>
      {status && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          {status === "running"
            ? <Loader2 className="h-5 w-5 animate-spin text-primary" />
            : <span className="rounded bg-background/80 px-1.5 text-[10px]">{t("sprite.matrix.queued")}</span>}
        </div>
      )}
    </div>
  );
}

export default memo(SpriteCellTile);
