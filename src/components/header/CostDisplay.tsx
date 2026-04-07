import { useTranslation } from "react-i18next";
import { useCostEstimate } from "@/hooks/use-cost-estimate";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { useSettingsStore } from "@/stores/settings-store";

export default function CostDisplay() {
  const { t } = useTranslation();
  const params = useGenerationParamsStore();
  const anlas = useSettingsStore((s) => s.anlas);
  const tier = anlas?.tier ?? 0;

  const cost = useCostEstimate({
    width: params.width,
    height: params.height,
    steps: params.steps,
    vibeCount: 0,
    hasCharacterReference: false,
    tier,
  });

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground">
        {t("generation.cost")}:{" "}
        {cost.isOpusFree ? (
          <span className="font-medium text-green-500">Free</span>
        ) : (
          <span className="font-medium">{cost.totalCost} {t("generation.anlas")}</span>
        )}
      </span>
    </div>
  );
}
