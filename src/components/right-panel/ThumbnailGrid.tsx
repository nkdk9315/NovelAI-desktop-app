import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Bookmark } from "lucide-react";
import { useHistoryStore } from "@/stores/history-store";
import { useProjectStore } from "@/stores/project-store";
import { useGenerationStore } from "@/stores/generation-store";

export default function ThumbnailGrid() {
  const { t } = useTranslation();
  const { id: projectId } = useParams<{ id: string }>();
  const images = useHistoryStore((s) => s.images);
  const loadImages = useHistoryStore((s) => s.loadImages);
  const currentProject = useProjectStore((s) => s.currentProject);
  const lastResult = useGenerationStore((s) => s.lastResult);
  const selectImage = useGenerationStore((s) => s.selectImage);

  useEffect(() => {
    if (projectId) {
      loadImages(projectId);
    }
  }, [projectId, loadImages]);

  if (images.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-xs text-muted-foreground">
        {t("history.emptyState")}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-1 px-2 pb-2">
      {images.map((img) => {
        const fullPath = currentProject
          ? `${currentProject.directoryPath}/${img.filePath}`
          : img.filePath;
        const isSelected = lastResult?.id === img.id;

        return (
          <button
            key={img.id}
            type="button"
            className={`relative aspect-square overflow-hidden rounded-md border ${
              isSelected
                ? "border-primary ring-1 ring-primary"
                : "border-border hover:border-muted-foreground"
            }`}
            onClick={() => {
              selectImage({
                id: img.id,
                seed: img.seed,
                filePath: img.filePath,
              });
            }}
          >
            <img
              src={convertFileSrc(fullPath)}
              alt={`Seed: ${img.seed}`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            {img.isSaved && (
              <div className="absolute right-1 top-1">
                <Bookmark className="h-3 w-3 fill-primary text-primary" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
