import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageSquareText, Plus, Sparkles, X, Zap } from "lucide-react";
import { useMangaStore } from "@/stores/manga-store";
import { newDialogueLine } from "@/lib/dialogue";
import { newSfxLine } from "@/lib/sound-effects";
import { castTargetId, patchById, withoutId, type MangaCast } from "@/lib/manga-page";
import type { Character } from "@/stores/generation-params-store";
import PromptTargetInput from "../PromptTargetInput";
import CastLookControls from "./CastLookControls";
import DialogueLineRow from "../DialogueLineRow";
import SfxRow from "../SfxRow";
import EffectToggleGrid from "../EffectToggleGrid";

const SMALL_BTN = "flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

/** One character's appearance in a panel: action, lines, sound effects and effects. */
export default function MangaCastCard({ panelId, cast, name, character }: {
  panelId: string; cast: MangaCast; name: string; character: Character | undefined;
}) {
  const missing = character == null;
  const { t } = useTranslation();
  const updateCast = useMangaStore((s) => s.updateCast);
  const removeCast = useMangaStore((s) => s.removeCast);
  const [showEffects, setShowEffects] = useState(cast.effects.length > 0);
  const update = (fn: (c: MangaCast) => MangaCast) => updateCast(panelId, cast.id, fn);

  return (
    <div className="space-y-1 rounded-md border border-border p-1.5">
      <div className="flex items-center gap-1">
        <span className={`truncate text-[10px] font-medium ${missing ? "text-destructive line-through" : "text-foreground"}`}>
          {missing ? t("manga.missingCharacter") : name}
        </span>
        <button
          type="button"
          aria-label={t("manga.removeCast")}
          title={t("manga.removeCast")}
          onClick={() => removeCast(panelId, cast.id)}
          className="ml-auto rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-destructive"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      {character && (
        <CastLookControls
          character={character}
          outfitId={cast.outfitId}
          excludeTags={cast.excludeTags ?? []}
          onOutfit={(outfitId) => update((c) => ({ ...c, outfitId }))}
          onExclude={(excludeTags) => update((c) => ({ ...c, excludeTags }))}
        />
      )}
      <PromptTargetInput targetId={castTargetId(cast.id)} placeholder={t("manga.actionPlaceholder")} initialText={cast.action} />
      {cast.dialogue.map((line) => (
        <DialogueLineRow
          key={line.id}
          line={line}
          onChange={(partial) => update((c) => ({ ...c, dialogue: patchById(c.dialogue, line.id, partial) }))}
          onRemove={() => update((c) => ({ ...c, dialogue: withoutId(c.dialogue, line.id) }))}
        />
      ))}
      {cast.sfx.map((line) => (
        <SfxRow
          key={line.id}
          line={line}
          onChange={(partial) => update((c) => ({ ...c, sfx: patchById(c.sfx, line.id, partial) }))}
          onRemove={() => update((c) => ({ ...c, sfx: withoutId(c.sfx, line.id) }))}
        />
      ))}
      {showEffects && (
        <EffectToggleGrid
          scope="character"
          enabled={cast.effects}
          onToggle={(id) => update((c) => ({
            ...c, effects: c.effects.includes(id) ? c.effects.filter((e) => e !== id) : [...c.effects, id],
          }))}
        />
      )}
      <div className="flex flex-wrap items-center gap-0.5">
        <button type="button" className={SMALL_BTN} onClick={() => update((c) => ({ ...c, dialogue: [...c.dialogue, newDialogueLine()] }))}>
          <Plus className="h-2.5 w-2.5" /><MessageSquareText className="h-2.5 w-2.5" />{t("manga.addLine")}
        </button>
        <button type="button" className={SMALL_BTN} onClick={() => update((c) => ({ ...c, sfx: [...c.sfx, newSfxLine()] }))}>
          <Plus className="h-2.5 w-2.5" /><Zap className="h-2.5 w-2.5" />{t("manga.addSfx")}
        </button>
        <button type="button" aria-pressed={showEffects} className={SMALL_BTN} onClick={() => setShowEffects(!showEffects)}>
          <Sparkles className="h-2.5 w-2.5" />{t("effects.label")}{cast.effects.length > 0 && ` (${cast.effects.length})`}
        </button>
      </div>
    </div>
  );
}
