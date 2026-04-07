import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useHistoryStore } from "@/stores/history-store";

export default function HistoryHeader() {
  const { t } = useTranslation();
  const { id: projectId } = useParams<{ id: string }>();
  const loadImages = useHistoryStore((s) => s.loadImages);
  const [filter, setFilter] = useState<string>("all");

  const handleFilterChange = (value: string) => {
    if (!value || !projectId) return;
    setFilter(value);
    loadImages(projectId, value === "saved" ? true : undefined);
  };

  return (
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
  );
}
