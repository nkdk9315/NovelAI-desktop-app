import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Copy, Loader2, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSpriteStore } from "@/stores/sprite-store";
import { useSpriteTemplateStore } from "@/stores/sprite-template-store";
import { bakeTexts, copySpec, withFreshIds } from "@/lib/sprite/templates";
import { displayTextOf } from "@/lib/sprite/text";
import { toastError } from "@/lib/toast-error";
import NewSpriteSetDialog from "./NewSpriteSetDialog";

/** Pick / create / rename / copy / delete the sprite set (one character each). */
export default function SpriteSetBar() {
  const { t } = useTranslation();
  const sets = useSpriteStore((s) => s.sets);
  const activeSetId = useSpriteStore((s) => s.activeSetId);
  const saving = useSpriteStore((s) => s.saving);
  const [newOpen, setNewOpen] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const active = sets.find((s) => s.id === activeSetId) ?? null;

  const run = (fn: () => Promise<void>) => () => { fn().catch((e) => toastError(String(e))); };

  const commitRename = run(async () => {
    if (active && renaming?.trim() && renaming.trim() !== active.name) {
      await useSpriteStore.getState().renameSet(active.id, renaming.trim());
    }
    setRenaming(null);
  });

  const duplicate = run(async () => {
    const { spec } = useSpriteStore.getState();
    if (!active || !spec) return;
    await useSpriteStore.getState().createSet(t("sprite.copyName", { name: active.name }), copySpec(spec, displayTextOf));
    toast.success(t("sprite.duplicated"));
  });

  const saveTemplate = run(async () => {
    const { spec } = useSpriteStore.getState();
    if (!active || !spec) return;
    const store = useSpriteTemplateStore.getState();
    if (!store.loaded) await store.load();
    // Masks belong to this set's poses and images, not to a template
    await store.add(active.name, withFreshIds(bakeTexts(spec, displayTextOf), false));
    toast.success(t("sprite.templateSaved", { name: active.name }));
  });

  return (
    <div className="flex items-center gap-2 border-b border-border px-3 py-2">
      {renaming != null ? (
        <Input
          ref={(el) => el?.focus()}
          value={renaming}
          onChange={(e) => setRenaming(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") setRenaming(null);
          }}
          className="h-8 w-56 text-sm"
          aria-label={t("sprite.setName")}
        />
      ) : (
        <Select value={activeSetId ?? ""} onValueChange={(id) => run(() => useSpriteStore.getState().selectSet(id))()}>
          <SelectTrigger className="h-8 w-56 text-sm" aria-label={t("sprite.set")}>
            <SelectValue placeholder={t("sprite.noSet")} />
          </SelectTrigger>
          <SelectContent>
            {sets.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => setNewOpen(true)}>
        <Plus className="h-3.5 w-3.5" />{t("sprite.newSet")}
      </Button>
      {active && (
        <>
          <Button size="icon" variant="ghost" className="h-8 w-8" title={t("sprite.rename")} onClick={() => setRenaming(active.name)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" title={t("sprite.duplicate")} onClick={duplicate}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" title={t("sprite.saveTemplate")} onClick={saveTemplate}>
            <Save className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" title={t("sprite.deleteSet")} onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
      <div className="flex-1" />
      {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-label={t("sprite.saving")} />}

      {newOpen && <NewSpriteSetDialog open={newOpen} onOpenChange={setNewOpen} />}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("sprite.deleteSetTitle", { name: active?.name ?? "" })}</AlertDialogTitle>
            <AlertDialogDescription>{t("sprite.deleteSetBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={active ? run(() => useSpriteStore.getState().deleteSet(active.id)) : undefined}>
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
