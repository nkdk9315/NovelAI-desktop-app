import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import DeleteConfirmDialog from "@/components/modals/DeleteConfirmDialog";
import { useQualityTagStore } from "@/stores/quality-tag-store";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { builtinQualityTags, customPresetId, type CustomQualityTag } from "@/lib/prompt-decoration";

interface QualityTagsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CustomRow({ entry, onDelete }: { entry: CustomQualityTag; onDelete: () => void }) {
  const { t } = useTranslation();
  const update = useQualityTagStore((s) => s.updateCustomQualityTag);
  // Edit locally and save on blur so typing doesn't write the setting on every key
  const [name, setName] = useState(entry.name);
  const [tags, setTags] = useState(entry.tags);

  return (
    <div className="space-y-1.5 rounded-md border border-border p-2">
      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => { if (name.trim() && name !== entry.name) update(entry.id, { name: name.trim() }); else setName(entry.name); }}
          aria-label={t("generation.qualityTagsDialog.name")}
          className="h-7 text-xs"
        />
        <Button variant="ghost" size="sm" className="h-7 w-7 shrink-0 p-0" onClick={onDelete} title={t("common.delete")}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <Textarea
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        onBlur={() => { if (tags !== entry.tags) update(entry.id, { tags }); }}
        aria-label={t("generation.qualityTagsDialog.tags")}
        rows={2}
        className="min-h-0 text-xs"
      />
    </div>
  );
}

/** Register / edit / delete user quality tags (shared across projects). */
export default function QualityTagsDialog({ open, onOpenChange }: QualityTagsDialogProps) {
  const { t } = useTranslation();
  const customs = useQualityTagStore((s) => s.customQualityTags);
  const add = useQualityTagStore((s) => s.addCustomQualityTag);
  const remove = useQualityTagStore((s) => s.removeCustomQualityTag);
  const model = useGenerationParamsStore((s) => s.model);
  const setParam = useGenerationParamsStore((s) => s.setParam);
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [deleting, setDeleting] = useState<CustomQualityTag | null>(null);

  const builtins = builtinQualityTags(model);
  const canAdd = name.trim() !== "" && tags.trim() !== "";
  const handleAdd = () => {
    if (!canAdd) return;
    const entry = add(name.trim(), tags.trim());
    setParam("qualityPreset", customPresetId(entry.id));
    setName("");
    setTags("");
  };
  const handleDelete = () => {
    if (!deleting) return;
    const params = useGenerationParamsStore.getState();
    if (params.qualityPreset === customPresetId(deleting.id)) params.setParam("qualityPreset", "none");
    remove(deleting.id);
    setDeleting(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("generation.qualityTagsDialog.title")}</DialogTitle>
          <DialogDescription>{t("generation.qualityTagsDialog.description")}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          <div className="space-y-1 rounded-md bg-muted/50 p-2 text-[11px] text-muted-foreground">
            <div className="font-medium text-foreground">{t("generation.qualityTagsDialog.builtin", { model })}</div>
            {(["standard", "light"] as const).filter((id) => builtins[id]).map((id) => (
              <div key={id} className="break-all">
                <span className="font-medium">{t(`generation.qualityPreset.${id}`)}:</span> {builtins[id]}
              </div>
            ))}
          </div>

          {customs.length === 0 ? (
            <p className="py-2 text-center text-xs text-muted-foreground">{t("generation.qualityTagsDialog.empty")}</p>
          ) : (
            customs.map((c) => <CustomRow key={c.id} entry={c} onDelete={() => setDeleting(c)} />)
          )}

          <div className="space-y-1.5 rounded-md border border-dashed border-border p-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("generation.qualityTagsDialog.namePlaceholder")}
              aria-label={t("generation.qualityTagsDialog.name")}
              className="h-7 text-xs"
            />
            <Textarea
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder={t("generation.qualityTagsDialog.tagsPlaceholder")}
              aria-label={t("generation.qualityTagsDialog.tags")}
              rows={2}
              className="min-h-0 text-xs"
            />
            <div className="flex justify-end">
              <Button size="sm" className="h-7 text-xs" disabled={!canAdd} onClick={handleAdd}>
                <Plus className="h-3.5 w-3.5" />
                {t("generation.qualityTagsDialog.add")}
              </Button>
            </div>
          </div>
        </div>

        <DeleteConfirmDialog
          open={deleting !== null}
          onOpenChange={(o) => { if (!o) setDeleting(null); }}
          onConfirm={handleDelete}
          description={deleting ? t("generation.qualityTagsDialog.deleteConfirm", { name: deleting.name }) : undefined}
        />
      </DialogContent>
    </Dialog>
  );
}
