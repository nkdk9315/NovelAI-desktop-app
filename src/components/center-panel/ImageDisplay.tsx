import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy, ImageIcon, Loader2, Maximize, Minus, Plus, X } from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useGenerationStore } from "@/stores/generation-store";
import { useProjectStore } from "@/stores/project-store";
import { useMangaStore } from "@/stores/manga-store";
import { useZoomPan } from "@/hooks/use-zoom-pan";
import ImageToolbar from "./ImageToolbar";
import MangaLayoutPreview from "./MangaLayoutPreview";

export default function ImageDisplay() {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const isGenerating = useGenerationStore((s) => s.isGenerating);
  const lastResult = useGenerationStore((s) => s.lastResult);
  const error = useGenerationStore((s) => s.error);
  const currentProject = useProjectStore((s) => s.currentProject);
  const clearError = useGenerationStore((s) => s.clearError);
  const mangaEnabled = useMangaStore((s) => s.page.enabled);

  const imageSrc = lastResult
    ? lastResult.base64Image
      ? `data:image/png;base64,${lastResult.base64Image}`
      : currentProject
        ? convertFileSrc(
            `${currentProject.directoryPath}/${lastResult.filePath}`,
          )
        : undefined
    : undefined;
  const zoom = useZoomPan(imageSrc);
  const { scale, x, y } = zoom.view;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
    {/* Actions sit in their own row so they never cover the image */}
    {imageSrc && lastResult && <ImageToolbar imageId={lastResult.id} />}
    <div
      ref={zoom.containerRef}
      {...(imageSrc ? zoom.handlers : {})}
      className={`relative flex flex-1 touch-none select-none items-center justify-center overflow-hidden ${
        imageSrc && scale > 1 ? (zoom.interacting ? "cursor-grabbing" : "cursor-grab") : ""
      }`}
    >
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={`Seed: ${lastResult?.seed}`}
          draggable={false}
          style={{ transform: `translate(${x}px, ${y}px) scale(${scale})` }}
          className={`max-h-full max-w-full object-contain will-change-transform ${
            zoom.interacting ? "" : "transition-transform duration-75"
          }`}
        />
      ) : mangaEnabled ? (
        <MangaLayoutPreview />
      ) : (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <ImageIcon className="h-10 w-10 opacity-60" />
          <p className="text-sm">{t("generation.previewEmpty")}</p>
          <p className="text-xs opacity-70">{t("generation.previewEmptyHint")}</p>
        </div>
      )}

      {imageSrc && (
        <div
          className="absolute bottom-3 right-3 flex items-center rounded-md border border-border bg-card/90 text-muted-foreground"
          onPointerDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <button type="button" className="p-1.5 hover:text-foreground" onClick={() => zoom.zoomBy(1 / 1.25)} aria-label={t("generation.zoomOut")}>
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button type="button" className="min-w-12 px-1 text-[11px] tabular hover:text-foreground" onClick={zoom.reset} title={t("generation.zoomFit")}>
            {Math.round(scale * 100)}%
          </button>
          <button type="button" className="p-1.5 hover:text-foreground" onClick={() => zoom.zoomBy(1.25)} aria-label={t("generation.zoomIn")}>
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button type="button" className="border-l border-border p-1.5 hover:text-foreground" onClick={zoom.reset} aria-label={t("generation.zoomFit")}>
            <Maximize className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* While generating, don't cover whatever image the user is looking at. */}
      {isGenerating && (imageSrc ? (
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-md border border-border bg-card/90 px-2 py-1 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          {t("generation.generating")}
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ))}

      {error && (
        <div
          className="absolute bottom-14 left-4 right-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-card p-3 text-sm text-destructive"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(error);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="shrink-0 rounded p-1 hover:bg-destructive/20"
            aria-label={copied ? t("common.copied") : t("common.copy")}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={clearError}
            className="shrink-0 rounded p-1 hover:bg-destructive/20"
            aria-label={t("common.close")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
    </div>
  );
}
