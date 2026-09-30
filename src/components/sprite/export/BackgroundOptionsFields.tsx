import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";
import { useSpriteStore } from "@/stores/sprite-store";
import { updateSpec } from "../define/common";
import { HelpDot } from "../Hint";

/** The two tuning switches of the local background removal. */
export default function BackgroundOptionsFields() {
  const { t } = useTranslation();
  const ex = useSpriteStore((s) => s.spec!.export);
  const patch = (p: Partial<typeof ex>) => updateSpec((s) => ({ ...s, export: { ...s.export, ...p } }));
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
      <label className="flex items-center gap-2">
        <Switch checked={ex.fillHoles} onCheckedChange={(v) => patch({ fillHoles: v })} />
        {t("sprite.bg.fillHoles")}
        <HelpDot text={t("sprite.bg.fillHolesHint")} />
      </label>
      <label className="flex items-center gap-2">
        <Switch checked={ex.removeIslands} onCheckedChange={(v) => patch({ removeIslands: v })} />
        {t("sprite.bg.removeIslands")}
        <HelpDot text={t("sprite.bg.removeIslandsHint")} />
      </label>
    </div>
  );
}
