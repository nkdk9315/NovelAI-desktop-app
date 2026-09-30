import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Ban, Brush, ChevronDown, ChevronRight, Eye, FileInput, Play, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import { cellStateOf, useSpriteStore } from "@/stores/sprite-store";
import { useSpriteMaskEditorStore } from "@/stores/sprite-mask-editor-store";
import { useSettingsStore } from "@/stores/settings-store";
import * as spriteIpc from "@/lib/ipc-sprite";
import { cellLabel, parseCellKey } from "@/lib/sprite/cells";
import { planCell } from "@/lib/sprite/plan";
import { cellPrompt } from "@/lib/sprite/prompt";
import { displayTextOf } from "@/lib/sprite/text";
import { enqueueCells } from "@/lib/sprite/run";
import { cellIsStale } from "@/lib/sprite/status";
import { toastError } from "@/lib/toast-error";
import { toast } from "sonner";
import { loadImageElement } from "@/lib/canvas-image";
import { projectImageUrl } from "@/lib/sprite/image-url";
import { sameAspect, sizeForAspect } from "@/lib/sprite/spec";
import CandidateGrid from "./CandidateGrid";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { spriteRequestExtras } from "@/lib/sprite/background";
import { joinPrompt } from "@/lib/outfits";
import BackgroundPreviewDialog from "../export/BackgroundPreviewDialog";
import { HelpDot, Tip } from "../Hint";

