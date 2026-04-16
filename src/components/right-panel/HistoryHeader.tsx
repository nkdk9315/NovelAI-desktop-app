import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { useHistoryStore } from "@/stores/history-store";

export default function HistoryHeader() {
  const { t } = useTranslation();
  const { id: projectId } = useParams<{ id: string }>();
  const loadImages = useHistoryStore((s) => s.loadImages);
  const selectedImageIds = useHistoryStore((s) => s.selectedImageIds);
  const saveSelectedImages = useHistoryStore((s) => s.saveSelectedImages);
  const clearSelection = useHistoryStore((s) => s.clearSelection);
  const [filter, setFilter] = useState<string>("all");

  const handleFilterChange = (value: string) => {
    if (!value || !projectId) return;
    setFilter(value);
    loadImages(projectId, value === "saved" ? true : undefined);
  };

  const handleSaveSelected = async () => {
    const count = selectedImageIds.length;
    try {
      await saveSelectedImages();
      toast.success(t("history.saveSelectedSuccess", { count }));
    } catch {
      toast.error(t("history.saveSelectedError"));
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between p-4 pb-2">
        <span className="text-sm font-medium">{t("history.title")}</span>
        <ToggleGroup
          type="single"
          value={filter}
          onValueChange={handleFilterChange}
          size="sm"
        >
          <ToggleGroupItem value="all" className="text-xs">
            {t("history.all")}
          </ToggleGroupItem>
          <ToggleGroupItem value="saved" className="text-xs">
            {t("history.saved")}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {selectedImageIds.length > 0 && (
        <div className="flex items-center gap-2 px-4 pb-2">
          <span className="text-xs text-muted-foreground">
            {t("history.selectedCount", { count: selectedImageIds.length })}
          </span>
          <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={handleSaveSelected}>
            {t("history.saveSelected")}
          </Button>
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={clearSelection}>
            {t("history.clearSelection")}
          </Button>
        </div>
      )}
    </div>
  );
}
