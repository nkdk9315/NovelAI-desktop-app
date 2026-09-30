import { useTranslation } from "react-i18next";
import { Brush, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import PromptTargetInput from "@/components/left-panel/PromptTargetInput";
import { useSpriteStore } from "@/stores/sprite-store";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { useSpriteMaskEditorStore } from "@/stores/sprite-mask-editor-store";
import { newPose, spriteTargetId } from "@/lib/sprite/spec";
import { move, removePose, uniqueKey } from "@/lib/sprite/edit";
import { parseCellKey } from "@/lib/sprite/cells";
import { CommitInput, KeyInput, RowActions, Section, chip, dropTargets, updateSpec } from "./common";
import { HelpDot, Tip } from "../Hint";

export default function PosesSection() {
  const { t } = useTranslation();
  const spec = useSpriteStore((s) => s.spec)!;
  const poses = spec.poses;
  const cells = useSpriteStore((s) => s.cells);
  const characters = useGenerationParamsStore((s) => s.characters);
  const cellsOfPose = (poseId: string) =>
    Object.values(cells).filter((c) => c.candidates.length > 0 && parseCellKey(c.cellKey).poseId === poseId).length;

  const add = () => updateSpec((s) => ({
    ...s,
    poses: [...s.poses, newPose(t("sprite.define.newPose", { n: s.poses.length + 1 }), uniqueKey(`pose${s.poses.length + 1}`, s.poses.map((p) => p.key)))],
  }));

  return (
    <Section
      title={t("sprite.define.poses")}
      hint={t("sprite.define.posesHint")}
      help={t("sprite.help.sections.poses")}
      actions={<Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={add}><Plus className="h-3 w-3" />{t("sprite.define.addPose")}</Button>}
    >
      <div className="space-y-2">
        {poses.map((pose, i) => {
          const masked = spec.regions.filter((r) => spec.masks[pose.id]?.[r.id]).length;
          return (
            <div key={pose.id} className="space-y-1.5 rounded-md border border-border p-2">
              <div className="flex items-center gap-2">
                <CommitInput value={pose.label} className="w-32" aria-label={t("sprite.define.label")}
                  onCommit={(v) => updateSpec((s) => ({ ...s, poses: s.poses.map((p) => (p.id === pose.id ? { ...p, label: v.trim() || p.label } : p)) }))} />
                <KeyInput value={pose.key} fallback={`pose${i + 1}`} taken={poses.filter((p) => p.id !== pose.id).map((p) => p.key)}
                  onCommit={(v) => updateSpec((s) => ({ ...s, poses: s.poses.map((p) => (p.id === pose.id ? { ...p, key: v } : p)) }))} />
                <Tip text={t("sprite.tips.regionMasks")}>
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-xs"
                    onClick={() => useSpriteMaskEditorStore.getState().open({ kind: "regions", poseId: pose.id })}>
                    <Brush className="h-3 w-3" />{t("sprite.define.regionMasks", { done: masked, total: spec.regions.length })}
                  </Button>
                </Tip>
                <div className="flex-1" />
                <RowActions index={i} count={poses.length}
                  confirm={cellsOfPose(pose.id) > 0 || masked > 0 ? t("sprite.define.confirmPose", { count: cellsOfPose(pose.id) }) : undefined}
                  onMove={(d) => updateSpec((s) => ({ ...s, poses: move(s.poses, i, d) }))}
                  onRemove={() => { dropTargets([pose.id]); updateSpec((s) => removePose(s, pose.id)); }} />
              </div>
              {spec.axes.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">{t("sprite.define.poseAxes")}</span>
                  <HelpDot text={t("sprite.define.poseAxesHint")} />
                  {spec.axes.map((a) => {
                    const on = !pose.skipAxes.includes(a.id);
                    return (
                      <button key={a.id} type="button" aria-pressed={on} className={chip(on)}
                        onClick={() => updateSpec((s) => ({
                          ...s,
                          poses: s.poses.map((p) => (p.id === pose.id
                            ? { ...p, skipAxes: on ? [...p.skipAxes, a.id] : p.skipAxes.filter((x) => x !== a.id) }
                            : p)),
                        }))}>
                        {a.label}
                      </button>
                    );
                  })}
                </div>
              )}
              {characters.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">{t("sprite.define.poseCast")}</span>
                  <HelpDot text={t("sprite.define.poseCastHint")} />
                  {characters.map((c, ci) => {
                    const on = pose.characterIds == null || pose.characterIds.includes(c.id);
                    return (
                      <button key={c.id} type="button" aria-pressed={on} className={chip(on)}
                        onClick={() => updateSpec((s) => ({
                          ...s,
                          poses: s.poses.map((p) => {
                            if (p.id !== pose.id) return p;
                            const current = p.characterIds ?? characters.map((x) => x.id);
                            return { ...p, characterIds: on ? current.filter((x) => x !== c.id) : [...current, c.id] };
                          }),
                        }))}>
                        {t("character.label", { number: ci + 1, genre: c.genreName })}
                      </button>
                    );
                  })}
                </div>
              )}
              <PromptTargetInput targetId={spriteTargetId(pose.id)} initialText={pose.prompt} placeholder={t("sprite.define.posePlaceholder")} />
            </div>
          );
        })}
      </div>
    </Section>
  );
}
