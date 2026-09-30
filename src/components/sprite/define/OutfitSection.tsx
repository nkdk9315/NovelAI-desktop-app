import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { parseCellKey } from "@/lib/sprite/cells";
import PromptTargetInput from "@/components/left-panel/PromptTargetInput";
import { useSpriteStore } from "@/stores/sprite-store";
import { newAxis, newPart, spriteTargetId } from "@/lib/sprite/spec";
import { move, removeAxis, removePart, uniqueKey } from "@/lib/sprite/edit";
import { CommitInput, RowActions, Section, chip, dropTargets, updateSpec } from "./common";
import StagesTable from "./StagesTable";
import { HelpDot } from "../Hint";

/**
 * Outfit parts, written in detail once so every sprite wears the same
 * clothes. A part worn under others (underwear) stays out of the prompt
 * until a part over it is torn open or gone.
 */
export default function OutfitSection() {
  const { t } = useTranslation();
  const parts = useSpriteStore((s) => s.spec!.outfit.parts);
  const damageAxis = useSpriteStore((s) => s.spec!.axes.find((a) => a.kind === "outfit") ?? null);
  const damageCells = useSpriteStore((s) => (damageAxis
    ? Object.values(s.cells).filter((c) => c.candidates.length > 0 && parseCellKey(c.cellKey).levels[damageAxis.id] != null).length
    : 0));
  const [confirmOff, setConfirmOff] = useState(false);
  const setDamage = (on: boolean) => {
    if (on) {
      updateSpec((s) => {
        const axis = newAxis(t("sprite.define.outfitAxis"), uniqueKey("damage", s.axes.map((a) => a.key)), "outfit");
        const body = s.regions.find((r) => r.key === "body") ?? s.regions[0];
        axis.regionIds = body ? [body.id] : [];
        return { ...s, axes: [axis, ...s.axes] };
      });
    } else if (damageCells > 0) {
      setConfirmOff(true);
    } else if (damageAxis) {
      updateSpec((s) => removeAxis(s, damageAxis.id));
    }
  };

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
      help={t("sprite.help.sections.outfit")}
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
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">{t("sprite.define.coveredBy")}</span>
                    <HelpDot text={t("sprite.define.coveredByHint")} />
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
      <label className="flex items-start gap-2 pt-2 text-xs">
        <Switch checked={!!damageAxis} onCheckedChange={setDamage} />
        <span>
          {t("sprite.define.damageOn")}
          <span className="block text-[10px] text-muted-foreground">{t("sprite.define.damageOnHint")}</span>
        </span>
      </label>
      {damageAxis ? <StagesTable /> : <p className="text-[11px] text-muted-foreground">{t("sprite.define.damageOff")}</p>}
      <AlertDialog open={confirmOff} onOpenChange={setConfirmOff}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("sprite.define.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("sprite.define.confirmAxis", { count: damageCells })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (damageAxis) updateSpec((s) => removeAxis(s, damageAxis.id)); }}>
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Section>
  );
}
