import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useGenerationStore } from "@/stores/generation-store";
import { useHistoryStore } from "@/stores/history-store";

/**
 * Delete history images and keep the center preview consistent: if the image
 * being viewed is deleted, the preview is cleared instead of showing a broken file.
 */
export function useDeleteImages() {
  const { t } = useTranslation();
  const deleteImages = useHistoryStore((s) => s.deleteImages);

  return async (ids: string[]) => {
    if (ids.length === 0) return;
    const deleted = await deleteImages(ids);
    const { lastResult, clearResult } = useGenerationStore.getState();
    if (lastResult && deleted.includes(lastResult.id)) clearResult();
    if (deleted.length === ids.length) {
      toast.success(t("history.deleteSuccess", { count: deleted.length }));
    } else {
      toast.error(t("history.deleteError", { count: ids.length - deleted.length }));
    }
  };
}
