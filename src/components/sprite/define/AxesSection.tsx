import { useTranslation } from "react-i18next";
import { Plus, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpriteStore } from "@/stores/sprite-store";
import { newAxis, newLevel } from "@/lib/sprite/spec";
import { uniqueKey } from "@/lib/sprite/edit";
import { Section, updateSpec } from "./common";
import AxisCard from "./AxisCard";

/** Variant axes, in derivation order: a cell is made from the cell with its last changed axis one level lower. */
export default function AxesSection() {
  const { t } = useTranslation();
  const axes = useSpriteStore((s) => s.spec!.axes);
  const hasOutfit = axes.some((a) => a.kind === "outfit");

  const addPromptAxis = () => updateSpec((s) => {
    const n = s.axes.length + 1;
    const axis = newAxis(t("sprite.define.newAxis", { n }), uniqueKey(`axis${n}`, s.axes.map((a) => a.key)), "prompt", [
      newLevel(t("sprite.define.levelNone"), "0"),
      newLevel(t("sprite.define.newLevel", { n: 1 }), "1"),
    ]);
    return { ...s, axes: [...s.axes, axis] };
  });
  const addOutfitAxis = () => updateSpec((s) => {
    const axis = newAxis(t("sprite.define.outfitAxis"), uniqueKey("damage", s.axes.map((a) => a.key)), "outfit");
    return { ...s, axes: [axis, ...s.axes] };
  });

  return (
    <Section
      title={t("sprite.define.axes")}
      hint={t("sprite.define.axesHint")}
      actions={
        <div className="flex gap-1">
          {!hasOutfit && (
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={addOutfitAxis}>
              <Shirt className="h-3 w-3" />{t("sprite.define.addOutfitAxis")}
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={addPromptAxis}>
            <Plus className="h-3 w-3" />{t("sprite.define.addAxis")}
          </Button>
        </div>
      }
    >
      <div className="space-y-2">
        {axes.map((axis, i) => <AxisCard key={axis.id} axis={axis} index={i} count={axes.length} />)}
      </div>
    </Section>
  );
}
