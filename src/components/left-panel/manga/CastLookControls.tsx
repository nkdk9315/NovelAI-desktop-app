import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import { positiveTextOf } from "@/stores/sidebar-prompt-text-sync";
import type { Character } from "@/stores/generation-params-store";
import { plainTags, type OutfitChoice } from "@/lib/outfits";

const chip = (on: boolean) =>
  `rounded-md border px-1.5 py-0.5 text-[10px] transition-colors ${
    on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
  }`;

/** Outfit for this panel and base-look tags switched off here. */
export default function CastLookControls({ character, outfitId, excludeTags, onOutfit, onExclude }: {
  character: Character;
  outfitId: OutfitChoice | undefined;
  excludeTags: string[];
  onOutfit: (choice: OutfitChoice) => void;
  onExclude: (tags: string[]) => void;
}) {
  const { t } = useTranslation();
  const baseText = useSidebarPromptStore((s) => {
    const target = s.targets[character.id];
    return target ? positiveTextOf(target) : character.prompt;
  });
  const [showBase, setShowBase] = useState(excludeTags.length > 0);
  const outfits = character.outfits ?? [];
  const choice = outfitId ?? "default";
  const current = outfits.find((o) => o.id === character.outfitId);
  const tags = plainTags(baseText);

  return (
    <div className="space-y-1">
      {outfits.length > 0 && (
        <div className="flex flex-wrap items-center gap-1" role="radiogroup" aria-label={t("outfit.label")}>
          <span className="text-[9px] text-muted-foreground">{t("outfit.label")}</span>
          <button type="button" role="radio" aria-checked={choice === "default"} className={chip(choice === "default")} onClick={() => onOutfit("default")}>
            {t("outfit.default")}{current ? `（${current.name}）` : ""}
          </button>
          {outfits.map((o) => (
            <button key={o.id} type="button" role="radio" aria-checked={choice === o.id} className={chip(choice === o.id)} onClick={() => onOutfit(o.id)}>
              {o.name}
            </button>
          ))}
          <button type="button" role="radio" aria-checked={choice === "none"} className={chip(choice === "none")} onClick={() => onOutfit("none")}>
            {t("outfit.none")}
          </button>
        </div>
      )}
      {tags.length > 0 && (
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setShowBase(!showBase)}
            className="flex items-center gap-0.5 text-[9px] text-muted-foreground hover:text-foreground"
            title={t("outfit.excludeHint")}
          >
            {showBase ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
            {t("outfit.exclude")}{excludeTags.length > 0 && `（${excludeTags.length}）`}
          </button>
          {showBase && (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => {
                const off = excludeTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={!off}
                    onClick={() => onExclude(off ? excludeTags.filter((x) => x !== tag) : [...excludeTags, tag])}
                    className={`rounded-md border px-1.5 py-0.5 text-[10px] transition-colors ${
                      off ? "border-border text-muted-foreground line-through opacity-60" : "border-border text-foreground hover:bg-accent"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
