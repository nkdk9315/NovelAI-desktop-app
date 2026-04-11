import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import PromptTextarea from "@/components/shared/PromptTextarea";
import type { TagInput } from "@/types";

interface TagEditorProps {
  tags: TagInput[];
  onTagsChange: (tags: TagInput[]) => void;
}

export default function TagEditor({ tags, onTagsChange }: TagEditorProps) {
  const { t } = useTranslation();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
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

  const handleRemove = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onTagsChange(tags.filter((_, i) => i !== index));
    if (expandedIndex === index) setExpandedIndex(null);
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
    <div className="space-y-1.5">
      <Label className="text-xs">{t("promptGroup.prompts")}</Label>

      {/* Compact entry list */}
      {tags.map((entry, i) => (
        <div key={i}>
          {/* Collapsed row */}
          <div
            className="flex items-center gap-1.5 rounded px-1 py-0.5 hover:bg-accent cursor-pointer"
            onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
          >
            <ChevronRight
              className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform ${expandedIndex === i ? "rotate-90" : ""}`}
            />
            <Badge variant="secondary" className="text-[10px] truncate max-w-40">
              {entry.name || entry.tag}
            </Badge>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {(entry.defaultStrength ?? 0).toFixed(1)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-5 w-5 p-0 shrink-0"
              onClick={(e) => handleRemove(i, e)}
            >
              <Trash2 className="h-2.5 w-2.5 text-destructive" />
            </Button>
          </div>

          {/* Expanded edit form */}
          {expandedIndex === i && (
            <div className="ml-4 mt-1 space-y-1 rounded border border-border p-2">
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
                rows={2}
              />
              <div className="flex items-center gap-2">
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
            </div>
          )}
        </div>
      ))}

      {/* Add new entry */}
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
            <span className="text-xs text-muted-foreground shrink-0">{t("vibe.strength")}</span>
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
