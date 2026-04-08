import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePromptStore } from "@/stores/prompt-store";
import type { PromptGroupDto } from "@/types";

interface PromptGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PromptGroupModal({ open, onOpenChange }: PromptGroupModalProps) {
  const { t } = useTranslation();
  const genres = usePromptStore((s) => s.genres);
  const promptGroups = usePromptStore((s) => s.promptGroups);
  const loadGenres = usePromptStore((s) => s.loadGenres);
  const loadPromptGroups = usePromptStore((s) => s.loadPromptGroups);
  const createPromptGroup = usePromptStore((s) => s.createPromptGroup);
  const updatePromptGroup = usePromptStore((s) => s.updatePromptGroup);
  const deletePromptGroup = usePromptStore((s) => s.deletePromptGroup);
  const createGenre = usePromptStore((s) => s.createGenre);
  const deleteGenre = usePromptStore((s) => s.deleteGenre);

  const [selectedGenreId, setSelectedGenreId] = useState<string | undefined>(undefined);
  const [editing, setEditing] = useState<PromptGroupDto | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formGenreId, setFormGenreId] = useState<string | null>(null);
  const [formUsageType, setFormUsageType] = useState("both");
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formTagInput, setFormTagInput] = useState("");
  const [newGenreName, setNewGenreName] = useState("");

  useEffect(() => {
    if (open) {
      loadGenres();
      loadPromptGroups(selectedGenreId);
    }
  }, [open, selectedGenreId, loadGenres, loadPromptGroups]);

  const resetForm = () => {
    setFormName("");
    setFormGenreId(null);
    setFormUsageType("both");
    setFormTags([]);
    setFormTagInput("");
    setEditing(null);
    setShowCreateForm(false);
  };

  const handleEdit = (group: PromptGroupDto) => {
    setEditing(group);
    setFormName(group.name);
    setFormGenreId(group.genreId);
    setFormUsageType(group.usageType);
    setFormTags(group.tags.map((t) => t.tag));
    setShowCreateForm(true);
  };

  const handleAddTag = () => {
    const tag = formTagInput.trim();
    if (tag && !formTags.includes(tag)) {
      setFormTags([...formTags, tag]);
    }
    setFormTagInput("");
  };

  const handleRemoveTag = (index: number) => {
    setFormTags(formTags.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    try {
      if (editing) {
        await updatePromptGroup({
          id: editing.id,
          name: formName.trim(),
          genreId: formGenreId,
          tags: formTags,
        });
      } else {
        await createPromptGroup({
          name: formName.trim(),
          ...(formGenreId ? { genreId: formGenreId } : {}),
          usageType: formUsageType,
          tags: formTags,
        });
      }
      resetForm();
      loadPromptGroups(selectedGenreId);
    } catch (e) {
      toast.error(String(e));
    }
  };

  const handleDelete = async (id: string, isSystem: boolean) => {
    if (isSystem) {
      toast.error(t("promptGroup.systemCannotDelete"));
      return;
    }
    try {
      await deletePromptGroup(id);
      if (editing?.id === id) resetForm();
    } catch (e) {
      toast.error(String(e));
    }
  };

  const handleCreateGenre = async () => {
    if (!newGenreName.trim()) return;
    try {
      await createGenre({ name: newGenreName.trim() });
      setNewGenreName("");
    } catch (e) {
      toast.error(String(e));
    }
  };

  const handleDeleteGenre = async (id: string, isSystem: boolean) => {
    if (isSystem) {
      toast.error(t("promptGroup.systemCannotDelete"));
      return;
    }
    try {
      await deleteGenre(id);
      if (selectedGenreId === id) setSelectedGenreId(undefined);
    } catch (e) {
      toast.error(String(e));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("promptGroup.title")}</DialogTitle>
        </DialogHeader>

        {/* Genre tabs */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-xs">{t("promptGroup.genre")}:</Label>
            <div className="flex flex-wrap gap-1">
              <Button
                variant={selectedGenreId === undefined ? "secondary" : "ghost"}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setSelectedGenreId(undefined)}
              >
                {t("promptGroup.all")}
              </Button>
              {genres.map((genre) => (
                <div key={genre.id} className="group relative">
                  <Button
                    variant={selectedGenreId === genre.id ? "secondary" : "ghost"}
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setSelectedGenreId(genre.id)}
                  >
                    {genre.name}
                  </Button>
                  {!genre.isSystem && (
                    <button
                      type="button"
                      className="absolute -right-1 -top-1 hidden rounded-full bg-destructive p-0.5 text-destructive-foreground group-hover:block"
                      onClick={() => handleDeleteGenre(genre.id, genre.isSystem)}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add genre */}
          <div className="flex gap-2">
            <Input
              value={newGenreName}
              onChange={(e) => setNewGenreName(e.target.value)}
              placeholder={t("promptGroup.genreNamePlaceholder")}
              className="h-7 text-xs"
              onKeyDown={(e) => e.key === "Enter" && handleCreateGenre()}
            />
            <Button size="sm" className="h-7 text-xs" onClick={handleCreateGenre}>
              <Plus className="mr-1 h-3 w-3" />
              {t("promptGroup.newGenre")}
            </Button>
          </div>
        </div>

        <Separator />

        <div className="flex gap-4">
          {/* Group list */}
          <ScrollArea className="h-64 w-1/2">
            <div className="space-y-1 pr-2">
              {promptGroups.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  {t("promptGroup.noGroups")}
                </p>
              ) : (
                promptGroups.map((group) => (
                  <div
                    key={group.id}
                    className={`flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent ${
                      editing?.id === group.id ? "bg-accent" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="flex-1 text-left"
                      onClick={() => handleEdit(group)}
                    >
                      <span>{group.name}</span>
                      {group.isDefaultForGenre && (
                        <Badge variant="outline" className="ml-1 text-[9px]">
                          {t("promptGroup.defaultForGenre")}
                        </Badge>
                      )}
                    </button>
                    {!group.isSystem && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleDelete(group.id, group.isSystem)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full text-xs"
              onClick={() => {
                resetForm();
                setShowCreateForm(true);
              }}
            >
              <Plus className="mr-1 h-3 w-3" />
              {t("promptGroup.newGroup")}
            </Button>
          </ScrollArea>

          {/* Editor */}
          <div className="w-1/2 space-y-3">
            {showCreateForm ? (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">{t("promptGroup.name")}</Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder={t("promptGroup.namePlaceholder")}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">{t("promptGroup.genre")}</Label>
                  <Select
                    value={formGenreId ?? "none"}
                    onValueChange={(v) => setFormGenreId(v === "none" ? null : v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {genres.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">{t("promptGroup.usage")}</Label>
                  <Select value={formUsageType} onValueChange={setFormUsageType}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">{t("promptGroup.usageBoth")}</SelectItem>
                      <SelectItem value="main">{t("promptGroup.usageMain")}</SelectItem>
                      <SelectItem value="character">{t("promptGroup.usageCharacter")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">{t("promptGroup.tags")}</Label>
                  <div className="flex flex-wrap gap-1">
                    {formTags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="gap-1 text-xs">
                        {tag}
                        <button type="button" onClick={() => handleRemoveTag(i)}>
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <Input
                      value={formTagInput}
                      onChange={(e) => setFormTagInput(e.target.value)}
                      placeholder={t("promptGroup.tagPlaceholder")}
                      className="h-7 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                    />
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleAddTag}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="text-xs" onClick={handleSave} disabled={!formName.trim()}>
                    {t("common.save")}
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs" onClick={resetForm}>
                    {t("common.cancel")}
                  </Button>
                </div>
              </>
            ) : (
              <p className="py-8 text-center text-xs text-muted-foreground">
                {t("promptGroup.noGroups")}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
