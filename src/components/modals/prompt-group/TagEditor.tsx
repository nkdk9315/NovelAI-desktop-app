import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
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
    setShowAddForm(false);
  };

  const handleRemove = (index: number) => {
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

      {/* Badge grid */}
      <div className="flex flex-wrap gap-1">
        {tags.map((entry, i) => (
          <ContextMenu key={i}>
            <ContextMenuTrigger>
              <Popover
                open={editingIndex === i}
                onOpenChange={(open) => { if (!open) setEditingIndex(null); }}
              >
                <PopoverTrigger asChild>
                  <Badge
                    variant="secondary"
                    className="cursor-pointer text-xs hover:bg-accent"
                  >
                    {entry.name || entry.tag}
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
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => setEditingIndex(i)}>
                {t("common.edit")}
              </ContextMenuItem>
              <ContextMenuItem
                className="text-destructive"
                onClick={() => handleRemove(i)}
              >
                {t("common.delete")}
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ))}

        {/* Add button */}
        {showAddForm ? null : (
          <Badge
            variant="outline"
            className="cursor-pointer text-xs hover:bg-accent gap-0.5"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-2.5 w-2.5" />
            {t("promptGroup.addPromptEntry")}
          </Badge>
        )}
      </div>

      {/* Add new entry form */}
      {showAddForm && (
        <div className="space-y-1 rounded border border-dashed border-border p-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t("promptGroup.entryName")}
            className="h-7 text-xs"
          />
          <PromptTextarea
            value={newContent}
            onChange={setNewContent}
            placeholder={t("promptGroup.entryContent")}
            rows={2}
          />
          <div className="flex gap-1">
            <Button size="sm" className="h-6 text-xs" onClick={handleAdd} disabled={!newContent.trim()}>
              {t("promptGroup.addTag")}
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setShowAddForm(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
