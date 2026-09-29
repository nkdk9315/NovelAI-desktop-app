import { useTranslation } from "react-i18next";
import MangaEffectIcon from "@/components/shared/MangaEffectIcon";
import { effectsForScope, isUnreliableEffect, type EffectScope, type MangaEffectId } from "@/lib/manga-effects";

/** Grid of manga effect toggles (icon + name); △ marks the ones that often don't appear. */
export default function EffectToggleGrid({ scope, enabled, onToggle }: {
  scope: EffectScope; enabled: readonly string[]; onToggle: (id: MangaEffectId) => void;
}) {
  const { t } = useTranslation();
  return (
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
            onClick={() => onToggle(id)}
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
  );
}
