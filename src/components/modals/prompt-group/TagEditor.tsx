import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PromptTextarea from "@/components/shared/PromptTextarea";
import type { TagInput } from "@/types";

interface TagEditorProps {
  tags: TagInput[];
  onTagsChange: (tags: TagInput[]) => void;
}

export default function TagEditor({ tags, onTagsChange }: TagEditorProps) {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [modalName, setModalName] = useState("");
  const [modalContent, setModalContent] = useState("");

  const openAdd = () => {
    setEditingIndex(null);
    setModalName("");
    setModalContent("");
    setShowModal(true);
  };

  const openEdit = (index: number) => {
    setEditingIndex(index);
    setModalName(tags[index].name ?? "");
    setModalContent(tags[index].tag);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!modalName.trim() || !modalContent.trim()) return;
    if (editingIndex !== null) {
      onTagsChange(tags.map((t, i) =>
        i === editingIndex ? { ...t, name: modalName.trim(), tag: modalContent.trim() } : t,
      ));
    } else {
      onTagsChange([...tags, { name: modalName.trim(), tag: modalContent.trim() }]);
    }
    setShowModal(false);
  };

  const handleRemove = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onTagsChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{t("promptGroup.prompts")}</Label>

      <div className="flex flex-wrap gap-1">
        {tags.map((entry, i) => (
          <Badge
            key={i}
            variant="secondary"
            className="cursor-pointer text-xs hover:bg-accent gap-1 pr-1"
            onClick={() => openEdit(i)}
          >
            {entry.name || entry.tag}
            <button
              type="button"
              className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
              onClick={(e) => handleRemove(i, e)}
            >
              <X className="h-2.5 w-2.5 text-muted-foreground" />
            </button>
          </Badge>
        ))}

        <Badge
          variant="outline"
          className="cursor-pointer hover:bg-accent px-1.5 border-dashed border-primary/40 text-primary"
          onClick={openAdd}
        >
          <Plus className="h-3.5 w-3.5" />
        </Badge>
      </div>

      {/* Add / Edit entry modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {editingIndex !== null ? t("common.edit") : t("common.create")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={modalName}
              onChange={(e) => setModalName(e.target.value)}
              placeholder={t("promptGroup.entryName")}
              className="h-8 text-sm"
            />
            <PromptTextarea
              value={modalContent}
              onChange={setModalContent}
              placeholder={t("promptGroup.entryContent")}
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>
                {t("common.cancel")}
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!modalName.trim() || !modalContent.trim()}>
                {t("common.save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
