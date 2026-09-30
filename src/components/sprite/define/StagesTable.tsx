import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PromptTargetInput from "@/components/left-panel/PromptTargetInput";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import { useSpriteStore } from "@/stores/sprite-store";
import { PART_STATES, newStage, spriteTargetId, type DamageStage, type PartState } from "@/lib/sprite/spec";
import { move, removeStage, uniqueKey } from "@/lib/sprite/edit";
import { outfitPromptAt } from "@/lib/sprite/prompt";
import { displayTextOf } from "@/lib/sprite/text";
import { CommitInput, KeyInput, dropTargets, updateSpec } from "./common";
import { Tip } from "../Hint";

/** Parts down, damage stages across: each part's state per stage, plus what the outfit prompt becomes. */
export default function StagesTable() {
  const { t } = useTranslation();
  const spec = useSpriteStore((s) => s.spec)!;
  const { parts, stages } = spec.outfit;
  // Re-render when a prompt box changes (the preview reads the prompt targets)
  useSidebarPromptStore((s) => s.targets);

  const patchStage = (id: string, fn: (s: DamageStage) => DamageStage) =>
    updateSpec((s) => ({ ...s, outfit: { ...s.outfit, stages: s.outfit.stages.map((x) => (x.id === id ? fn(x) : x)) } }));
  const add = () => updateSpec((s) => {
    const prev = s.outfit.stages[s.outfit.stages.length - 1];
    const n = s.outfit.stages.length;
    // A new stage starts from the previous one's states
    const stage = { ...newStage(t("sprite.define.newStage", { n }), uniqueKey(`d${n}`, s.outfit.stages.map((x) => x.key)), "torn clothes"), states: { ...(prev?.states ?? {}) } };
    return { ...s, outfit: { ...s.outfit, stages: [...s.outfit.stages, stage] } };
  });

  return (
    <div className="space-y-2 pt-2">
      <div className="flex items-center gap-2">
        <h4 className="text-xs font-semibold">{t("sprite.define.stages")}</h4>
        <div className="flex-1" />
        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={add}><Plus className="h-3 w-3" />{t("sprite.define.addStage")}</Button>
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">{t("sprite.define.stagesHint")}</p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="w-28 p-1 text-left font-medium text-muted-foreground">{t("sprite.define.part")}</th>
              {stages.map((st, i) => (
                <th key={st.id} className="min-w-[180px] p-1 align-top">
                  <div className="space-y-1 rounded-md border border-border p-1.5 text-left font-normal">
                    <div className="flex items-center gap-1">
                      <CommitInput value={st.label} className="w-20" aria-label={t("sprite.define.label")}
                        onCommit={(v) => patchStage(st.id, (x) => ({ ...x, label: v.trim() || x.label }))} />
                      <KeyInput value={st.key} fallback={`d${i}`} taken={stages.filter((x) => x.id !== st.id).map((x) => x.key)}
                        onCommit={(v) => patchStage(st.id, (x) => ({ ...x, key: v }))} />
                    </div>
                    {i > 0 ? (
                      <div className="flex items-center">
                        <Tip text={t("sprite.define.moveLeft")}>
                          <Button size="icon" variant="ghost" className="h-6 w-6" disabled={i <= 1} aria-label={t("sprite.define.moveLeft")}
                            onClick={() => updateSpec((s) => ({ ...s, outfit: { ...s.outfit, stages: move(s.outfit.stages, i, -1) } }))}>
                            <ArrowLeft className="h-3 w-3" />
                          </Button>
                        </Tip>
                        <Tip text={t("sprite.define.moveRight")}>
                          <Button size="icon" variant="ghost" className="h-6 w-6" disabled={i === stages.length - 1} aria-label={t("sprite.define.moveRight")}
                            onClick={() => updateSpec((s) => ({ ...s, outfit: { ...s.outfit, stages: move(s.outfit.stages, i, 1) } }))}>
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Tip>
                        <Tip text={t("common.delete")}>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" aria-label={t("common.delete")}
                            onClick={() => { dropTargets([st.id]); updateSpec((s) => removeStage(s, st.id)); }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </Tip>
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">{t("sprite.define.baseStage")}</p>
                    )}
                    {i > 0 && <PromptTargetInput targetId={spriteTargetId(st.id)} initialText={st.prompt} rows={1} placeholder={t("sprite.define.stagePlaceholder")} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {parts.map((part) => (
              <tr key={part.id} className="border-t border-border">
                <td className="p-1 font-medium">{part.name}</td>
                {stages.map((st, i) => {
                  const state: PartState = st.states[part.id] ?? "intact";
                  return (
                    <td key={st.id} className="space-y-1 p-1 align-top">
                      <Select value={state} disabled={i === 0}
                        onValueChange={(v) => patchStage(st.id, (x) => ({ ...x, states: { ...x.states, [part.id]: v as PartState } }))}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PART_STATES.map((ps) => <SelectItem key={ps} value={ps} className="text-xs">{t(`sprite.partState.${ps}`)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {i > 0 && state !== "intact" && (
                        <CommitInput value={st.overrides[part.id] ?? ""} placeholder={t(`sprite.define.overridePlaceholder.${state}`)}
                          aria-label={t("sprite.define.override")}
                          onCommit={(v) => patchStage(st.id, (x) => {
                            const overrides = { ...x.overrides };
                            if (v.trim()) overrides[part.id] = v.trim();
                            else delete overrides[part.id];
                            return { ...x, overrides };
                          })} />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-t border-border">
              <td className="p-1 align-top text-[10px] text-muted-foreground">{t("sprite.define.result")}</td>
              {stages.map((st) => (
                <td key={st.id} className="p-1 align-top font-mono text-[10px] leading-snug text-muted-foreground">
                  {outfitPromptAt(spec, st, displayTextOf).positive || "—"}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
