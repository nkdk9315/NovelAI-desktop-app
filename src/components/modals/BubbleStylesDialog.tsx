import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import DeleteConfirmDialog from "@/components/modals/DeleteConfirmDialog";
import BubbleShapeIcon from "@/components/shared/BubbleShapeIcon";
import { useBubbleStyleStore } from "@/stores/bubble-style-store";
import { BUBBLE_SHAPES, type BubbleShape, type CustomBubbleStyle } from "@/lib/bubble-styles";

interface BubbleStylesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the new entry's id after "Add" */
  onCreated?: (id: string) => void;
}

function ShapeGrid({ value, onChange }: { value: BubbleShape; onChange: (s: BubbleShape) => void }) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-8 gap-1" role="radiogroup" aria-label={t("dialogue.customDialog.shape")}>
      {BUBBLE_SHAPES.map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={value === s}
          title={t(`dialogue.shape.${s}`)}
          onClick={() => onChange(s)}
          className={`flex items-center justify-center rounded border p-0.5 transition-colors ${
            value === s ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"
          }`}
        >
          <BubbleShapeIcon shape={s} className="h-5 w-7" />
        </button>
      ))}
    </div>
  );
}

function Fields({ phrase, tags, onPhrase, onTags, onBlur }: {
  phrase: string; tags: string; onPhrase: (v: string) => void; onTags: (v: string) => void; onBlur?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <p className="text-[10px] text-muted-foreground">{t("dialogue.customDialog.phrase")}</p>
      <Textarea
        value={phrase}
        onChange={(e) => onPhrase(e.target.value)}
        onBlur={onBlur}
        placeholder={t("dialogue.customDialog.phrasePlaceholder")}
        aria-label={t("dialogue.customDialog.phrase")}
        rows={2}
        className="min-h-0 text-xs"
      />
      <p className="text-[10px] text-muted-foreground">{t("dialogue.customDialog.tags")}</p>
      <Input
        value={tags}
        onChange={(e) => onTags(e.target.value)}
        onBlur={onBlur}
        placeholder={t("dialogue.customDialog.tagsPlaceholder")}
        aria-label={t("dialogue.customDialog.tags")}
        className="h-7 text-xs"
      />
    </>
  );
}

function CustomRow({ entry, onDelete }: { entry: CustomBubbleStyle; onDelete: () => void }) {
  const { t } = useTranslation();
  const update = useBubbleStyleStore((s) => s.updateCustomBubbleStyle);
  // Edit locally and save on blur so typing doesn't write the setting on every key
  const [name, setName] = useState(entry.name);
  const [phrase, setPhrase] = useState(entry.phrase);
  const [tags, setTags] = useState(entry.tags);
  const saveText = () => {
    if (phrase !== entry.phrase || tags !== entry.tags) update(entry.id, { phrase, tags });
  };

  return (
    <div className="space-y-1.5 rounded-md border border-border p-2">
      <div className="flex items-center gap-2">
        <BubbleShapeIcon shape={entry.shape} className="h-6 w-8 shrink-0" />
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => { if (name.trim() && name !== entry.name) update(entry.id, { name: name.trim() }); else setName(entry.name); }}
          aria-label={t("dialogue.customDialog.name")}
          className="h-7 text-xs"
        />
        <Button variant="ghost" size="sm" className="h-7 w-7 shrink-0 p-0" onClick={onDelete} title={t("common.delete")}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <ShapeGrid value={entry.shape} onChange={(shape) => update(entry.id, { shape })} />
      <Fields phrase={phrase} tags={tags} onPhrase={setPhrase} onTags={setTags} onBlur={saveText} />
    </div>
  );
}

/** Register / edit / delete user dialogue kinds (shared across projects). */
export default function BubbleStylesDialog({ open, onOpenChange, onCreated }: BubbleStylesDialogProps) {
  const { t } = useTranslation();
  const customs = useBubbleStyleStore((s) => s.customBubbleStyles);
  const add = useBubbleStyleStore((s) => s.addCustomBubbleStyle);
  const remove = useBubbleStyleStore((s) => s.removeCustomBubbleStyle);
  const [name, setName] = useState("");
  const [shape, setShape] = useState<BubbleShape>("round");
  const [phrase, setPhrase] = useState("");
  const [tags, setTags] = useState("");
  const [deleting, setDeleting] = useState<CustomBubbleStyle | null>(null);

  const canAdd = name.trim() !== "" && phrase.trim() !== "";
  const handleAdd = () => {
    if (!canAdd) return;
    const entry = add({ name: name.trim(), shape, phrase: phrase.trim(), tags: tags.trim() });
    onCreated?.(entry.id);
    setName("");
    setPhrase("");
    setTags("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("dialogue.customDialog.title")}</DialogTitle>
          <DialogDescription>{t("dialogue.customDialog.description")}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {customs.length === 0 ? (
            <p className="py-2 text-center text-xs text-muted-foreground">{t("dialogue.customDialog.empty")}</p>
          ) : (
            customs.map((c) => <CustomRow key={c.id} entry={c} onDelete={() => setDeleting(c)} />)
          )}

          <div className="space-y-1.5 rounded-md border border-dashed border-border p-2">
            <p className="text-xs font-medium">{t("dialogue.customDialog.newHeading")}</p>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("dialogue.customDialog.namePlaceholder")}
              aria-label={t("dialogue.customDialog.name")}
              className="h-7 text-xs"
            />
            <p className="text-[10px] text-muted-foreground">{t("dialogue.customDialog.shape")}</p>
            <ShapeGrid value={shape} onChange={setShape} />
            <Fields phrase={phrase} tags={tags} onPhrase={setPhrase} onTags={setTags} />
            <div className="flex justify-end">
              <Button size="sm" className="h-7 text-xs" disabled={!canAdd} onClick={handleAdd}>
                <Plus className="h-3.5 w-3.5" />
                {t("dialogue.customDialog.add")}
              </Button>
            </div>
          </div>
        </div>

        <DeleteConfirmDialog
          open={deleting !== null}
          onOpenChange={(o) => { if (!o) setDeleting(null); }}
          onConfirm={() => { if (deleting) remove(deleting.id); setDeleting(null); }}
          description={deleting ? t("dialogue.customDialog.deleteConfirm", { name: deleting.name }) : undefined}
        />
      </DialogContent>
    </Dialog>
  );
}
