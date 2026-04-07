import { useTranslation } from "react-i18next";
import { ImageIcon, Loader2 } from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useGenerationStore } from "@/stores/generation-store";
import { useProjectStore } from "@/stores/project-store";

export default function ImageDisplay() {
  const { t } = useTranslation();
  const isGenerating = useGenerationStore((s) => s.isGenerating);
  const lastResult = useGenerationStore((s) => s.lastResult);
  const error = useGenerationStore((s) => s.error);
  const currentProject = useProjectStore((s) => s.currentProject);

  const imageSrc = lastResult
    ? lastResult.base64Image
      ? `data:image/png;base64,${lastResult.base64Image}`
      : currentProject
        ? convertFileSrc(
            `${currentProject.directoryPath}/${lastResult.filePath}`,
          )
        : undefined
    : undefined;

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden">
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={`Seed: ${lastResult?.seed}`}
          className="max-h-full max-w-full object-contain"
        />
      ) : (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <ImageIcon className="h-12 w-12" />
          <p className="text-sm">{t("history.emptyState")}</p>
        </div>
      )}

      {isGenerating && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <div className="absolute bottom-4 left-4 right-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
