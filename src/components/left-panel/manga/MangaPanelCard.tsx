import { useTranslation } from "react-i18next";
import { MessageSquareText, Plus, UserPlus, Zap } from "lucide-react";
import { useMangaStore } from "@/stores/manga-store";
import type { Character } from "@/stores/generation-params-store";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { newDialogueLine } from "@/lib/dialogue";
import { newSfxLine } from "@/lib/sound-effects";
import { patchById, withoutId, type MangaPanel } from "@/lib/manga-page";
import type { MangaLayoutId } from "@/lib/manga-layouts";
import DialogueLineRow from "../DialogueLineRow";
import SfxRow from "../SfxRow";
import MangaLayoutThumb from "./MangaLayoutThumb";
import MangaCastCard from "./MangaCastCard";

const SMALL_BTN = "flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

/** One panel: scene, the characters in it, and text nobody says (narration, signs, sound effects). */
export default function MangaPanelCard({ panel, index, layoutId, characters }: {
  panel: MangaPanel; index: number; layoutId: MangaLayoutId; characters: Character[];
}) {
  const { t } = useTranslation();
  const updatePanel = useMangaStore((s) => s.updatePanel);
  const addCast = useMangaStore((s) => s.addCast);
  const update = (fn: (p: MangaPanel) => MangaPanel) => updatePanel(panel.id, fn);
  const nameOf = (id: string) => {
    const i = characters.findIndex((c) => c.id === id);
    return i < 0 ? null : t("character.label", { number: i + 1, genre: characters[i].genreName });
  };

  return (
    <div className="space-y-1.5 rounded-md border border-border p-2">
      <div className="flex items-center gap-2">
        <MangaLayoutThumb layoutId={layoutId} highlight={index} className="h-9 w-7 shrink-0 text-primary" />
        <span className="text-xs font-medium">{t("manga.panelN", { n: index + 1 })}</span>
      </div>
      <textarea
        value={panel.scene}
        onChange={(e) => update((p) => ({ ...p, scene: e.target.value }))}
        placeholder={t("manga.scenePlaceholder")}
        aria-label={t("manga.scene")}
        rows={2}
        className="block w-full resize-y rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring"
      />

      {panel.cast.map((c) => (
        <MangaCastCard key={c.id} panelId={panel.id} cast={c} name={nameOf(c.characterId) ?? ""} missing={nameOf(c.characterId) == null} />
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={SMALL_BTN} disabled={characters.length === 0} title={characters.length === 0 ? t("manga.noCharacters") : undefined}>
              <UserPlus className="h-2.5 w-2.5" />{t("manga.addCast")}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {characters.map((c, i) => (
              <DropdownMenuItem key={c.id} className="text-xs" onSelect={() => addCast(panel.id, c.id)}>
                {t("character.label", { number: i + 1, genre: c.genreName })}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <button type="button" className={SMALL_BTN} onClick={() => update((p) => ({ ...p, text: [...p.text, newDialogueLine("narration")] }))}>
          <Plus className="h-2.5 w-2.5" /><MessageSquareText className="h-2.5 w-2.5" />{t("manga.addText")}
        </button>
        <button type="button" className={SMALL_BTN} onClick={() => update((p) => ({ ...p, sfx: [...p.sfx, newSfxLine()] }))}>
          <Plus className="h-2.5 w-2.5" /><Zap className="h-2.5 w-2.5" />{t("manga.addSfx")}
        </button>
      </div>
    </div>
  );
}
