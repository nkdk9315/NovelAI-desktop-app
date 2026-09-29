import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Shirt, Trash2 } from "lucide-react";
import { useGenerationParamsStore, type Character } from "@/stores/generation-params-store";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import { newOutfit, outfitTargetId } from "@/lib/outfits";
import PromptTargetInput from "./PromptTargetInput";

const chip = (on: boolean) =>
  `rounded-md border px-1.5 py-0.5 text-[10px] transition-colors ${
    on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
  }`;

/**
 * Named outfits of a character. The card's own prompt is the base look; the
 * outfit being worn is added to it (in manga mode each panel can pick another).
 */
export default function OutfitEditor({ index, character }: { index: number; character: Character }) {
  const { t } = useTranslation();
  const updateCharacter = useGenerationParamsStore((s) => s.updateCharacter);
  const outfits = character.outfits ?? [];
  const current = outfits.find((o) => o.id === character.outfitId) ?? null;
  const [name, setName] = useState(current?.name ?? "");

  const wear = (id: string | null) => {
    updateCharacter(index, { outfitId: id });
    setName(outfits.find((o) => o.id === id)?.name ?? "");
  };
  const add = () => {
    const outfit = newOutfit(t("outfit.newName", { n: outfits.length + 1 }));
    updateCharacter(index, { outfits: [...outfits, outfit], outfitId: outfit.id });
    setName(outfit.name);
  };
  const rename = () => {
    if (!current || !name.trim() || name.trim() === current.name) return;
    updateCharacter(index, { outfits: outfits.map((o) => (o.id === current.id ? { ...o, name: name.trim() } : o)) });
  };
  const remove = () => {
    if (!current) return;
    useSidebarPromptStore.getState().removeTarget(outfitTargetId(current.id));
    updateCharacter(index, { outfits: outfits.filter((o) => o.id !== current.id), outfitId: null });
  };

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-1" role="radiogroup" aria-label={t("outfit.label")}>
        <Shirt className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] font-medium" title={t("outfit.hint")}>{t("outfit.label")}</span>
        {outfits.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={current?.id === o.id} className={chip(current?.id === o.id)} onClick={() => wear(o.id)}>
            {o.name}
          </button>
        ))}
        {outfits.length > 0 && (
          <button type="button" role="radio" aria-checked={!current} className={chip(!current)} onClick={() => wear(null)}>
            {t("outfit.none")}
          </button>
        )}
        <button
          type="button"
          onClick={add}
          className="ml-auto flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Plus className="h-2.5 w-2.5" />{t("outfit.add")}
        </button>
      </div>
      {current && (
        <div className="space-y-1 rounded-md border border-border bg-muted/20 p-1.5">
          <div className="flex items-center gap-1">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={rename}
              aria-label={t("outfit.name")}
              className="h-6 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:border-ring"
            />
            <button type="button" onClick={remove} aria-label={t("outfit.remove")} title={t("outfit.remove")} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
          <PromptTargetInput key={current.id} targetId={outfitTargetId(current.id)} placeholder={t("outfit.placeholder")} />
        </div>
      )}
    </div>
  );
}
