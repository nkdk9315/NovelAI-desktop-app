import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ChevronDown, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSpriteStore } from "@/stores/sprite-store";
import { newAxis, newLevel } from "@/lib/sprite/spec";
import { uniqueKey } from "@/lib/sprite/edit";
import { AXIS_PRESETS, axisFromPreset, type AxisPresetGroup } from "@/lib/sprite/axis-presets";
import { Section, updateSpec } from "./common";
import AxisCard from "./AxisCard";
import { HelpDot, Tip } from "../Hint";

const GROUPS: AxisPresetGroup[] = ["body", "face", "clothes", "underwear"];

/** Variant axes, in derivation order: a cell is made from the cell with its last changed axis one level lower. */
export default function AxesSection() {
  const { t } = useTranslation();
  const axes = useSpriteStore((s) => s.spec!.axes);

  const addPromptAxis = () => updateSpec((s) => {
    const n = s.axes.length + 1;
    const axis = newAxis(t("sprite.define.newAxis", { n }), uniqueKey(`axis${n}`, s.axes.map((a) => a.key)), "prompt", [
      newLevel(t("sprite.define.levelNone"), "0"),
      newLevel(t("sprite.define.newLevel", { n: 1 }), "1"),
    ]);
    return { ...s, axes: [...s.axes, axis] };
  });
  const addPreset = (id: string, group: AxisPresetGroup) => {
    const spec = useSpriteStore.getState().spec;
    if (!spec) return;
    const axis = axisFromPreset(spec, id);
    if (!axis) return;
    updateSpec((s) => ({ ...s, axes: [...s.axes, axis] }));
    // Without parts to attach to, the tags would apply to every cell (and draw the underwear)
    if ((group === "clothes" || group === "underwear") && axis.partIds.length === 0) {
      toast.warning(t(`sprite.axisPreset.noParts.${group}`));
    }
  };

  return (
    <Section
      title={t("sprite.define.axes")}
      hint={t("sprite.define.axesHint")}
      help={t("sprite.help.sections.axes")}
      actions={
        <div className="flex items-center gap-1">
          {/* A tooltip around a menu trigger swallows the click: the explanation sits beside it */}
          <HelpDot text={t("sprite.axisPreset.tip")} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
                <Sparkles className="h-3 w-3" />{t("sprite.axisPreset.add")}<ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {GROUPS.map((g, gi) => (
                <div key={g}>
                  {gi > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuLabel className="text-[10px] text-muted-foreground">{t(`sprite.axisPreset.group.${g}`)}</DropdownMenuLabel>
                  {AXIS_PRESETS.filter((p) => p.group === g).map((p) => (
                    <DropdownMenuItem key={p.id} className="text-xs" onSelect={() => addPreset(p.id, g)}>
                      {t(`sprite.axisPreset.items.${p.id}`)}
                    </DropdownMenuItem>
                  ))}
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Tip text={t("sprite.tips.addAxis")}>
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={addPromptAxis}>
              <Plus className="h-3 w-3" />{t("sprite.define.addAxis")}
            </Button>
          </Tip>
        </div>
      }
    >
      <div className="space-y-2">
        {axes.map((axis, i) => <AxisCard key={axis.id} axis={axis} index={i} count={axes.length} />)}
        {axes.length === 0 && <p className="text-xs text-muted-foreground">{t("sprite.define.noAxes")}</p>}
      </div>
    </Section>
  );
}
