import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import PromptTextarea from "@/components/shared/PromptTextarea";
import type { TagInput } from "@/types";

interface TagEditorProps {
  tags: TagInput[];
  onTagsChange: (tags: TagInput[]) => void;
}

export default function TagEditor({ tags, onTagsChange }: TagEditorProps) {
  const { t } = useTranslation();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newStrength, setNewStrength] = useState(0);

  const handleAdd = () => {
    if (!newContent.trim()) return;
    onTagsChange([
      ...tags,
      {
        name: newName.trim() || undefined,
        tag: newContent.trim(),
        defaultStrength: newStrength,
      },
    ]);
    setNewName("");
    setNewContent("");
    setNewStrength(0);
    setShowAddForm(false);
  };

  const handleRemove = (index: number) => {
    onTagsChange(tags.filter((_, i) => i !== index));
  };

  const handleStrength = (index: number, strength: number) => {
    onTagsChange(tags.map((t, i) => (i === index ? { ...t, defaultStrength: strength } : t)));
  };

  const handleNameChange = (index: number, name: string) => {
    onTagsChange(tags.map((t, i) => (i === index ? { ...t, name: name || undefined } : t)));
  };

  const handleContentChange = (index: number, tag: string) => {
    onTagsChange(tags.map((t, i) => (i === index ? { ...t, tag } : t)));
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">{t("promptGroup.prompts")}</Label>

      {/* Existing entries */}
      {tags.map((entry, i) => (
        <div key={i} className="space-y-1 rounded border border-border p-2">
          <div className="flex items-center gap-2">
            <Input
              value={entry.name ?? ""}
              onChange={(e) => handleNameChange(i, e.target.value)}
              placeholder={t("promptGroup.entryName")}
              className="h-7 flex-1 text-xs"
            />
            <div className="flex w-28 items-center gap-1">
              <Slider
                min={-10} max={10} step={0.1}
                value={[entry.defaultStrength ?? 0]}
                onValueChange={([v]) => handleStrength(i, Math.round(v * 10) / 10)}
                className="flex-1"
              />
              <span className="w-8 text-right text-[10px] text-muted-foreground">
                {(entry.defaultStrength ?? 0).toFixed(1)}
              </span>
            </div>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleRemove(i)}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
          <PromptTextarea
            value={entry.tag}
            onChange={(v) => handleContentChange(i, v)}
            placeholder={t("promptGroup.entryContent")}
            rows={2}
          />
        </div>
      ))}

      {/* Add new entry form */}
      {showAddForm ? (
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
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t("vibe.strength")}</span>
            <Slider
              min={-10} max={10} step={0.1}
              value={[newStrength]}
              onValueChange={([v]) => setNewStrength(Math.round(v * 10) / 10)}
              className="flex-1"
            />
            <span className="w-8 text-right text-[10px] text-muted-foreground">
              {newStrength.toFixed(1)}
            </span>
          </div>
          <div className="flex gap-1 pt-1">
            <Button size="sm" className="h-6 text-xs" onClick={handleAdd} disabled={!newContent.trim()}>
              {t("promptGroup.addTag")}
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setShowAddForm(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1 text-xs"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="h-3 w-3" />
          {t("promptGroup.addPromptEntry")}
        </Button>
      )}
    </div>
  );
}
