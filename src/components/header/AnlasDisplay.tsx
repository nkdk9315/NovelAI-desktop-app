import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
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
  const anlas = useSettingsStore((s) => s.anlas);
  const refreshAnlas = useSettingsStore((s) => s.refreshAnlas);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    refreshAnlas().catch(() => {});
  }, [refreshAnlas]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAnlas();
    } catch {
      toast.error(t("generation.anlasRefreshError"));
    } finally {
      setRefreshing(false);
    }
  };

  const tierName = anlas ? TIER_NAMES[anlas.tier] ?? `Tier ${anlas.tier}` : null;

  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {t("generation.anlas")}
      </span>
      <span className="text-sm font-medium tabular">
        {anlas ? anlas.anlas.toLocaleString() : "--"}
      </span>
      {anlas?.opusUsage && (
        <span
          className={`text-[10px] tabular ${anlas.opusUsage.isLow ? "text-destructive" : "text-muted-foreground"}`}
          title={t("generation.opusUsageTooltip", {
            images: anlas.opusUsage.estimatedImagesRemaining,
            refill: anlas.opusUsage.refillPercentPerDay,
          })}
        >
          {t("generation.opusUsage", { percent: anlas.opusUsage.remainingPercent.toFixed(1) })}
        </span>
      )}
      <button
        type="button"
        onClick={handleRefresh}
        disabled={refreshing}
        title={t("generation.anlasRefresh")}
        aria-label={t("generation.anlasRefresh")}
        className="self-center rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-60"
      >
        <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
      </button>
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
