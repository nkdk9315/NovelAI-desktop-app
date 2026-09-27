import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import type { EffectScope } from "@/lib/manga-effects";
import EffectToggleGrid from "./EffectToggleGrid";

const EMPTY: string[] = [];

/** Toggle manga effects (sweat drops, anger veins, emphasis lines…) on one prompt target. */
export default function EffectPalette({ targetId, scope }: { targetId: string; scope: EffectScope }) {
  const { t } = useTranslation();
  const enabled = useSidebarPromptStore((s) => s.targets[targetId]?.effects) ?? EMPTY;
  const hasTarget = useSidebarPromptStore((s) => s.targets[targetId] != null);
  const toggle = useSidebarPromptStore((s) => s.toggleEffect);

  if (!hasTarget) return null;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] font-medium text-foreground" title={t(`effects.hint.${scope}`)}>
          {t("effects.label")}
        </span>
      </div>
      <EffectToggleGrid scope={scope} enabled={enabled} onToggle={(id) => toggle(targetId, id)} />
    </div>
  );
}
