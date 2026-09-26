import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import DeleteConfirmDialog from "@/components/modals/DeleteConfirmDialog";
import { useGenerationStore } from "@/stores/generation-store";
import { useHistoryStore } from "@/stores/history-store";
import { useDeleteImages } from "@/hooks/use-delete-images";

/**
 * Deletes the history selection when there is one, otherwise the image
 * currently shown in the center panel. Multi-image deletes ask first.
 */
export default function DeleteImageButton() {
  const { t } = useTranslation();
  const lastResult = useGenerationStore((s) => s.lastResult);
  const selectedImageIds = useHistoryStore((s) => s.selectedImageIds);
  const deleteImages = useDeleteImages();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const targets = selectedImageIds.length > 0
    ? selectedImageIds
    : lastResult ? [lastResult.id] : [];

  const handleClick = () => {
    if (targets.length > 1) setConfirmOpen(true);
    else deleteImages(targets);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleClick} disabled={targets.length === 0}>
        <Trash2 className="mr-1 h-4 w-4" />
        {selectedImageIds.length > 0
          ? t("history.deleteSelectedCount", { count: selectedImageIds.length })
          : t("common.delete")}
      </Button>
      <DeleteConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={() => deleteImages(targets)}
        title={t("history.deleteConfirmTitle")}
        description={t("history.deleteConfirm", { count: targets.length })}
      />
    </>
  );
}
