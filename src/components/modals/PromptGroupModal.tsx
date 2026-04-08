import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { toastError } from "@/lib/toast-error";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { usePromptStore } from "@/stores/prompt-store";
import type { PromptGroupDto } from "@/types";
import GenreTabs from "./prompt-group/GenreTabs";
import PromptGroupForm from "./prompt-group/PromptGroupForm";

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
      toastError(String(e));
    }
  };

  const handleDelete = async (id: string, isSystem: boolean) => {
    if (isSystem) {
      toastError(t("promptGroup.systemCannotDelete"));
      return;
    }
    try {
      await deletePromptGroup(id);
      if (editing?.id === id) resetForm();
    } catch (e) {
      toastError(String(e));
    }
  };

  const handleCreateGenre = async () => {
    if (!newGenreName.trim()) return;
    try {
      await createGenre({ name: newGenreName.trim() });
      setNewGenreName("");
    } catch (e) {
      toastError(String(e));
    }
  };

  const handleDeleteGenre = async (id: string, isSystem: boolean) => {
    if (isSystem) {
      toastError(t("promptGroup.systemCannotDelete"));
      return;
    }
    try {
      await deleteGenre(id);
      if (selectedGenreId === id) setSelectedGenreId(undefined);
    } catch (e) {
      toastError(String(e));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("promptGroup.title")}</DialogTitle>
        </DialogHeader>

        <GenreTabs
          genres={genres}
          selectedGenreId={selectedGenreId}
          onSelectGenre={setSelectedGenreId}
          newGenreName={newGenreName}
          onNewGenreNameChange={setNewGenreName}
          onCreateGenre={handleCreateGenre}
          onDeleteGenre={handleDeleteGenre}
        />

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
            <PromptGroupForm
              editing={editing}
              showCreateForm={showCreateForm}
              formName={formName}
              onFormNameChange={setFormName}
              formGenreId={formGenreId}
              onFormGenreIdChange={setFormGenreId}
              formUsageType={formUsageType}
              onFormUsageTypeChange={setFormUsageType}
              formTags={formTags}
              formTagInput={formTagInput}
              onFormTagInputChange={setFormTagInput}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
              onSave={handleSave}
              onCancel={resetForm}
              genres={genres}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
