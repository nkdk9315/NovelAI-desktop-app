import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, Plus, Zap } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import { SFX_PRESETS } from "@/lib/sound-effects";
import SfxRow from "./SfxRow";

interface SfxEditorProps {
  targetId: string;
  /** The main prompt also offers automatic sound effects */
  isMain?: boolean;
}

/** Written sound effects (ブンッ, チョロロロ…) of one prompt target. */
export default function SfxEditor({ targetId, isMain = false }: SfxEditorProps) {
  const { t } = useTranslation();
  const lines = useSidebarPromptStore((s) => s.targets[targetId]?.sfx) ?? [];
  const hasTarget = useSidebarPromptStore((s) => s.targets[targetId] != null);
  const addSfx = useSidebarPromptStore((s) => s.addSfx);
  const updateSfx = useSidebarPromptStore((s) => s.updateSfx);
  const removeSfx = useSidebarPromptStore((s) => s.removeSfx);
  const autoSfx = useGenerationParamsStore((s) => s.autoSfx);
  const setParam = useGenerationParamsStore((s) => s.setParam);
  const [presetsOpen, setPresetsOpen] = useState(false);

  if (!hasTarget) return null;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <Zap className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] font-medium text-foreground" title={t("sfx.hint")}>{t("sfx.label")}</span>
        <Popover open={presetsOpen} onOpenChange={setPresetsOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="ml-auto flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <BookOpen className="h-2.5 w-2.5" />
              {t("sfx.presets")}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 space-y-2 p-2">
            {SFX_PRESETS.map((group) => (
              <div key={group.category} className="space-y-1">
                <p className="text-[9px] font-medium text-muted-foreground">{t(`sfx.category.${group.category}`)}</p>
                <div className="flex flex-wrap gap-1">
                  {group.items.map((item) => (
                    <button
                      key={item.text}
                      type="button"
                      title={t(`sfx.texture.${item.texture}`)}
                      onClick={() => { addSfx(targetId, item); setPresetsOpen(false); }}
                      className="rounded-md border border-border px-1.5 py-0.5 text-xs transition-colors hover:bg-accent"
                    >
                      {item.text}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </PopoverContent>
        </Popover>
        <button
          type="button"
          onClick={() => addSfx(targetId)}
          className="flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Plus className="h-2.5 w-2.5" />
          {t("sfx.add")}
        </button>
      </div>

      {lines.map((line) => (
        <SfxRow
          key={line.id}
          line={line}
          onChange={(partial) => updateSfx(targetId, line.id, partial)}
          onRemove={() => removeSfx(targetId, line.id)}
        />
      ))}

      {isMain && (
        <label className="flex items-center gap-1 text-[9px] text-muted-foreground" title={t("sfx.autoHint")}>
          <Checkbox
            aria-label={t("sfx.auto")}
            className="size-3 [&_svg]:size-2.5"
            checked={autoSfx}
            onCheckedChange={(v) => setParam("autoSfx", v === true)}
          />
          {t("sfx.auto")}
        </label>
      )}
    </div>
  );
}
