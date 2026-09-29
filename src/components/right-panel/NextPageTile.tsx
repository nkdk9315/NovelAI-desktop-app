import { useTranslation } from "react-i18next";
import { useGenerationStore } from "@/stores/generation-store";
import { useMangaStore } from "@/stores/manga-store";
import { pageShapes, pageSize } from "@/lib/manga-page";
import MangaLayoutThumb from "@/components/left-panel/manga/MangaLayoutThumb";

/** Manga mode: the page to generate next. Selecting it clears the viewed image so the center shows the layout preview. */
export default function NextPageTile() {
  const { t } = useTranslation();
  const page = useMangaStore((s) => s.page);
  const isViewing = useGenerationStore((s) => s.lastResult === null);
  const clearResult = useGenerationStore((s) => s.clearResult);
  const { width, height } = pageSize(page);
  return (
    <button
      type="button"
      title={t("history.nextPageHint")}
      aria-pressed={isViewing}
      onClick={clearResult}
      className={`relative flex aspect-square flex-col items-center justify-center gap-1 overflow-hidden rounded-md border border-dashed p-2 transition-all duration-150 ${
        isViewing
          ? "border-primary text-primary ring-2 ring-primary/70"
          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground hover:ring-2 hover:ring-primary/20"
      }`}
    >
      <MangaLayoutThumb shapes={pageShapes(page)} width={width} height={height} className="min-h-0 w-full flex-1" />
      <span className="text-[10px] leading-tight">{t("history.nextPage")}</span>
    </button>
  );
}
