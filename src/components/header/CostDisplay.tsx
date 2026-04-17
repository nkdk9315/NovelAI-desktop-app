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
  const uniqueVibeIds = new Set([
    ...activePresets.flatMap((p) => p.selectedVibes.filter((v) => v.enabled).map((v) => v.vibeId)),
    ...selectedVibes.filter((v) => v.enabled).map((v) => v.vibeId),
  ]);
  const totalVibeCount = uniqueVibeIds.size;

  const cost = useCostEstimate({
    width,
    height,
    steps,
    vibeCount: totalVibeCount,
    hasCharacterReference: characters.length > 0,
    tier,
  });

  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {t("generation.cost")}
      </span>
      {cost.isOpusFree ? (
        <span className="text-sm font-medium text-primary">Free</span>
      ) : (
        <span className="text-sm font-medium tabular">
          {cost.totalCost}
          <span className="ml-1 text-[10px] font-normal text-muted-foreground">
            {t("generation.anlas")}
          </span>
        </span>
      )}
    </div>
  );
}
