import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSpriteStore } from "@/stores/sprite-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useProjectStore } from "@/stores/project-store";
import * as ipc from "@/lib/ipc";
import * as spriteIpc from "@/lib/ipc-sprite";
import { calculateAugmentCost, calculateUpscaleCost } from "@/lib/cost";
import { toastError } from "@/lib/toast-error";
import { chip } from "../define/DefineCommon";

type Tool = "bg-removal" | "upscale";
const TOOLS: Tool[] = ["bg-removal", "upscale"];

/**
 * Background removal / 2x upscale over adopted images; each result becomes an
 * "edit" candidate of its cell (optionally adopted).
 */
export default function PostProcessDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation();
  const spec = useSpriteStore((s) => s.spec)!;
  const cells = useSpriteStore((s) => s.cells);
  const checkedKeys = useSpriteStore((s) => s.checkedKeys);
  const tier = useSettingsStore((s) => s.anlas?.tier ?? 0);
  const [tool, setTool] = useState<Tool>("bg-removal");
  const [onlyChecked, setOnlyChecked] = useState(checkedKeys.length > 0);
  const [adopt, setAdopt] = useState(true);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const stop = useRef(false);

  const targets = useMemo(() => Object.values(cells).filter((c) =>
    c.adoptedImageId && !c.excluded && (!onlyChecked || checkedKeys.includes(c.cellKey))), [cells, onlyChecked, checkedKeys]);
  const perImage = tool === "bg-removal"
    ? calculateAugmentCost("bg-removal", spec.width, spec.height, tier).totalCost
    : calculateUpscaleCost(spec.width, spec.height);
  const total = perImage == null ? null : perImage * targets.length;

  const run = async () => {
    const projectId = useProjectStore.getState().currentProject?.id;
    const setId = useSpriteStore.getState().activeSetId;
    if (!projectId || !setId) return;
    stop.current = false;
    setProgress({ done: 0, total: targets.length });
    let done = 0;
    try {
      for (const cell of targets) {
        if (stop.current) break;
        const source = { type: "history" as const, imageId: cell.adoptedImageId! };
        const res = tool === "upscale"
          ? await ipc.upscaleImage({ projectId, source })
          : await ipc.augmentImage({ projectId, source, reqType: "bg-removal" });
        await spriteIpc.addSpriteCandidate({ setId, cellKey: cell.cellKey, imageId: res.id, parentImageId: cell.adoptedImageId, method: "edit" });
        if (adopt) await spriteIpc.adoptSpriteCandidate(setId, cell.cellKey, res.id);
        done++;
        setProgress({ done, total: targets.length });
      }
      toast.success(t("sprite.post.done", { count: done }));
      onOpenChange(false);
    } catch (e) {
      toastError(String(e));
    } finally {
      setProgress(null);
      await useSpriteStore.getState().reloadCells();
      void useSettingsStore.getState().refreshAnlas();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!progress) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("sprite.post.title")}</DialogTitle>
          <DialogDescription>{t("sprite.post.desc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-xs">
          <div className="flex gap-1" role="radiogroup" aria-label={t("sprite.post.tool")}>
            {TOOLS.map((x) => (
              <button key={x} type="button" role="radio" aria-checked={tool === x} className={chip(tool === x)}
                onClick={() => { setTool(x); setAdopt(x === "bg-removal"); }}>
                {t(`sprite.post.tools.${x}`)}
              </button>
            ))}
          </div>
          <p className="text-muted-foreground">{t(`sprite.post.hint.${tool}`)}</p>
          <label className="flex items-center gap-2">
            <Checkbox checked={onlyChecked} disabled={checkedKeys.length === 0} onCheckedChange={(v) => setOnlyChecked(v === true)} />
            <Label className="text-xs">{t("sprite.post.onlyChecked", { count: checkedKeys.length })}</Label>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={adopt} onCheckedChange={(v) => setAdopt(v === true)} />
            <Label className="text-xs">{t("sprite.post.adopt")}</Label>
          </label>
          <p>
            {t("sprite.post.summary", { count: targets.length })}
            {" · "}
            {total == null ? t("sprite.post.tooLarge") : total === 0 ? t("sprite.matrix.free") : t("sprite.matrix.anlas", { count: total })}
          </p>
          {progress && (
            <p className="flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" />{t("sprite.queue.progress", progress)}</p>
          )}
        </div>
        <DialogFooter>
          {progress ? (
            <Button variant="outline" onClick={() => { stop.current = true; }}>{t("sprite.queue.stop")}</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
              <Button disabled={targets.length === 0 || total == null} onClick={() => { void run(); }}>{t("sprite.post.run")}</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
