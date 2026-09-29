import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PenLine, X } from "lucide-react";
import { useMangaStore } from "@/stores/manga-store";
import { useMangaTemplateStore, type MangaLayoutTemplate } from "@/stores/manga-template-store";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { MANGA_LAYOUT_IDS, PAGE_ASPECTS, layoutShapes, mangaLayout, type MangaLayoutId } from "@/lib/manga-layouts";
import { pageShapes, pageSize } from "@/lib/manga-page";
import type { Shape } from "@/lib/manga-geometry";
import LayoutEditorDialog from "@/components/modals/manga-layout/LayoutEditorDialog";
import MangaLayoutThumb from "./MangaLayoutThumb";

function Tile({ shapes, width, height, label, active, onClick, onRemove, removeLabel }: {
  shapes: Shape[]; width: number; height: number; label: string; active: boolean; onClick: () => void;
  onRemove?: () => void; removeLabel?: string;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        role="radio"
        aria-checked={active}
        title={label}
        onClick={onClick}
        className={`flex w-full flex-col items-center gap-0.5 rounded-md border p-1 transition-colors ${
          active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent"
        }`}
      >
        <MangaLayoutThumb shapes={shapes} width={width} height={height} className="h-10 w-full" />
        <span className="w-full truncate text-center text-[8.5px] leading-tight">{label}</span>
      </button>
      {onRemove && (
        <button
          type="button"
          aria-label={removeLabel}
          title={removeLabel}
          onClick={onRemove}
          className="absolute -top-1 -right-1 rounded-full border border-border bg-background p-px text-muted-foreground hover:text-destructive"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  );
}

/** Built-in layouts, saved templates, and the user's own layout (drawn in the editor). */
export default function MangaLayoutPicker() {
  const { t } = useTranslation();
  const page = useMangaStore((s) => s.page);
  const setLayout = useMangaStore((s) => s.setLayout);
  const setCustomLayout = useMangaStore((s) => s.setCustomLayout);
  const setParam = useGenerationParamsStore((s) => s.setParam);
  const templates = useMangaTemplateStore((s) => s.templates);
  const loaded = useMangaTemplateStore((s) => s.loaded);
  const load = useMangaTemplateStore((s) => s.load);
  const removeTemplate = useMangaTemplateStore((s) => s.remove);
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => { if (!loaded) load(); }, [loaded, load]);

  const setSize = (width: number, height: number) => { setParam("width", width); setParam("height", height); };
  const pickBuiltin = (id: MangaLayoutId) => {
    setLayout(id);
    setSize(mangaLayout(id).width, mangaLayout(id).height);
  };
  const pickTemplate = (tpl: MangaLayoutTemplate) => {
    setCustomLayout(tpl.shapes, tpl.aspect);
    setSize(PAGE_ASPECTS[tpl.aspect].width, PAGE_ASPECTS[tpl.aspect].height);
  };
  const current = pageSize(page);

  return (
    <>
      <div className="grid grid-cols-5 gap-1" role="radiogroup" aria-label={t("manga.layout")}>
        {MANGA_LAYOUT_IDS.map((id) => (
          <Tile
            key={id}
            shapes={layoutShapes(id)} width={mangaLayout(id).width} height={mangaLayout(id).height}
            label={t(`manga.layoutName.${id}`)} active={page.layoutId === id} onClick={() => pickBuiltin(id)}
          />
        ))}
        {templates.map((tpl) => (
          <Tile
            key={tpl.id}
            shapes={tpl.shapes} width={PAGE_ASPECTS[tpl.aspect].width} height={PAGE_ASPECTS[tpl.aspect].height}
            label={tpl.name} active={false} onClick={() => pickTemplate(tpl)}
            onRemove={() => removeTemplate(tpl.id)} removeLabel={t("mangaLayout.removeTemplate", { name: tpl.name })}
          />
        ))}
        {page.layoutId === "custom" && (
          <Tile
            shapes={pageShapes(page)} width={current.width} height={current.height}
            label={t("mangaLayout.custom")} active onClick={() => setEditorOpen(true)}
          />
        )}
        <button
          type="button"
          onClick={() => setEditorOpen(true)}
          title={t("mangaLayout.openEditorHint")}
          className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-dashed border-border p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <PenLine className="h-4 w-4" />
          <span className="text-[8.5px] leading-tight">{t(page.layoutId === "custom" ? "mangaLayout.edit" : "mangaLayout.create")}</span>
        </button>
      </div>
      <LayoutEditorDialog open={editorOpen} onOpenChange={setEditorOpen} />
    </>
  );
}
