import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpriteStore } from "@/stores/sprite-store";
import { newRegion } from "@/lib/sprite/spec";
import { move, removeRegion, uniqueKey } from "@/lib/sprite/edit";
import { CommitInput, KeyInput, RowActions, Section, updateSpec } from "./common";

export default function RegionsSection() {
  const { t } = useTranslation();
  const regions = useSpriteStore((s) => s.spec!.regions);

  const add = () => updateSpec((s) => ({
    ...s,
    regions: [...s.regions, newRegion(t("sprite.define.newRegion", { n: s.regions.length + 1 }), uniqueKey(`region${s.regions.length + 1}`, s.regions.map((r) => r.key)), s.regions.length)],
  }));
  const patch = (id: string, p: Partial<(typeof regions)[number]>) =>
    updateSpec((s) => ({ ...s, regions: s.regions.map((r) => (r.id === id ? { ...r, ...p } : r)) }));

  return (
    <Section
      title={t("sprite.define.regions")}
      hint={t("sprite.define.regionsHint")}
      help={t("sprite.help.sections.regions")}
      actions={<Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={add}><Plus className="h-3 w-3" />{t("sprite.define.addRegion")}</Button>}
    >
      <div className="space-y-1">
        {regions.map((r, i) => (
          <div key={r.id} className="flex items-center gap-2">
            <input type="color" value={r.color} onChange={(e) => patch(r.id, { color: e.target.value })}
              className="h-7 w-8 cursor-pointer rounded border border-border bg-transparent" aria-label={t("sprite.define.color")} />
            <CommitInput value={r.label} className="w-32" aria-label={t("sprite.define.label")} onCommit={(v) => patch(r.id, { label: v.trim() || r.label })} />
            <KeyInput value={r.key} fallback={`region${i + 1}`} taken={regions.filter((x) => x.id !== r.id).map((x) => x.key)} onCommit={(v) => patch(r.id, { key: v })} />
            <div className="flex-1" />
            <RowActions index={i} count={regions.length}
              onMove={(d) => updateSpec((s) => ({ ...s, regions: move(s.regions, i, d) }))}
              onRemove={() => updateSpec((s) => removeRegion(s, r.id))} />
          </div>
        ))}
      </div>
    </Section>
  );
}
