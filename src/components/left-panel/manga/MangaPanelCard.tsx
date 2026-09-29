import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageSquareText, Plus, UserPlus, Zap } from "lucide-react";
import { useMangaStore } from "@/stores/manga-store";
import type { Character } from "@/stores/generation-params-store";
import { newDialogueLine } from "@/lib/dialogue";
import { newSfxLine } from "@/lib/sound-effects";
import { patchById, sceneTargetId, withoutId, type MangaPanel } from "@/lib/manga-page";
import type { Shape } from "@/lib/manga-geometry";
import PromptTargetInput from "../PromptTargetInput";
import DialogueLineRow from "../DialogueLineRow";
import SfxRow from "../SfxRow";
import MangaLayoutThumb from "./MangaLayoutThumb";
import MangaCastCard from "./MangaCastCard";

const SMALL_BTN = "flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40";

/** One panel: scene, the characters in it, and text nobody says (narration, signs, sound effects). */
export default function MangaPanelCard({ panel, index, shapes, size, characters }: {
  panel: MangaPanel; index: number; shapes: Shape[]; size: { width: number; height: number }; characters: Character[];
}) {
  const { t } = useTranslation();
  const updatePanel = useMangaStore((s) => s.updatePanel);
  const addCast = useMangaStore((s) => s.addCast);
  const update = (fn: (p: MangaPanel) => MangaPanel) => updatePanel(panel.id, fn);
  // Inline list rather than a floating menu: a popup near the window's bottom edge got squashed to nothing
  const [picking, setPicking] = useState(false);
  const nameOf = (id: string) => {
    const i = characters.findIndex((c) => c.id === id);
    return i < 0 ? null : t("character.label", { number: i + 1, genre: characters[i].genreName });
  };

  return (
    <div className="space-y-1.5 rounded-md border border-border p-2">
      <div className="flex items-center gap-2">
        <MangaLayoutThumb shapes={shapes} width={size.width} height={size.height} highlight={index} className="h-9 w-9 shrink-0 text-primary" />
        <span className="text-xs font-medium">{t("manga.panelN", { n: index + 1 })}</span>
      </div>
      <PromptTargetInput targetId={sceneTargetId(panel.id)} placeholder={t("manga.scenePlaceholder")} initialText={panel.scene} />

      {panel.cast.map((c) => (
        <MangaCastCard
          key={c.id} panelId={panel.id} cast={c} name={nameOf(c.characterId) ?? ""}
          character={characters.find((ch) => ch.id === c.characterId)}
        />
      ))}

      {panel.text.map((line) => (
        <DialogueLineRow
          key={line.id}
          line={line}
          onChange={(partial) => update((p) => ({ ...p, text: patchById(p.text, line.id, partial) }))}
          onRemove={() => update((p) => ({ ...p, text: withoutId(p.text, line.id) }))}
        />
      ))}
      {panel.sfx.map((line) => (
        <SfxRow
          key={line.id}
          line={line}
          onChange={(partial) => update((p) => ({ ...p, sfx: patchById(p.sfx, line.id, partial) }))}
          onRemove={() => update((p) => ({ ...p, sfx: withoutId(p.sfx, line.id) }))}
        />
      ))}

      <div className="flex flex-wrap items-center gap-0.5">
        <button
          type="button"
          className={`${SMALL_BTN} ${picking ? "bg-primary/10 text-primary" : ""}`}
          aria-expanded={picking}
          disabled={characters.length === 0}
          title={characters.length === 0 ? t("manga.noCharacters") : undefined}
          onClick={() => setPicking(!picking)}
        >
          <UserPlus className="h-2.5 w-2.5" />{t("manga.addCast")}
        </button>
        <button type="button" className={SMALL_BTN} onClick={() => update((p) => ({ ...p, text: [...p.text, newDialogueLine("narration")] }))}>
          <Plus className="h-2.5 w-2.5" /><MessageSquareText className="h-2.5 w-2.5" />{t("manga.addText")}
        </button>
        <button type="button" className={SMALL_BTN} onClick={() => update((p) => ({ ...p, sfx: [...p.sfx, newSfxLine()] }))}>
          <Plus className="h-2.5 w-2.5" /><Zap className="h-2.5 w-2.5" />{t("manga.addSfx")}
        </button>
      </div>
      {picking && (
        <div className="flex flex-wrap gap-1 rounded-md bg-muted/40 p-1.5" role="group" aria-label={t("manga.addCast")}>
          {characters.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => { addCast(panel.id, c.id); setPicking(false); }}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs transition-colors hover:bg-accent"
            >
              {t("character.label", { number: i + 1, genre: c.genreName })}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
