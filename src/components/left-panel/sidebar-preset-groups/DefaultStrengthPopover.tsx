import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSidebarPresetGroupStore } from "@/stores/sidebar-preset-group-store";
import type { SidebarPresetGroupInstanceDto } from "@/types";
import StrengthSliderRow from "./StrengthSliderRow";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  instance: SidebarPresetGroupInstanceDto;
}

export default function DefaultStrengthPopover({ open, onOpenChange, instance }: Props) {
  const { t } = useTranslation();
  const setDefaultStrength = useSidebarPresetGroupStore((s) => s.setDefaultStrength);
  const [positive, setPositive] = useState(instance.defaultPositiveStrength);
  const [negative, setNegative] = useState(instance.defaultNegativeStrength);

  useEffect(() => {
    if (open) {
      setPositive(instance.defaultPositiveStrength);
      setNegative(instance.defaultNegativeStrength);
    }
  }, [open, instance.defaultPositiveStrength, instance.defaultNegativeStrength]);

  const handleSave = async () => {
    await setDefaultStrength(instance.id, positive, negative);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("sidebarPresetGroups.defaultStrength.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <StrengthSliderRow
            label={t("sidebarPresetGroups.defaultStrength.positive")}
            value={positive}
            onChange={setPositive}
          />
          <StrengthSliderRow
            label={t("sidebarPresetGroups.defaultStrength.negative")}
            value={negative}
            onChange={setNegative}
          />
          <p className="text-[10px] text-muted-foreground">
            {t("sidebarPresetGroups.defaultStrength.description")}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSave}>{t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
