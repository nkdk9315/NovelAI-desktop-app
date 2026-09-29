import { useTranslation } from "react-i18next";
import { AlertTriangle, BookOpen } from "lucide-react";
import { useMangaStore } from "@/stores/manga-store";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { pageShapes, pageSize } from "@/lib/manga-page";
import { isAxisAligned } from "@/lib/manga-geometry";
import { activeEditMode, useImageEditStore } from "@/stores/image-edit-store";
import { isV5Model, maxCharactersFor } from "@/lib/constants";
import type { MangaColorMode } from "@/lib/manga-page";
import MangaLayoutPicker from "./MangaLayoutPicker";
import MangaPanelCard from "./MangaPanelCard";

const COLOR_MODES: readonly MangaColorMode[] = ["mono", "color"];

/** Manga page editor: layout, color, and one card per panel. */
export default function MangaSection() {
  const { t } = useTranslation();
  const page = useMangaStore((s) => s.page);
  const setColorMode = useMangaStore((s) => s.setColorMode);
  const characters = useGenerationParamsStore((s) => s.characters);
  const editMode = useImageEditStore((s) => activeEditMode(s));
  const model = useGenerationParamsStore((s) => s.model);

  const shapes = pageShapes(page);
  const slanted = page.layoutId === "custom" && !shapes.every(isAxisAligned);
  const size = pageSize(page);
  const appearances = page.panels.reduce((n, p) => n + p.cast.length, 0);
  const max = maxCharactersFor(model);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <BookOpen className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium">{t("manga.title")}</span>
        <div className="ml-auto flex items-center rounded border border-border p-px">
          {COLOR_MODES.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={page.colorMode === m}
              onClick={() => setColorMode(m)}
              className={`rounded px-1.5 py-0.5 text-[9px] transition-colors ${
                page.colorMode === m ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {t(`manga.color.${m}`)}
            </button>
          ))}
        </div>
      </div>

      <MangaLayoutPicker />

      {!isV5Model(model) && <Warning text={t("manga.needsV5")} />}
      {slanted && editMode && <Warning text={t("mangaLayout.slantedWithEdit")} />}
      {appearances > max && <Warning text={t("manga.tooManyAppearances", { max, count: appearances })} />}
      {characters.length === 0 && <p className="text-[9px] text-muted-foreground">{t("manga.noCharacters")}</p>}

      {page.panels.map((panel, i) => (
        <MangaPanelCard key={panel.id} panel={panel} index={i} shapes={shapes} size={size} characters={characters} />
      ))}
    </div>
  );
}

function Warning({ text }: { text: string }) {
  return (
    <p className="flex items-start gap-1 text-[9px] leading-snug text-amber-600 dark:text-amber-400">
      <AlertTriangle className="mt-px h-2.5 w-2.5 shrink-0" />
      {text}
    </p>
  );
}
