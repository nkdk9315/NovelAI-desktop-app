import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Bookmark, Check } from "lucide-react";
import { useHistoryStore } from "@/stores/history-store";
import { useProjectStore } from "@/stores/project-store";
import { useGenerationStore } from "@/stores/generation-store";

export default function ThumbnailGrid() {
  const { t } = useTranslation();
  const { id: projectId } = useParams<{ id: string }>();
  const images = useHistoryStore((s) => s.images);
  const loadImages = useHistoryStore((s) => s.loadImages);
  const selectedImageIds = useHistoryStore((s) => s.selectedImageIds);
  const toggleImageSelection = useHistoryStore((s) => s.toggleImageSelection);
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
        const isViewing = lastResult?.id === img.id;
        const isChecked = selectedImageIds.includes(img.id);

        return (
          <div key={img.id} className="group relative aspect-square">
            <button
              type="button"
              className={`h-full w-full overflow-hidden rounded-md border ${
                isViewing
                  ? "border-primary ring-1 ring-primary"
                  : isChecked
                    ? "border-blue-500 ring-1 ring-blue-500"
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
            </button>

            {img.isSaved && (
              <div className="pointer-events-none absolute right-1 top-1">
                <Bookmark className="h-3 w-3 fill-primary text-primary drop-shadow" />
              </div>
            )}

            {/* Checkbox for batch selection */}
            <button
              type="button"
              aria-label={isChecked ? "deselect" : "select"}
              className={`absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded border transition-opacity ${
                isChecked
                  ? "border-blue-500 bg-blue-500 opacity-100"
                  : "border-white/70 bg-black/40 opacity-0 group-hover:opacity-100"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                toggleImageSelection(img.id);
              }}
            >
              {isChecked && <Check className="h-2.5 w-2.5 text-white" />}
            </button>
          </div>
        );
      })}
    </div>
  );
}
