import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { naxTagKey } from "@/lib/nax";
import type { NaxCategory } from "@/types";
import NaxBrowser from "./NaxBrowser";
import type { NaxSelection } from "./NaxImageGrid";

export interface NaxPickedTag {
  tag: string;
  category: NaxCategory;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the picked tags in the order they were selected. */
  onPick: (tags: NaxPickedTag[]) => void;
}

const keyOf = (t: NaxPickedTag) => `${t.category}:${naxTagKey(t.tag)}`;

/**
 * The tag explorer in pick mode: select any number of tags across genres,
 * then hand them back (e.g. to fill a new prompt group).
 */
export default function NaxTagPickerDialog({ open, onOpenChange, onPick }: Props) {
  const { t } = useTranslation();
  const [picked, setPicked] = useState<NaxPickedTag[]>([]);

  useEffect(() => { if (open) setPicked([]); }, [open]);

  const pickedKeys = useMemo(() => new Set(picked.map(keyOf)), [picked]);
  const selection = useMemo<NaxSelection>(() => ({
    isSelected: (item) => pickedKeys.has(keyOf(item)),
    toggle: (item) => {
      const entry = { tag: item.tag, category: item.category };
      setPicked((prev) => (prev.some((p) => keyOf(p) === keyOf(entry))
        ? prev.filter((p) => keyOf(p) !== keyOf(entry))
        : [...prev, entry]));
    },
  }), [pickedKeys]);

  const confirm = () => {
    onPick(picked);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed inset-x-6 translate-x-0 w-auto max-w-none h-[min(880px,92vh)] overflow-hidden flex flex-col gap-3 sm:max-w-none">
        <NaxBrowser
          selection={selection}
          heading={(
            <>
              <DialogTitle>{t("nax.picker.title")}</DialogTitle>
              <DialogDescription className="text-[11px]">{t("nax.picker.description")}</DialogDescription>
            </>
          )}
        />

        <div className="flex items-center gap-2 border-t border-border pt-3">
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-0.5">
            {picked.length === 0 ? (
              <span className="text-[11px] text-muted-foreground">{t("nax.picker.empty")}</span>
            ) : picked.map((p) => (
              <span key={keyOf(p)} className="flex shrink-0 items-center gap-0.5 rounded-full border border-border bg-muted/50 py-0.5 pl-2 pr-1 text-[11px]">
                <span className="text-muted-foreground">{t(`nax.category.${p.category}`)}</span>
                <span className="max-w-40 truncate">{p.tag}</span>
                <button
                  type="button"
                  aria-label={t("nax.picker.deselect")}
                  onClick={() => selection.toggle({ ...p, image: null })}
                  className="rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          {picked.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setPicked([])}>{t("nax.picker.clear")}</Button>
          )}
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button size="sm" onClick={confirm} disabled={picked.length === 0}>
            {t("nax.picker.add", { count: picked.length })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