/** The selected cell: how it is made, its prompt, actions and candidates. */
export default function SpriteCellPanel() {
  const { t } = useTranslation();
  const spec = useSpriteStore((s) => s.spec);
  const key = useSpriteStore((s) => s.selectedKey);
  const cells = useSpriteStore((s) => s.cells);
  const setId = useSpriteStore((s) => s.activeSetId);
  const model = useGenerationParamsStore((s) => s.model);
  const [showPrompt, setShowPrompt] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  // Re-render when a prompt box changes (the preview reads the prompt targets)
  useSidebarPromptStore((s) => s.targets);
  const cell = key ? cells[key] : undefined;
  const plan = useMemo(() => (spec && key ? planCell(spec, key, cellStateOf) : null), [spec, key, cells]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!spec || !key || !plan || !setId) {
    return <p className="p-4 text-xs leading-relaxed text-muted-foreground">{t("sprite.cell.noSelection")}</p>;
  }

  const coord = parseCellKey(key);
  const cellText = cellPrompt(spec, coord, displayTextOf);
  const extras = spriteRequestExtras(spec, model);
  const prompt = {
    positive: joinPrompt(cellText.positive, extras.positive),
    negative: joinPrompt(cellText.negative, extras.negative),
  };
  const blockers = plan.blockers.filter((b) => b !== "excluded");
  const adoptedImageId = cell?.adoptedImageId ?? null;
  const parentLabel = plan.parentKey ? cellLabel(spec, parseCellKey(plan.parentKey)) : null;

  const guard = (fn: () => Promise<void>) => () => { fn().catch((e) => toastError(String(e))); };
  const generate = (preferInpaint = false) =>
    enqueueCells([{ key, count: plan.method === "composite" && !preferInpaint ? 1 : spec.candidatesPerCell, preferInpaint, force: true }]);

  const importFile = guard(async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const path = await open({ multiple: false, filters: [{ name: "Image", extensions: ["png", "jpg", "jpeg", "webp"] }] });
    if (typeof path !== "string") return;
    const cand = await spriteIpc.importSpriteCandidate(setId, key, path);
    if (!adoptedImageId) await spriteIpc.adoptSpriteCandidate(setId, key, cand.imageId);
    const firstImage = Object.values(useSpriteStore.getState().cells).every((c) => c.candidates.length === 0);
    await useSpriteStore.getState().reloadCells();
    // Inpainting resizes the source to the set size: keep the drawing's proportions
    const src = projectImageUrl(cand.filePath);
    const img = src ? await loadImageElement(src).catch(() => null) : null;
    if (!img) return;
    const size = { width: img.naturalWidth, height: img.naturalHeight };
    if (sameAspect(size, spec)) return;
    if (firstImage) {
      const fit = sizeForAspect(size.width, size.height, spec.width * spec.height);
      useSpriteStore.getState().updateSpec((s) => ({ ...s, ...fit }));
      toast.message(t("sprite.cell.sizeFitted", fit));
    } else {
      toast.warning(t("sprite.cell.aspectMismatch", { w: size.width, h: size.height, sw: spec.width, sh: spec.height }));
    }
  });
  const toggleExcluded = guard(async () => {
    await spriteIpc.setSpriteCellState(setId, key, { excluded: !(cell?.excluded ?? false) });
    await useSpriteStore.getState().reloadCells();
  });
  const saveNote = (note: string) => guard(async () => {
    if (note === (cell?.note ?? "")) return;
    await spriteIpc.setSpriteCellState(setId, key, { note });
    await useSpriteStore.getState().reloadCells();
  })();
  const refresh = () => void useSettingsStore.getState().refreshAnlas();

  // A one-off mask is drawn over the cell's own image when it has one, else over its parent
  const retouchImage = adoptedImageId ?? (plan.parentKey ? cellStateOf(plan.parentKey)?.adoptedImageId : null) ?? null;

  return (
    <div className="space-y-3 p-3 text-xs">
      <div>
        <h2 className="text-sm font-semibold">{cellLabel(spec, coord)}</h2>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1 text-muted-foreground">
          {t(`sprite.methodLong.${plan.method}`)}
          <HelpDot text={t(`sprite.tips.method.${plan.method}`)} />
          {parentLabel && (
            <>
              {" ← "}
              <button type="button" className="underline-offset-2 hover:underline" onClick={() => useSpriteStore.getState().selectCell(plan.parentKey)}>
                {parentLabel}
              </button>
            </>
          )}
        </p>
      </div>

      {cellIsStale(spec, key, cells) && (
        <div className="space-y-1 rounded-md border border-amber-500/40 bg-amber-500/10 p-2">
          <p>{t("sprite.cell.stale")}</p>
          <Button size="sm" variant="outline" className="h-6 text-[11px]" onClick={() => generate()}>{t("sprite.cell.redo")}</Button>
        </div>
      )}

      {blockers.length > 0 && (
        <ul className="space-y-1 rounded-md border border-amber-500/40 bg-amber-500/10 p-2">
          {blockers.map((b) => (
            <li key={b} className="space-y-1">
              <p>{t(`sprite.blocker.${b}`)}</p>
              {b === "maskMissing" && (
                <Button size="sm" variant="outline" className="h-6 gap-1 text-[11px]"
                  onClick={() => useSpriteMaskEditorStore.getState().open({ kind: "regions", poseId: coord.poseId, regionId: plan.regionIds[0] })}>
                  <Brush className="h-3 w-3" />{t("sprite.cell.drawRegions")}
                </Button>
              )}
              {b === "noRegion" && (
                <Button size="sm" variant="outline" className="h-6 text-[11px]" onClick={() => useSpriteStore.getState().setTab("define")}>
                  {t("sprite.cell.openDefine")}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-1.5">
        <Tip text={plan.method === "composite" ? t("sprite.tips.composite") : t("sprite.tips.generate", { count: spec.candidatesPerCell })}>
          <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => generate()}>
            <Play className="h-3.5 w-3.5" />
            {plan.method === "composite" ? t("sprite.cell.composite") : t("sprite.cell.generate", { count: spec.candidatesPerCell })}
          </Button>
        </Tip>
        {plan.method === "composite" && (
          <Tip text={t("sprite.tips.inpaintInstead")}>
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => generate(true)}>
              <Wand2 className="h-3.5 w-3.5" />{t("sprite.cell.inpaintInstead")}
            </Button>
          </Tip>
        )}
        {retouchImage && (
          <Tip text={t("sprite.cell.retouchHint")}>
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs"
              onClick={() => useSpriteMaskEditorStore.getState().open({ kind: "custom", cellKey: key, imageId: retouchImage })}>
              <Brush className="h-3.5 w-3.5" />{t("sprite.cell.retouch")}
            </Button>
          </Tip>
        )}
        <Tip text={t("sprite.tips.import")}>
          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={importFile}>
            <FileInput className="h-3.5 w-3.5" />{t("sprite.cell.import")}
          </Button>
        </Tip>
        {adoptedImageId && (
          <Tip text={t("sprite.bg.checkTip")}>
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setPreviewId(adoptedImageId)}>
              <Eye className="h-3.5 w-3.5" />{t("sprite.bg.check")}
            </Button>
          </Tip>
        )}
        <Tip text={cell?.excluded ? t("sprite.tips.include") : t("sprite.tips.exclude")}>
          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={toggleExcluded}>
            <Ban className="h-3.5 w-3.5" />{cell?.excluded ? t("sprite.cell.include") : t("sprite.cell.exclude")}
          </Button>
        </Tip>
      </div>
      {(cell?.candidates.length ?? 0) > 0 && !adoptedImageId && (
        <p className="rounded-md bg-sky-500/10 px-2 py-1 text-sky-700 dark:text-sky-300">{t("sprite.cell.adoptPrompt")}</p>
      )}

      <CandidateGrid setId={setId} cellKey={key} cell={cell} onChanged={refresh} />
      <BackgroundPreviewDialog imageId={previewId} onClose={() => setPreviewId(null)} />

      <div>
        <button type="button" className="flex items-center gap-1 font-medium" onClick={() => setShowPrompt((v) => !v)}>
          {showPrompt ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {t("sprite.cell.prompt")}
        </button>
        {showPrompt && (
          <div className="mt-1 space-y-1 rounded-md bg-muted/50 p-2 font-mono text-[11px] leading-relaxed">
            <p className="text-muted-foreground">{t("sprite.cell.promptNote")}</p>
            <p className="break-words">{prompt.positive || "—"}</p>
            {extras.transparent && <p className="text-sky-700 dark:text-sky-300">{t("sprite.bg.v5Note")}</p>}
            {prompt.negative && <p className="break-words text-muted-foreground">UC: {prompt.negative}</p>}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="sprite-cell-note" className="font-medium">{t("sprite.cell.note")}</label>
        <Textarea
          key={key}
          id="sprite-cell-note"
          defaultValue={cell?.note ?? ""}
          rows={2}
          className="text-xs"
          placeholder={t("sprite.cell.notePlaceholder")}
          onBlur={(e) => saveNote(e.target.value)}
        />
      </div>
    </div>
  );
}
