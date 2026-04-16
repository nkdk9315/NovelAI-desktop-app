import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PromptTextarea from "@/components/shared/PromptTextarea";

interface SidebarEntryEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName: string;
  initialTag: string;
  initialNegative: string;
  onSave: (name: string, tag: string, negativePrompt: string) => void;
}

export default function SidebarEntryEditModal({
  open,
  onOpenChange,
  initialName,
  initialTag,
  initialNegative,
  onSave,
}: SidebarEntryEditModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [tag, setTag] = useState(initialTag);
  const [negative, setNegative] = useState(initialNegative);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setTag(initialTag);
      setNegative(initialNegative);
    }
  }, [open, initialName, initialTag, initialNegative]);

  const canSave = name.trim().length > 0 && tag.trim().length > 0;
  const handleSave = () => {
    if (!canSave) return;
    onSave(name.trim(), tag.trim(), negative.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-sm left-[8.5rem]! translate-x-0!"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          nameRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-sm">{t("common.edit")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("promptGroup.entryName")}
            className="h-8 text-sm"
          />
          <PromptTextarea
            value={tag}
            onChange={setTag}
            placeholder={t("promptGroup.entryContent")}
            rows={4}
          />
          <PromptTextarea
            value={negative}
            onChange={setNegative}
            placeholder={t("promptGroup.entryNegative")}
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!canSave}>
              {t("common.save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
