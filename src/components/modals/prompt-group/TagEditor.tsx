import { useRef, useState } from "react";
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
  const nameInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const nameEnterCountRef = useRef(0);
  const shouldFocusAddBtnRef = useRef(false);

  const canSave = modalName.trim().length > 0 && modalContent.trim().length > 0;

  const openAdd = () => {
    setEditingIndex(null);
    setModalName("");
    setModalContent("");
    nameEnterCountRef.current = 0;
    setShowModal(true);
  };

  const openEdit = (index: number) => {
    setEditingIndex(index);
    setModalName(tags[index].name ?? "");
    setModalContent(tags[index].tag);
    nameEnterCountRef.current = 0;
    setShowModal(true);
  };

  const handleSave = () => {
    if (!canSave) return;
    if (editingIndex !== null) {
      onTagsChange(tags.map((t, i) =>
        i === editingIndex ? { ...t, name: modalName.trim(), tag: modalContent.trim() } : t,
      ));
    } else {
      onTagsChange([...tags, { name: modalName.trim(), tag: modalContent.trim() }]);
    }
    shouldFocusAddBtnRef.current = true;
    setShowModal(false);
  };

  const handleSaveAndAddAnother = () => {
    if (!canSave) return;
    onTagsChange([...tags, { name: modalName.trim(), tag: modalContent.trim() }]);
    setModalName("");
    setModalContent("");
    setEditingIndex(null);
    setTimeout(() => nameInputRef.current?.focus(), 0);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      nameEnterCountRef.current += 1;
      if (nameEnterCountRef.current >= 2) {
        nameEnterCountRef.current = 0;
        contentRef.current?.focus();
      }
    } else {
      nameEnterCountRef.current = 0;
    }
  };

  const handleContentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (editingIndex === null) handleSaveAndAddAnother();
      else handleSave();
    }
  };

  const handleRemove = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onTagsChange(tags.filter((_, i) => i !== index));
  };

  const handleEntryKeyDown = (index: number, e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openEdit(index);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      onTagsChange(tags.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{t("promptGroup.prompts")}</Label>

      <div className="flex flex-wrap gap-1 max-h-60 overflow-y-auto rounded border border-border/50 p-1">
        {tags.map((entry, i) => (
          <Badge
            key={i}
            variant="secondary"
            tabIndex={0}
            role="button"
            className="cursor-pointer text-xs hover:bg-accent gap-1 pr-1 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
            onClick={() => openEdit(i)}
            onKeyDown={(e) => handleEntryKeyDown(i, e)}
          >
            {entry.name || entry.tag}
            <button
              type="button"
              tabIndex={-1}
              className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
              onClick={(e) => handleRemove(i, e)}
            >
              <X className="h-2.5 w-2.5 text-muted-foreground" />
            </button>
          </Badge>
        ))}

        <button
          type="button"
          ref={addBtnRef}
          onClick={openAdd}
          className="inline-flex items-center rounded-md border border-dashed border-primary/40 bg-transparent px-1.5 py-0.5 text-primary hover:bg-accent outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Add / Edit entry modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent
          className="max-w-sm"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            nameInputRef.current?.focus();
          }}
          onCloseAutoFocus={(e) => {
            if (shouldFocusAddBtnRef.current) {
              e.preventDefault();
              shouldFocusAddBtnRef.current = false;
              setTimeout(() => addBtnRef.current?.focus(), 0);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-sm">
              {editingIndex !== null ? t("common.edit") : t("common.create")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              ref={nameInputRef}
              value={modalName}
              onChange={(e) => setModalName(e.target.value)}
              onKeyDown={handleNameKeyDown}
              placeholder={t("promptGroup.entryName")}
              className="h-8 text-sm"
            />
            <PromptTextarea
              value={modalContent}
              onChange={setModalContent}
              onKeyDown={handleContentKeyDown}
              textareaRef={contentRef}
              placeholder={t("promptGroup.entryContent")}
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>
                {t("common.cancel")}
              </Button>
              {editingIndex === null && (
                <Button variant="secondary" size="sm" onClick={handleSaveAndAddAnother} disabled={!canSave}>
                  {t("promptGroup.saveAndAddAnother")}
                </Button>
              )}
              <Button size="sm" onClick={handleSave} disabled={!canSave}>
                {t("common.save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
