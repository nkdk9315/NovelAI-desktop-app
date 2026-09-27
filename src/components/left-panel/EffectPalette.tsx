import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import MangaEffectIcon from "@/components/shared/MangaEffectIcon";
import { effectsForScope, isUnreliableEffect, type EffectScope } from "@/lib/manga-effects";

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
      <div className="flex flex-wrap gap-1">
        {effectsForScope(scope).map((id) => {
          const on = enabled.includes(id);
          const unreliable = isUnreliableEffect(id);
          const label = t(`effects.item.${id}`);
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              title={unreliable ? `${label} — ${t("effects.unreliable")}` : label}
              onClick={() => toggle(targetId, id)}
              className={`relative flex w-12 flex-col items-center gap-0.5 rounded-md border px-0.5 pt-1 pb-0.5 transition-colors ${
                on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <MangaEffectIcon effect={id} className="h-5 w-7" />
              <span className="w-full truncate text-center text-[8.5px] leading-tight">{label}</span>
              {unreliable && <span className="absolute top-0 right-0.5 text-[8px] opacity-70">△</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
