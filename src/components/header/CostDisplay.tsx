import { useTranslation } from "react-i18next";
import { useGenerationPlan } from "@/hooks/use-generation-plan";

export default function CostDisplay() {
  const { t } = useTranslation();
  // Same estimate as the generate button: mode (img2img / inpaint),
  // base image size, character reference and vibes are all accounted for.
  const { cost } = useGenerationPlan();

  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {t("generation.cost")}
      </span>
      {cost.totalCost === 0 ? (
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
