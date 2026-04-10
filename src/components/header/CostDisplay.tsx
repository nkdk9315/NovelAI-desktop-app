import { useTranslation } from "react-i18next";
import { useCostEstimate } from "@/hooks/use-cost-estimate";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { useSettingsStore } from "@/stores/settings-store";

export default function CostDisplay() {
  const { t } = useTranslation();
  const selectedVibes = useGenerationParamsStore((s) => s.selectedVibes);
  const sidebarPresets = useGenerationParamsStore((s) => s.sidebarPresets);
  const characters = useGenerationParamsStore((s) => s.characters);
  const width = useGenerationParamsStore((s) => s.width);
  const height = useGenerationParamsStore((s) => s.height);
  const steps = useGenerationParamsStore((s) => s.steps);
  const anlas = useSettingsStore((s) => s.anlas);
  const tier = anlas?.tier ?? 0;

  const activePresets = sidebarPresets.filter((p) => p.enabled);
  const presetVibeCount = activePresets.reduce(
    (sum, p) => sum + p.selectedVibes.filter((v) => v.enabled).length,
    0,
  );
  const independentVibeCount = selectedVibes.filter((v) => v.enabled).length;
  const totalVibeCount = presetVibeCount + independentVibeCount;

  const cost = useCostEstimate({
    width,
    height,
    steps,
    vibeCount: totalVibeCount,
    hasCharacterReference: characters.length > 0,
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
