import { useTranslation } from "react-i18next";
import { Slider } from "@/components/ui/slider";

interface PositionSlidersProps {
  centerX: number;
  centerY: number;
  onChangeX: (value: number) => void;
  onChangeY: (value: number) => void;
}

export default function PositionSliders({ centerX, centerY, onChangeX, onChangeY }: PositionSlidersProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {t("character.position")}: {centerX.toFixed(2)}, {centerY.toFixed(2)}
      </p>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-4">{t("character.positionX")}</span>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={[centerX]}
          onValueChange={([v]) => onChangeX(v)}
          aria-label={t("character.positionX")}
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-4">{t("character.positionY")}</span>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={[centerY]}
          onValueChange={([v]) => onChangeY(v)}
          aria-label={t("character.positionY")}
        />
      </div>
    </div>
  );
}
