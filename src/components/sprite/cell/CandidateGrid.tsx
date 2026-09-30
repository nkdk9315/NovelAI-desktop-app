import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Maximize2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useSpriteStore } from "@/stores/sprite-store";
import * as spriteIpc from "@/lib/ipc-sprite";
import { projectImageUrl } from "@/lib/sprite/image-url";
import { toastError } from "@/lib/toast-error";
import type { SpriteCandidateDto, SpriteCellDto } from "@/types/sprite";
import { Tip } from "../Hint";

interface Props {
  setId: string;
  cellKey: string;
  cell: SpriteCellDto | undefined;
  onChanged: () => void;
}

/** Candidates of a cell, newest first. Click to adopt; the adopted one is outlined. */
export default function CandidateGrid({ setId, cellKey, cell, onChanged }: Props) {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState<SpriteCandidateDto | null>(null);
  const candidates = [...(cell?.candidates ?? [])].reverse();

  const guard = (fn: () => Promise<void>) => { fn().catch((e) => toastError(String(e))); };
  const adopt = (c: SpriteCandidateDto) => guard(async () => {
    const next = cell?.adoptedImageId === c.imageId ? null : c.imageId;
    await spriteIpc.adoptSpriteCandidate(setId, cellKey, next);
    await useSpriteStore.getState().reloadCells();
  });
  const remove = (c: SpriteCandidateDto) => guard(async () => {
    await spriteIpc.removeSpriteCandidate(c.id, true);
    await useSpriteStore.getState().reloadCells();
    onChanged();
  });

  if (candidates.length === 0) {
    return <p className="rounded-md border border-dashed border-border p-3 text-center text-muted-foreground">{t("sprite.cell.noCandidates")}</p>;
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {candidates.map((c) => {
          const adopted = cell?.adoptedImageId === c.imageId;
          return (
            <div key={c.id} className={`group relative overflow-hidden rounded-md border ${adopted ? "border-primary ring-2 ring-primary/60" : "border-border"}`}>
              <Tip text={adopted ? t("sprite.cell.unadopt") : t("sprite.tips.adopt")}>
                <button
                  type="button"
                  className="block w-full"
                  onClick={() => adopt(c)}
                  aria-label={adopted ? t("sprite.cell.unadopt") : t("sprite.cell.adopt")}
                >
                  <img src={projectImageUrl(c.filePath)} alt="" className="w-full object-contain" loading="lazy" draggable={false} />
                </button>
              </Tip>
              {adopted && (
                <span className="absolute left-1 top-1 flex items-center gap-0.5 rounded bg-primary px-1 text-[9px] text-primary-foreground">
                  <Check className="h-2.5 w-2.5" />{t("sprite.cell.adopted")}
                </span>
              )}
              <Tip text={t(`sprite.tips.candidateMethod.${c.method}`)}>
                <span className="absolute bottom-1 left-1 rounded bg-background/80 px-1 text-[9px] text-muted-foreground">
                  {t(`sprite.candidateMethod.${c.method}`)}
                </span>
              </Tip>
              <div className="absolute right-1 top-1 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                <Tip text={t("sprite.cell.zoom")}>
                  <Button size="icon" variant="secondary" className="h-6 w-6" aria-label={t("sprite.cell.zoom")} onClick={() => setZoom(c)}>
                    <Maximize2 className="h-3 w-3" />
                  </Button>
                </Tip>
                <Tip text={t("sprite.cell.deleteCandidate")}>
                  <Button size="icon" variant="secondary" className="h-6 w-6 text-destructive" aria-label={t("sprite.cell.deleteCandidate")} onClick={() => remove(c)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </Tip>
              </div>
            </div>
          );
        })}
      </div>
      <Dialog open={!!zoom} onOpenChange={(o) => { if (!o) setZoom(null); }}>
        <DialogContent className="max-h-[92vh] p-2 sm:max-w-[92vw]">
          <DialogTitle className="sr-only">{t("sprite.cell.zoom")}</DialogTitle>
          {zoom && <img src={projectImageUrl(zoom.filePath)} alt="" className="max-h-[88vh] w-full object-contain" />}
        </DialogContent>
      </Dialog>
    </>
  );
}
