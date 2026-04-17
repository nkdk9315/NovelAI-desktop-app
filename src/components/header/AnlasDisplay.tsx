import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { useSettingsStore } from "@/stores/settings-store";

const TIER_NAMES: Record<number, string> = {
  0: "Free",
  1: "Tablet",
  2: "Scroll",
  3: "Opus",
};

export default function AnlasDisplay() {
  const { t } = useTranslation();
  const { anlas, refreshAnlas } = useSettingsStore();

  useEffect(() => {
    refreshAnlas().catch(() => {});
  }, [refreshAnlas]);

  const tierName = anlas ? TIER_NAMES[anlas.tier] ?? `Tier ${anlas.tier}` : null;

  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {t("generation.anlas")}
      </span>
      <span className="text-sm font-medium tabular">
        {anlas ? anlas.anlas.toLocaleString() : "--"}
      </span>
      {tierName && (
        <Badge
          variant={anlas?.tier === 3 ? "default" : "secondary"}
          className="px-1.5 py-0 text-[10px]"
        >
          {tierName}
        </Badge>
      )}
    </div>
  );
}
