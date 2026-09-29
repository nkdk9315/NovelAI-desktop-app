import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import PromptTargetInput from "@/components/left-panel/PromptTargetInput";
import { useSpriteStore } from "@/stores/sprite-store";
import { newPart, spriteTargetId } from "@/lib/sprite/spec";
import { move, removePart } from "@/lib/sprite/edit";
import { CommitInput, RowActions, Section, chip, dropTargets, updateSpec } from "./common";
import StagesTable from "./StagesTable";

/**
 * Outfit parts, written in detail once so every sprite wears the same
 * clothes. A part worn under others (underwear) stays out of the prompt
 * until a part over it is torn open or gone.
 */
export default function OutfitSection() {
  const { t } = useTranslation();
  const parts = useSpriteStore((s) => s.spec!.outfit.parts);

  const add = () => updateSpec((s) => ({
    ...s,
    outfit: { ...s.outfit, parts: [...s.outfit.parts, newPart(t("sprite.define.newPart", { n: s.outfit.parts.length + 1 }))] },
  }));
  const patchPart = (id: string, fn: (p: (typeof parts)[number]) => (typeof parts)[number]) =>
    updateSpec((s) => ({ ...s, outfit: { ...s.outfit, parts: s.outfit.parts.map((p) => (p.id === id ? fn(p) : p)) } }));

  return (
    <Section
      title={t("sprite.define.outfit")}
      hint={t("sprite.define.outfitHint")}
      actions={<Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={add}><Plus className="h-3 w-3" />{t("sprite.define.addPart")}</Button>}
    >
      <div className="space-y-2">
        {parts.map((part, i) => {
          const others = parts.filter((p) => p.id !== part.id);
          return (
            <div key={part.id} className="space-y-1.5 rounded-md border border-border p-2">
              <div className="flex flex-wrap items-center gap-2">
                <CommitInput value={part.name} className="w-32" aria-label={t("sprite.define.partName")}
                  onCommit={(v) => patchPart(part.id, (p) => ({ ...p, name: v.trim() || p.name }))} />
                {others.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1" title={t("sprite.define.coveredByHint")}>
                    <span className="text-[10px] text-muted-foreground">{t("sprite.define.coveredBy")}</span>
                    {others.map((o) => {
                      const on = part.coveredBy.includes(o.id);
                      return (
                        <button key={o.id} type="button" aria-pressed={on} className={chip(on)}
                          onClick={() => patchPart(part.id, (p) => ({
                            ...p, coveredBy: on ? p.coveredBy.filter((c) => c !== o.id) : [...p.coveredBy, o.id],
                          }))}>
                          {o.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="flex-1" />
                <RowActions index={i} count={parts.length}
                  onMove={(d) => updateSpec((s) => ({ ...s, outfit: { ...s.outfit, parts: move(s.outfit.parts, i, d) } }))}
                  onRemove={() => { dropTargets([part.id]); updateSpec((s) => removePart(s, part.id)); }} />
              </div>
              {part.coveredBy.length > 0 && (
                <p className="text-[10px] text-sky-600 dark:text-sky-400">{t("sprite.define.hiddenPart")}</p>
              )}
              <PromptTargetInput targetId={spriteTargetId(part.id)} initialText={part.prompt} placeholder={t("sprite.define.partPlaceholder")} />
            </div>
          );
        })}
        {parts.length === 0 && <p className="text-xs text-muted-foreground">{t("sprite.define.noParts")}</p>}
      </div>
      <StagesTable />
    </Section>
  );
}
