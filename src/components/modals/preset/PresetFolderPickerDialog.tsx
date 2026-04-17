import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PresetModalContent from "./PresetModalContent";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (folderId: number) => void;
  targetId: string;
}

export default function PresetFolderPickerDialog({ open, onOpenChange, onSelect, targetId }: Props) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg left-[8.5rem]! translate-x-0! max-h-[calc(100vh-4rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {t("sidebarPresetGroups.folderPicker.title")}
          </DialogTitle>
        </DialogHeader>
        <PresetModalContent
          targetId={targetId}
          searchQuery={search}
          onSearchChange={setSearch}
          selectionMode={{
            onSelectFolder: (folderId) => {
              onSelect(folderId);
              onOpenChange(false);
            },
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
