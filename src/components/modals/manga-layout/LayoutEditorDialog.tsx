import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertTriangle, Combine, Redo2, RotateCcw, Save, Undo2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUndoable } from "@/hooks/use-undoable";
import { useMangaStore } from "@/stores/manga-store";
import { useMangaTemplateStore } from "@/stores/manga-template-store";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { isAxisAligned, mergeShapes, rectShape, splitShapes, type Point, type Shape } from "@/lib/manga-geometry";
import { PAGE_ASPECTS, PAGE_ASPECT_IDS, type PageAspectId } from "@/lib/manga-layouts";
import { pageShapes, pageSize } from "@/lib/manga-page";
import LayoutEditorCanvas from "./LayoutEditorCanvas";

/** Panels beyond this are often merged or dropped by the model */
const MANY_PANELS = 6;

interface Draft { aspect: PageAspectId; shapes: Shape[] }

function aspectOfSize(w: number, h: number): PageAspectId {
  return PAGE_ASPECT_IDS.find((id) => PAGE_ASPECTS[id].width === w && PAGE_ASPECTS[id].height === h) ?? "portrait";
}

/** Draw your own panel layout: drag lines across the page to split panels (any angle), merge, save as a template. */
export default function LayoutEditorDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] flex-col gap-3 sm:max-w-4xl" onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t("mangaLayout.title")}</DialogTitle>
          <DialogDescription>{t("mangaLayout.description")}</DialogDescription>
        </DialogHeader>
        {open && <EditorBody onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function EditorBody({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [initial] = useState<Draft>(() => {
    const page = useMangaStore.getState().page;
    const { width, height } = pageSize(page);
    return { aspect: page.aspect ?? aspectOfSize(width, height), shapes: pageShapes(page) };
  });
  const { value: draft, set, undo, redo, canUndo, canRedo } = useUndoable<Draft>(initial);
  const [selected, setSelected] = useState<number[]>([]);
  const [templateName, setTemplateName] = useState("");
  const addTemplate = useMangaTemplateStore((s) => s.add);
  const { width, height } = PAGE_ASPECTS[draft.aspect];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || (e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); setSelected([]); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const split = (a: Point, b: Point) => {
    const next = splitShapes(draft.shapes, a, b);
    if (!next) return;
    set({ ...draft, shapes: next });
    setSelected([]);
  };
  const merged = selected.length === 2 ? mergeShapes(draft.shapes[selected[0]], draft.shapes[selected[1]]) : null;
  const merge = () => {
    if (!merged) return;
    set({ ...draft, shapes: [...draft.shapes.filter((_, i) => !selected.includes(i)), merged] });
    setSelected([]);
  };
  const toggle = (i: number) =>
    setSelected((s) => (s.includes(i) ? s.filter((v) => v !== i) : [...s, i].slice(-2)));

  const apply = () => {
    useMangaStore.getState().setCustomLayout(draft.shapes, draft.aspect);
    const params = useGenerationParamsStore.getState();
    params.setParam("width", width);
    params.setParam("height", height);
    onClose();
  };
  const saveTemplate = () => {
    const name = templateName.trim();
    if (!name) return;
    addTemplate({ name, aspect: draft.aspect, shapes: draft.shapes });
    setTemplateName("");
    toast.success(t("mangaLayout.templateSaved", { name }));
  };

  const slanted = !draft.shapes.every(isAxisAligned);

  return (
    <>
      <div className="flex min-h-0 flex-1 gap-4">
        <LayoutEditorCanvas
          shapes={draft.shapes} width={width} height={height} selected={selected} onSplit={split} onToggleSelect={toggle}
        />
        <div className="flex w-60 shrink-0 flex-col gap-3 overflow-y-auto text-xs">
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground">{t("mangaLayout.aspect")}</p>
            <div className="grid grid-cols-2 gap-1">
              {PAGE_ASPECT_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={draft.aspect === id}
                  onClick={() => set({ ...draft, aspect: id })}
                  className={`rounded-md border px-2 py-1 transition-colors ${draft.aspect === id ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"}`}
                >
                  {t(`mangaLayout.aspectName.${id}`)}
                </button>
              ))}
            </div>
          </div>
          <p className="leading-relaxed text-muted-foreground">{t("mangaLayout.hint")}</p>
          <div className="flex flex-wrap gap-1">
            <Button size="sm" variant="outline" className="h-7 text-xs" disabled={!merged} onClick={merge} title={t("mangaLayout.mergeHint")}>
              <Combine className="h-3.5 w-3.5" />{t("mangaLayout.merge")}
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { set({ ...draft, shapes: [rectShape(0, 0, 1, 1)] }); setSelected([]); }}>
              <RotateCcw className="h-3.5 w-3.5" />{t("mangaLayout.reset")}
            </Button>
          </div>
          {selected.length === 2 && !merged && <p className="text-[10px] text-muted-foreground">{t("mangaLayout.cannotMerge")}</p>}
          {draft.shapes.length > MANY_PANELS && <Warning text={t("mangaLayout.tooMany", { count: draft.shapes.length })} />}
          {slanted && <Warning text={t("mangaLayout.slanted")} />}
          <div className="space-y-1 border-t border-border pt-3">
            <p className="text-[10px] text-muted-foreground">{t("mangaLayout.saveTemplate")}</p>
            <div className="flex gap-1">
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder={t("mangaLayout.templateName")}
                aria-label={t("mangaLayout.templateName")}
                className="h-7 text-xs"
              />
              <Button size="sm" variant="secondary" className="h-7 shrink-0" disabled={!templateName.trim()} onClick={saveTemplate} aria-label={t("mangaLayout.saveTemplate")}>
                <Save className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" disabled={!canUndo} onClick={() => { undo(); setSelected([]); }} aria-label={t("common.undo")}><Undo2 className="h-4 w-4" /></Button>
        <Button size="sm" variant="ghost" disabled={!canRedo} onClick={() => { redo(); setSelected([]); }} aria-label={t("common.redo")}><Redo2 className="h-4 w-4" /></Button>
        <span className="text-xs text-muted-foreground">{t("mangaLayout.panelCount", { count: draft.shapes.length })}</span>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button size="sm" onClick={apply}>{t("mangaLayout.apply")}</Button>
        </div>
      </div>
    </>
  );
}

function Warning({ text }: { text: string }) {
  return (
    <p className="flex items-start gap-1 text-[10px] leading-snug text-amber-600 dark:text-amber-400">
      <AlertTriangle className="mt-px h-3 w-3 shrink-0" />{text}
    </p>
  );
}
