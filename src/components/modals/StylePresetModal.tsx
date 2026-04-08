import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/toast-error";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { StylePresetDto, VibeDto } from "@/types";
import * as ipc from "@/lib/ipc";
import DeleteConfirmDialog from "./DeleteConfirmDialog";

interface StylePresetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPresetsChanged: () => void;
}

export default function StylePresetModal({ open, onOpenChange, onPresetsChanged }: StylePresetModalProps) {
  const { t } = useTranslation();
  const [presets, setPresets] = useState<StylePresetDto[]>([]);
  const [vibes, setVibes] = useState<VibeDto[]>([]);
  const [editing, setEditing] = useState<StylePresetDto | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StylePresetDto | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formArtistTagInput, setFormArtistTagInput] = useState("");
  const [formArtistTags, setFormArtistTags] = useState<string[]>([]);
  const [formVibeIds, setFormVibeIds] = useState<string[]>([]);

  const loadData = async () => {
    try {
      const [p, v] = await Promise.all([ipc.listStylePresets(), ipc.listVibes()]);
      setPresets(p);
      setVibes(v);
    } catch (e) {
      toastError(String(e));
    }
  };

  useEffect(() => {
    if (open) loadData();
  }, [open]);

  const resetForm = () => {
    setFormName("");
    setFormArtistTagInput("");
    setFormArtistTags([]);
    setFormVibeIds([]);
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (preset: StylePresetDto) => {
    setEditing(preset);
    setFormName(preset.name);
    setFormArtistTags([...preset.artistTags]);
    setFormVibeIds([...preset.vibeIds]);
    setShowForm(true);
  };

  const handleAddArtistTag = () => {
    const tag = formArtistTagInput.trim();
    if (tag && !formArtistTags.includes(tag)) {
      setFormArtistTags([...formArtistTags, tag]);
    }
    setFormArtistTagInput("");
  };

  const handleRemoveArtistTag = (index: number) => {
    setFormArtistTags(formArtistTags.filter((_, i) => i !== index));
  };

  const handleToggleVibe = (vibeId: string) => {
    setFormVibeIds((prev) =>
      prev.includes(vibeId) ? prev.filter((id) => id !== vibeId) : [...prev, vibeId],
    );
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    try {
      if (editing) {
        await ipc.updateStylePreset({
          id: editing.id,
          name: formName.trim(),
          artistTags: formArtistTags,
          vibeIds: formVibeIds,
        });
      } else {
        await ipc.createStylePreset({
          name: formName.trim(),
          artistTags: formArtistTags,
          vibeIds: formVibeIds,
        });
      }
      toast.success(t("style.saveSuccess"));
      resetForm();
      await loadData();
      onPresetsChanged();
    } catch (e) {
      toastError(String(e));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await ipc.deleteStylePreset(deleteTarget.id);
      setDeleteTarget(null);
      if (editing?.id === deleteTarget.id) resetForm();
      toast.success(t("style.deleteSuccess"));
      await loadData();
      onPresetsChanged();
    } catch (e) {
      toastError(String(e));
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("style.manage")}</DialogTitle>
          </DialogHeader>

          <div className="flex gap-4">
            {/* Preset list */}
            <ScrollArea className="h-72 w-1/2">
              <div className="space-y-1 pr-2">
                {presets.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    {t("style.noPresets")}
                  </p>
                ) : (
                  presets.map((preset) => (
                    <div
                      key={preset.id}
                      className={`flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent ${
                        editing?.id === preset.id ? "bg-accent" : ""
                      }`}
                    >
                      <button
                        type="button"
                        className="flex-1 text-left min-w-0"
                        onClick={() => handleEdit(preset)}
                      >
                        <p className="text-sm truncate">{preset.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {preset.artistTags.length} tags, {preset.vibeIds.length} vibes
                        </p>
                      </button>
                      <div className="flex shrink-0 gap-0.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleEdit(preset)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => setDeleteTarget(preset)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
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
                  setShowForm(true);
                }}
              >
                <Plus className="mr-1 h-3 w-3" />
                {t("style.newPreset")}
              </Button>
            </ScrollArea>

            {/* Editor */}
            <div className="w-1/2 space-y-3">
              {showForm ? (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("style.presetName")}</Label>
                    <Input
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder={t("style.presetNamePlaceholder")}
                      className="h-7 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">{t("style.artist")}</Label>
                    <div className="flex gap-1">
                      <Input
                        value={formArtistTagInput}
                        onChange={(e) => setFormArtistTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddArtistTag();
                          }
                        }}
                        placeholder={t("style.artistPlaceholder")}
                        className="h-7 text-xs"
                      />
                    </div>
                    {formArtistTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {formArtistTags.map((tag, i) => (
                          <Badge key={tag} variant="secondary" className="text-[10px]">
                            {tag}
                            <button type="button" onClick={() => handleRemoveArtistTag(i)} className="ml-1">
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-1">
                    <Label className="text-xs">{t("style.vibes")}</Label>
                    {vibes.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground">{t("vibe.empty")}</p>
                    ) : (
                      <div className="space-y-1">
                        {vibes.map((vibe) => (
                          <div key={vibe.id} className="flex items-center gap-2">
                            <Checkbox
                              checked={formVibeIds.includes(vibe.id)}
                              onCheckedChange={() => handleToggleVibe(vibe.id)}
                            />
                            <span className="text-xs truncate">{vibe.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" className="text-xs" onClick={handleSave}>
                      {t("common.save")}
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs" onClick={resetForm}>
                      {t("common.cancel")}
                    </Button>
                  </div>
                </>
              ) : (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  {t("style.selectPreset")}
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t("style.deleteConfirm")}
        description={deleteTarget?.name}
      />
    </>
  );
}
