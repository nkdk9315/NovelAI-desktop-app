import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSidebarPresetGroupStore } from "@/stores/sidebar-preset-group-store";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import type { SidebarPresetGroupInstanceDto } from "@/types";
import CharacterPicker from "./CharacterPicker";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  instance: SidebarPresetGroupInstanceDto;
}

export default function EditPairPopover({ open, onOpenChange, instance }: Props) {
  const { t } = useTranslation();
  const updatePair = useSidebarPresetGroupStore((s) => s.updatePair);
  const characters = useGenerationParamsStore((s) => s.characters);
  const [source, setSource] = useState(instance.sourceCharacterId);
  const [target, setTarget] = useState(instance.targetCharacterId);

  useEffect(() => {
    if (open) {
      setSource(instance.sourceCharacterId);
      setTarget(instance.targetCharacterId);
    }
  }, [open, instance.sourceCharacterId, instance.targetCharacterId]);

  const isValid = source && target && source !== target;

  const handleSave = async () => {
    if (!isValid) return;
    await updatePair(instance.id, source, target);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("sidebarPresetGroups.pair.edit")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <CharacterPicker
            label={t("sidebarPresetGroups.pair.source")}
            value={source}
            onChange={setSource}
            characters={characters}
          />
          <CharacterPicker
            label={t("sidebarPresetGroups.pair.target")}
            value={target}
            onChange={setTarget}
            characters={characters}
          />
          {!isValid && source === target && (
            <p className="text-xs text-destructive">{t("sidebarPresetGroups.pair.sameError")}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSave} disabled={!isValid}>{t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
