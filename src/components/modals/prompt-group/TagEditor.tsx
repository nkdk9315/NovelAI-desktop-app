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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import PromptTextarea from "@/components/shared/PromptTextarea";
import type { TagInput } from "@/types";

interface TagEditorProps {
  tags: TagInput[];
  onTagsChange: (tags: TagInput[]) => void;
}

export default function TagEditor({ tags, onTagsChange }: TagEditorProps) {
  const { t } = useTranslation();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newContent, setNewContent] = useState("");

  const handleAdd = () => {
    if (!newContent.trim()) return;
    onTagsChange([
      ...tags,
      { name: newName.trim() || undefined, tag: newContent.trim() },
    ]);
    setNewName("");
    setNewContent("");
    setShowAddModal(false);
  };

  const handleRemove = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onTagsChange(tags.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  const handleNameChange = (index: number, name: string) => {
    onTagsChange(tags.map((t, i) => (i === index ? { ...t, name: name || undefined } : t)));
  };

  const handleContentChange = (index: number, tag: string) => {
    onTagsChange(tags.map((t, i) => (i === index ? { ...t, tag } : t)));
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{t("promptGroup.prompts")}</Label>

      <div className="flex flex-wrap gap-1">
        {tags.map((entry, i) => (
          <Popover
            key={i}
            open={editingIndex === i}
            onOpenChange={(open) => { if (!open) setEditingIndex(null); }}
          >
            <PopoverTrigger asChild>
              <Badge
                variant="secondary"
                className="cursor-pointer text-xs hover:bg-accent gap-1 pr-1"
                onClick={() => setEditingIndex(i)}
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
            </PopoverTrigger>
            <PopoverContent className="w-64 space-y-2" align="start">
              <Input
                value={entry.name ?? ""}
                onChange={(e) => handleNameChange(i, e.target.value)}
                placeholder={t("promptGroup.entryName")}
                className="h-7 text-xs"
              />
              <PromptTextarea
                value={entry.tag}
                onChange={(v) => handleContentChange(i, v)}
                placeholder={t("promptGroup.entryContent")}
                rows={3}
              />
              <Button
                size="sm"
                className="h-6 w-full text-xs"
                onClick={() => setEditingIndex(null)}
              >
                {t("common.close")}
              </Button>
            </PopoverContent>
          </Popover>
        ))}

        <Badge
          variant="outline"
          className="cursor-pointer text-xs hover:bg-accent gap-0.5"
          onClick={() => setShowAddModal(true)}
        >
          <Plus className="h-2.5 w-2.5" />
          {t("promptGroup.addPromptEntry")}
        </Badge>
      </div>

      {/* Add entry modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">{t("promptGroup.addPromptEntry")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">{t("promptGroup.entryName")}</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t("promptGroup.entryName")}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("promptGroup.entryContent")}</Label>
              <PromptTextarea
                value={newContent}
                onChange={setNewContent}
                placeholder={t("promptGroup.entryContent")}
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
                {t("common.cancel")}
              </Button>
              <Button size="sm" onClick={handleAdd} disabled={!newName.trim() || !newContent.trim()}>
                {t("promptGroup.addTag")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
