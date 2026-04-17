import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSidebarPresetGroupStore } from "@/stores/sidebar-preset-group-store";
import { usePresetStore } from "@/stores/preset-store";
import type {
  SidebarPresetGroupActivePreset, SidebarPresetGroupInstanceDto,
} from "@/types";
import StrengthSliderRow from "./StrengthSliderRow";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  instance: SidebarPresetGroupInstanceDto;
  active: SidebarPresetGroupActivePreset | null;
}

export default function PresetStrengthPopover({ open, onOpenChange, instance, active }: Props) {
  const { t } = useTranslation();
  const setPresetStrength = useSidebarPresetGroupStore((s) => s.setPresetStrength);
  const presets = usePresetStore((s) => s.presets);

  const [positive, setPositive] = useState(instance.defaultPositiveStrength);
  const [negative, setNegative] = useState(instance.defaultNegativeStrength);
  const [positiveOverride, setPositiveOverride] = useState(false);
  const [negativeOverride, setNegativeOverride] = useState(false);

  useEffect(() => {
    if (open && active) {
      setPositive(active.positiveStrength ?? instance.defaultPositiveStrength);
      setNegative(active.negativeStrength ?? instance.defaultNegativeStrength);
      setPositiveOverride(active.positiveStrength !== null);
      setNegativeOverride(active.negativeStrength !== null);
    }
  }, [open, active, instance.defaultPositiveStrength, instance.defaultNegativeStrength]);

  const presetName = active ? (presets.find((p) => p.id === active.presetId)?.name ?? "") : "";

  const handleSave = async () => {
    if (!active) return;
    await setPresetStrength(
      instance.id,
      active.presetId,
      positiveOverride ? positive : null,
      negativeOverride ? negative : null,
    );
    onOpenChange(false);
  };

  const handleResetToDefault = async () => {
    if (!active) return;
    await setPresetStrength(instance.id, active.presetId, null, null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {t("sidebarPresetGroups.presetStrength.title")}
            {presetName && <span className="ml-1 text-muted-foreground text-xs">/ {presetName}</span>}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-2 rounded border border-border/60 p-2">
            <label className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={positiveOverride}
                onChange={(e) => setPositiveOverride(e.target.checked)}
              />
              <span>
                {t("sidebarPresetGroups.presetStrength.overridePositive")}
              </span>
              {!positiveOverride && (
                <span className="text-[10px] text-muted-foreground">
                  (default: {instance.defaultPositiveStrength})
                </span>
              )}
            </label>
            {positiveOverride && (
              <StrengthSliderRow
                label={t("sidebarPresetGroups.defaultStrength.positive")}
                value={positive}
                onChange={setPositive}
              />
            )}
          </div>

          <div className="space-y-2 rounded border border-border/60 p-2">
            <label className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={negativeOverride}
                onChange={(e) => setNegativeOverride(e.target.checked)}
              />
              <span>
                {t("sidebarPresetGroups.presetStrength.overrideNegative")}
              </span>
              {!negativeOverride && (
                <span className="text-[10px] text-muted-foreground">
                  (default: {instance.defaultNegativeStrength})
                </span>
              )}
            </label>
            {negativeOverride && (
              <StrengthSliderRow
                label={t("sidebarPresetGroups.defaultStrength.negative")}
                value={negative}
                onChange={setNegative}
              />
            )}
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button variant="ghost" size="sm" onClick={handleResetToDefault}>
            {t("sidebarPresetGroups.presetStrength.resetToDefault")}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSave}>{t("common.save")}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
