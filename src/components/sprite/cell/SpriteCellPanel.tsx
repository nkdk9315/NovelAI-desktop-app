import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Ban, Brush, ChevronDown, ChevronRight, FileInput, Play, Wand2 } from "lucide-react";
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
import { toastError } from "@/lib/toast-error";
import CandidateGrid from "./CandidateGrid";

/** The selected cell: how it is made, its prompt, actions and candidates. */
export default function SpriteCellPanel() {
  const { t } = useTranslation();
  const spec = useSpriteStore((s) => s.spec);
  const key = useSpriteStore((s) => s.selectedKey);
  const cells = useSpriteStore((s) => s.cells);
  const setId = useSpriteStore((s) => s.activeSetId);
  const [showPrompt, setShowPrompt] = useState(false);
  // Re-render when a prompt box changes (the preview reads the prompt targets)
  useSidebarPromptStore((s) => s.targets);
  const cell = key ? cells[key] : undefined;
  const plan = useMemo(() => (spec && key ? planCell(spec, key, cellStateOf) : null), [spec, key, cells]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!spec || !key || !plan || !setId) {
    return <p className="p-4 text-xs leading-relaxed text-muted-foreground">{t("sprite.cell.noSelection")}</p>;
  }

  const coord = parseCellKey(key);
  const prompt = cellPrompt(spec, coord, displayTextOf);
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
    await useSpriteStore.getState().reloadCells();
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
        <p className="mt-0.5 text-muted-foreground">
          {t(`sprite.methodLong.${plan.method}`)}
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
        <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => generate()}>
          <Play className="h-3.5 w-3.5" />
          {plan.method === "composite" ? t("sprite.cell.composite") : t("sprite.cell.generate", { count: spec.candidatesPerCell })}
        </Button>
        {plan.method === "composite" && (
          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => generate(true)}>
            <Wand2 className="h-3.5 w-3.5" />{t("sprite.cell.inpaintInstead")}
          </Button>
        )}
        {retouchImage && (
          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs"
            title={t("sprite.cell.retouchHint")}
            onClick={() => useSpriteMaskEditorStore.getState().open({ kind: "custom", cellKey: key, imageId: retouchImage })}>
            <Brush className="h-3.5 w-3.5" />{t("sprite.cell.retouch")}
          </Button>
        )}
        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={importFile}>
          <FileInput className="h-3.5 w-3.5" />{t("sprite.cell.import")}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={toggleExcluded}>
          <Ban className="h-3.5 w-3.5" />{cell?.excluded ? t("sprite.cell.include") : t("sprite.cell.exclude")}
        </Button>
      </div>

      <CandidateGrid setId={setId} cellKey={key} cell={cell} onChanged={refresh} />

      <div>
        <button type="button" className="flex items-center gap-1 font-medium" onClick={() => setShowPrompt((v) => !v)}>
          {showPrompt ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {t("sprite.cell.prompt")}
        </button>
        {showPrompt && (
          <div className="mt-1 space-y-1 rounded-md bg-muted/50 p-2 font-mono text-[11px] leading-relaxed">
            <p className="text-muted-foreground">{t("sprite.cell.promptNote")}</p>
            <p className="break-words">{prompt.positive || "—"}</p>
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
