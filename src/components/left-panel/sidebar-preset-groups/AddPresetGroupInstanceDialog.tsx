import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Folder } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSidebarPresetGroupStore } from "@/stores/sidebar-preset-group-store";
import { usePresetStore } from "@/stores/preset-store";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import PresetFolderPickerDialog from "@/components/modals/preset/PresetFolderPickerDialog";
import CharacterAddButtons from "@/components/left-panel/CharacterAddButtons";
import CharacterPicker from "./CharacterPicker";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function AddPresetGroupInstanceDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const addInstance = useSidebarPresetGroupStore((s) => s.addInstance);
  const folders = usePresetStore((s) => s.presetFolders);
  const characters = useGenerationParamsStore((s) => s.characters);

  const [folderId, setFolderId] = useState<number | null>(null);
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setFolderId(null);
      setSource("");
      setTarget("");
      setPickerOpen(false);
    }
  }, [open]);

  const folderName = folderId != null
    ? (folders.find((f) => f.id === folderId)?.title ?? `#${folderId}`)
    : null;

  const isValid = folderId != null && source && target && source !== target;

  const handleSave = async () => {
    if (!isValid) return;
    await addInstance(folderId!, source, target);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("sidebarPresetGroups.addInstance")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{t("sidebarPresetGroups.folder")}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 justify-start gap-1.5 text-xs"
                onClick={() => setPickerOpen(true)}
              >
                <Folder className="h-3 w-3" />
                {folderName ?? t("sidebarPresetGroups.folderPlaceholder")}
              </Button>
            </div>
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
            {source && target && source === target && (
              <p className="text-xs text-destructive">{t("sidebarPresetGroups.pair.sameError")}</p>
            )}
            <div className="pt-1 border-t border-border/50">
              <CharacterAddButtons />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={!isValid}>{t("common.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PresetFolderPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(id) => setFolderId(id)}
        targetId="sidebar-preset-group-folder-picker"
      />
    </>
  );
}
