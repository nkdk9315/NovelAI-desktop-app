import { useTranslation } from "react-i18next";
import { useMangaStore } from "@/stores/manga-store";
import { pageShapes, pageSize } from "@/lib/manga-page";
import MangaPageShapes, { useFitPage } from "@/components/shared/MangaPageShapes";

/** Manga mode with no image shown: the chosen panel layout, numbered like the panel cards. */
export default function MangaLayoutPreview() {
  const { t } = useTranslation();
  const page = useMangaStore((s) => s.page);
  const { width, height } = pageSize(page);
  const { ref, size } = useFitPage(width, height);
  return (
    <div className="flex h-full w-full flex-col items-center gap-2 p-4">
      <div ref={ref} className="flex min-h-0 w-full flex-1 items-center justify-center">
        <svg width={size.w} height={size.h} className="bg-white shadow" role="img" aria-label={t("manga.layoutPreview")}>
          <MangaPageShapes shapes={pageShapes(page)} size={size} ordered />
        </svg>
      </div>
      <p className="text-xs text-muted-foreground">{t("manga.layoutPreviewHint")}</p>
    </div>
  );
}
