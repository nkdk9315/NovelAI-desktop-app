import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Brush, Loader2, SquareDashed } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Button } from "@/components/ui/button";
import { useImageEditStore, type BaseImage, type EditorLayer } from "@/stores/image-edit-store";
import { composeImage, maskCellsOf, maskCellsToBase64 } from "@/lib/canvas-image";
import EditorStage from "./EditorStage";
import EditorOptionsBar from "./EditorOptionsBar";
import { hasContent, useCanvasLayers, type BrushSettings } from "./use-canvas-layers";

/** Full-screen editor to scribble on the base image (img2img) and paint the inpaint mask. */
export default function CanvasEditorDialog() {
  const open = useImageEditStore((s) => s.editorOpen);
  const base = useImageEditStore((s) => s.base);
  const close = useImageEditStore((s) => s.closeEditor);
  return (
    <DialogPrimitive.Root open={open && !!base} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className="fixed inset-3 z-50 flex flex-col overflow-hidden rounded-lg border border-border bg-background shadow-2xl outline-none"
        >
          {base && <EditorBody base={base} />}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function EditorBody({ base }: { base: BaseImage }) {
  const { t } = useTranslation();
  const store = useImageEditStore();
  const [layer, setLayer] = useState<EditorLayer>(store.editorLayer);
  const [brushes, setBrushes] = useState<Record<EditorLayer, BrushSettings>>({
    paint: { tool: "brush", size: 12, color: "#000000", opacity: 1 },
    mask: { tool: "brush", size: 64, color: "#000000", opacity: 1 },
  });
  const [showGrid, setShowGrid] = useState(true);
  const [panning, setPanning] = useState(false);
  const [coverage, setCoverage] = useState(0);
  const [applying, setApplying] = useState(false);
  const layers = useCanvasLayers(base.width, base.height, base.src, store.paintSrc, store.maskSrc);
  const brush = brushes[layer];
  const setBrush = useCallback((partial: Partial<BrushSettings>) =>
    setBrushes((b) => ({ ...b, [layer]: { ...b[layer], ...partial } })), [layer]);

  const apply = async () => {
    const paint = layers.paintRef.current!;
    const mask = layers.maskRef.current!;
    setApplying(true);
    try {
      const painted = hasContent(paint);
      const cells = maskCellsOf(mask, store.targetWidth, store.targetHeight);
      const masked = cells.count > 0;
      store.applyLayers({
        paintSrc: painted ? paint.toDataURL("image/png") : null,
        compositeBase64: painted ? await composeImage(base.src, paint) : null,
        maskSrc: masked ? mask.toDataURL("image/png") : null,
        maskBase64: masked ? maskCellsToBase64(cells) : null,
        maskCoverage: cells.count / cells.cells.length,
      });
      store.setMode(layer === "mask" ? "inpaint" : "img2img");
      store.closeEditor();
    } finally {
      setApplying(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const mod = e.metaKey || e.ctrlKey;
      if (e.code === "Space") { e.preventDefault(); setPanning(e.type === "keydown"); return; }
      if (e.type !== "keydown") return;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) layers.redo(); else layers.undo(); return; }
      if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); layers.redo(); return; }
      if (mod) return;
      const k = e.key.toLowerCase();
      if (k === "b") setBrush({ tool: "brush" });
      else if (k === "e") setBrush({ tool: "eraser" });
      else if (k === "i" && layer === "paint") setBrush({ tool: "eyedropper" });
      else if (k === "r" && layer === "mask") setBrush({ tool: "rect" });
      else if (k === "m") setLayer((l) => (l === "paint" ? "mask" : "paint"));
      else if (k === "[") setBrush({ size: Math.max(2, Math.round(brush.size / 1.2)) });
      else if (k === "]") setBrush({ size: Math.min(300, Math.round(brush.size * 1.2)) });
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKey); };
  }, [layers, layer, brush.size, setBrush]);

  const tab = (value: EditorLayer, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => setLayer(value)}
      className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-left transition-colors ${
        layer === value ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {icon}
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-medium">{t(`imageEdit.layer.${value}`)}</span>
        <span className="text-[10px] opacity-80">{t(`imageEdit.layer.${value}Hint`)}</span>
      </span>
    </button>
  );

  return (
    <>
      <div className="flex items-center gap-3 border-b border-border px-4 py-2">
        <DialogPrimitive.Title className="text-sm font-semibold">{t("imageEdit.editorTitle")}</DialogPrimitive.Title>
        <div className="flex gap-1 rounded-lg border border-border p-0.5">
          {tab("paint", <Brush className="h-4 w-4" />)}
          {tab("mask", <SquareDashed className="h-4 w-4" />)}
        </div>
        <span className="text-xs tabular text-muted-foreground">
          {t("imageEdit.sizeInfo", { w: base.width, h: base.height, tw: store.targetWidth, th: store.targetHeight })}
        </span>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" size="sm" onClick={store.closeEditor}>{t("common.cancel")}</Button>
          <Button size="sm" onClick={apply} disabled={applying}>
            {applying && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            {t(layer === "mask" ? "imageEdit.applyInpaint" : "imageEdit.applyImg2Img")}
          </Button>
        </div>
      </div>
      <EditorOptionsBar
        layer={layer}
        brush={brush}
        onBrush={setBrush}
        showGrid={showGrid}
        onShowGrid={setShowGrid}
        maskCoverage={coverage}
        canUndo={layers.canUndo}
        canRedo={layers.canRedo}
        onUndo={layers.undo}
        onRedo={layers.redo}
        onClear={() => layers.clearLayer(layer)}
        onFillMask={layers.fillMask}
        onInvertMask={layers.invertMask}
      />
      <div className="relative flex min-h-0 flex-1">
        <EditorStage
          baseSrc={base.src}
          width={base.width}
          height={base.height}
          targetWidth={store.targetWidth}
          targetHeight={store.targetHeight}
          layer={layer}
          brush={brush}
          showGrid={showGrid}
          panning={panning}
          layers={layers}
          onPickColor={(color) => setBrush({ color, tool: "brush" })}
          onMaskCoverage={setCoverage}
        />
        <p className="pointer-events-none absolute bottom-2 left-3 rounded bg-background/80 px-2 py-1 text-[10px] text-muted-foreground">
          {t(layer === "mask" ? "imageEdit.shortcutsMask" : "imageEdit.shortcutsPaint")}
        </p>
      </div>
    </>
  );
}
