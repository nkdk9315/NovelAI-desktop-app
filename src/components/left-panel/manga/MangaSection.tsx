import { useTranslation } from "react-i18next";
import { AlertTriangle, BookOpen } from "lucide-react";
import { useMangaStore } from "@/stores/manga-store";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { MANGA_LAYOUT_IDS, mangaLayout, type MangaLayoutId } from "@/lib/manga-layouts";
import { isV5Model, maxCharactersFor } from "@/lib/constants";
import type { MangaColorMode } from "@/lib/manga-page";
import MangaLayoutThumb from "./MangaLayoutThumb";
import MangaPanelCard from "./MangaPanelCard";

const COLOR_MODES: readonly MangaColorMode[] = ["mono", "color"];

/** Manga page editor: layout, color, and one card per panel. */
export default function MangaSection() {
  const { t } = useTranslation();
  const page = useMangaStore((s) => s.page);
  const setLayout = useMangaStore((s) => s.setLayout);
  const setColorMode = useMangaStore((s) => s.setColorMode);
  const characters = useGenerationParamsStore((s) => s.characters);
  const model = useGenerationParamsStore((s) => s.model);
  const setParam = useGenerationParamsStore((s) => s.setParam);

  const pickLayout = (id: MangaLayoutId) => {
    setLayout(id);
    const { width, height } = mangaLayout(id);
    setParam("width", width);
    setParam("height", height);
  };
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

      <div className="grid grid-cols-5 gap-1" role="radiogroup" aria-label={t("manga.layout")}>
        {MANGA_LAYOUT_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={page.layoutId === id}
            title={t(`manga.layoutName.${id}`)}
            onClick={() => pickLayout(id)}
            className={`flex flex-col items-center gap-0.5 rounded-md border p-1 transition-colors ${
              page.layoutId === id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            <MangaLayoutThumb layoutId={id} className="h-10 w-full" />
            <span className="w-full truncate text-center text-[8.5px] leading-tight">{t(`manga.layoutName.${id}`)}</span>
          </button>
        ))}
      </div>

      {!isV5Model(model) && <Warning text={t("manga.needsV5")} />}
      {appearances > max && <Warning text={t("manga.tooManyAppearances", { max, count: appearances })} />}
      {characters.length === 0 && <p className="text-[9px] text-muted-foreground">{t("manga.noCharacters")}</p>}

      {page.panels.map((panel, i) => (
        <MangaPanelCard key={panel.id} panel={panel} index={i} layoutId={page.layoutId} characters={characters} />
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
