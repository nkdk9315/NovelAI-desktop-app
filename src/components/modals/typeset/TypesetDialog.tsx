import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Eraser, Loader2, Plus, Redo2, Undo2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTypesetStore } from "@/stores/typeset-store";
import { useHistoryStore } from "@/stores/history-store";
import { useGenerationStore } from "@/stores/generation-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useUndoable } from "@/hooks/use-undoable";
import { canvasToBase64Png, createCanvas, loadHistoryImage, loadImageElement } from "@/lib/canvas-image";
import { loadTypesetFonts, renderTypeset } from "@/lib/typeset-render";
import { newTypesetBox, snapshotLayers, snapshotTexts, type TypesetBox } from "@/lib/typeset";
import * as ipc from "@/lib/ipc";
import TypesetCanvas from "./TypesetCanvas";
import TypesetInspector from "./TypesetInspector";

/** Typesetting: draw exact text (with bubbles) over a history image and save it as a new image. */
export default function TypesetDialog() {
  const imageId = useTypesetStore((s) => s.imageId);
  const close = useTypesetStore((s) => s.close);
  return (
    <Dialog open={imageId !== null} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="flex h-[92vh] flex-col gap-3 sm:max-w-6xl" onEscapeKeyDown={(e) => e.preventDefault()}>
        {imageId && <TypesetBody key={imageId} imageId={imageId} />}
      </DialogContent>
    </Dialog>
  );
}

function snapshotOf(id: string | null | undefined): Record<string, unknown> | undefined {
  return useHistoryStore.getState().images.find((i) => i.id === id)?.promptSnapshot;
}

/** Lines of the image (or of the images it was made from: typeset / declutter keep a source id). */
function linesFor(id: string): string[] {
  let current: string | null | undefined = id;
  for (let i = 0; i < 4 && current; i++) {
    const snap = snapshotOf(current);
    const lines = snapshotTexts(snap);
    if (lines.length > 0) return lines;
    current = snap?.source_image_id as string | null | undefined;
  }
  return [];
}

function TypesetBody({ imageId }: { imageId: string }) {
  const { t } = useTranslation();
  const { id: projectId } = useParams<{ id: string }>();
  const loadImages = useHistoryStore((s) => s.loadImages);
  const refreshAnlas = useSettingsStore((s) => s.refreshAnlas);
  // Re-editing a typeset image opens its base image with its boxes
  const [initial] = useState(() => snapshotLayers(snapshotOf(imageId)));
  const [baseId, setBaseId] = useState(initial?.baseImageId ?? imageId);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const { value: boxes, set: setBoxes, undo, redo, canUndo, canRedo } = useUndoable<TypesetBox[]>(initial?.boxes ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<"declutter" | "save" | null>(null);
  const [lines] = useState(() => linesFor(imageId));

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadHistoryImage(baseId), loadTypesetFonts()])
      .then(([img]) => loadImageElement(img.src))
      .then((el) => { if (!cancelled) setImage(el); })
      .catch((e) => toast.error(t("imageEdit.loadFailed", { error: String(e) })));
    return () => { cancelled = true; };
  }, [baseId, t]);

  const update = useCallback((id: string, patch: Partial<TypesetBox>, key?: string) =>
    setBoxes((list) => list.map((b) => (b.id === id ? { ...b, ...patch } : b)), key), [setBoxes]);

  const add = (text: string, x = 0.5, y = 0.5) => {
    const box = newTypesetBox(text, x, y);
    setBoxes((list) => [...list, box]);
    setSelectedId(box.id);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.key === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      if (e.key === "y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const declutter = async () => {
    if (!projectId) return;
    setBusy("declutter");
    try {
      const res = await ipc.augmentImage({ projectId, source: { type: "history", imageId: baseId }, reqType: "declutter-keep-bubbles" });
      setBaseId(res.id);
      await Promise.all([loadImages(projectId), refreshAnlas()]);
    } catch (e) {
      toast.error(t("tools.failed", { error: String(e) }));
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    if (!projectId || !image) return;
    setBusy("save");
    try {
      const canvas = createCanvas(image.naturalWidth, image.naturalHeight);
      renderTypeset(canvas.getContext("2d")!, image, boxes, canvas.width, canvas.height);
      const res = await ipc.saveTypesetImage({
        projectId, imageBase64: canvasToBase64Png(canvas), sourceImageId: baseId,
        layers: { version: 1, baseImageId: baseId, boxes },
      });
      await loadImages(projectId);
      useGenerationStore.setState({ lastResult: { id: res.id, base64Image: res.base64Image, seed: 0, filePath: res.filePath } });
      toast.success(t("typeset.saved"));
      useTypesetStore.getState().close();
    } catch (e) {
      toast.error(t("typeset.saveFailed", { error: String(e) }));
    } finally {
      setBusy(null);
    }
  };

  const selected = boxes.find((b) => b.id === selectedId) ?? null;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("typeset.title")}</DialogTitle>
        <DialogDescription>{t("typeset.description")}</DialogDescription>
      </DialogHeader>
      <div className="flex min-h-0 flex-1 gap-4">
        {image ? (
          <TypesetCanvas
            image={image}
            boxes={boxes}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMove={(id, patch, key) => update(id, patch, key)}
            onAddAt={(x, y) => add(t("typeset.newText"), x, y)}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        )}
        <div className="flex w-72 shrink-0 flex-col gap-3 overflow-y-auto pr-1">
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={() => add(t("typeset.newText"))}>
              <Plus className="h-3.5 w-3.5" />{t("typeset.add")}
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" disabled={busy !== null} onClick={declutter} title={t("typeset.declutterHint")}>
              {busy === "declutter" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eraser className="h-3.5 w-3.5" />}
              {t("typeset.declutter")}
            </Button>
          </div>
          {lines.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground">{t("typeset.linesFromImage")}</p>
              <div className="flex flex-wrap gap-1">
                {lines.map((line) => (
                  <button key={line} type="button" onClick={() => add(line)} className="max-w-full truncate rounded-md border border-border px-1.5 py-0.5 text-xs hover:bg-accent">
                    {line}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="border-t border-border pt-3">
            {selected ? (
              <TypesetInspector
                key={selected.id}
                box={selected}
                onChange={(patch, key) => update(selected.id, patch, key)}
                onDuplicate={() => add(selected.text, Math.min(1, selected.x + 0.04), Math.min(1, selected.y + 0.04))}
                onDelete={() => { setBoxes((list) => list.filter((b) => b.id !== selected.id)); setSelectedId(null); }}
              />
            ) : (
              <p className="text-xs leading-relaxed text-muted-foreground">{t("typeset.hint")}</p>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" disabled={!canUndo} onClick={undo} aria-label={t("common.undo")}><Undo2 className="h-4 w-4" /></Button>
        <Button size="sm" variant="ghost" disabled={!canRedo} onClick={redo} aria-label={t("common.redo")}><Redo2 className="h-4 w-4" /></Button>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={() => useTypesetStore.getState().close()}>{t("common.cancel")}</Button>
          <Button size="sm" disabled={!image || busy !== null} onClick={save}>
            {busy === "save" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t("typeset.save")}
          </Button>
        </div>
      </div>
    </>
  );
}
