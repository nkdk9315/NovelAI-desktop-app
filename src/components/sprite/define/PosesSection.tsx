import { useTranslation } from "react-i18next";
import { Brush, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import PromptTargetInput from "@/components/left-panel/PromptTargetInput";
import { useSpriteStore } from "@/stores/sprite-store";
import { useSpriteMaskEditorStore } from "@/stores/sprite-mask-editor-store";
import { newPose, spriteTargetId } from "@/lib/sprite/spec";
import { move, removePose, uniqueKey } from "@/lib/sprite/edit";
import { CommitInput, KeyInput, RowActions, Section, dropTargets, updateSpec } from "./common";

export default function PosesSection() {
  const { t } = useTranslation();
  const spec = useSpriteStore((s) => s.spec)!;
  const poses = spec.poses;

  const add = () => updateSpec((s) => ({
    ...s,
    poses: [...s.poses, newPose(t("sprite.define.newPose", { n: s.poses.length + 1 }), uniqueKey(`pose${s.poses.length + 1}`, s.poses.map((p) => p.key)))],
  }));

  return (
    <Section
      title={t("sprite.define.poses")}
      hint={t("sprite.define.posesHint")}
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
                <Button size="sm" variant="outline" className="h-7 gap-1 text-xs"
                  onClick={() => useSpriteMaskEditorStore.getState().open({ kind: "regions", poseId: pose.id })}>
                  <Brush className="h-3 w-3" />{t("sprite.define.regionMasks", { done: masked, total: spec.regions.length })}
                </Button>
                <div className="flex-1" />
                <RowActions index={i} count={poses.length}
                  onMove={(d) => updateSpec((s) => ({ ...s, poses: move(s.poses, i, d) }))}
                  onRemove={() => { dropTargets([pose.id]); updateSpec((s) => removePose(s, pose.id)); }} />
              </div>
              <PromptTargetInput targetId={spriteTargetId(pose.id)} initialText={pose.prompt} placeholder={t("sprite.define.posePlaceholder")} />
            </div>
          );
        })}
      </div>
    </Section>
  );
}
