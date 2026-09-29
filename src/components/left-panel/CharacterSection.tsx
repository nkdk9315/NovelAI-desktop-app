import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import PromptTextarea from "@/components/shared/PromptTextarea";
import PositionEditor from "./PositionEditor";
import CharacterHeader from "./CharacterHeader";
import CharacterPromptGroups from "./CharacterPromptGroups";
import DialogueEditor from "./DialogueEditor";
import SfxEditor from "./SfxEditor";
import EffectPalette from "./EffectPalette";
import { useMangaStore } from "@/stores/manga-store";
import PromptGroupModal from "@/components/modals/PromptGroupModal";
import { assembleNegativeFromGroups } from "@/lib/prompt-assembly";

interface CharacterSectionProps {
  index: number;
}

export default function CharacterSection({ index }: CharacterSectionProps) {
  const { t } = useTranslation();
  const character = useGenerationParamsStore((s) => s.characters[index]);
  const updateCharacter = useGenerationParamsStore((s) => s.updateCharacter);
  const removeCharacter = useGenerationParamsStore((s) => s.removeCharacter);
  const removeTarget = useSidebarPromptStore((s) => s.removeTarget);
  const targets = useSidebarPromptStore((s) => s.targets);
  const setNegativeOverride = useSidebarPromptStore((s) => s.setNegativeOverride);
  const [collapsed, setCollapsed] = useState(false);
  const mangaOn = useMangaStore((s) => s.page.enabled);
  const [showNegative, setShowNegative] = useState(false);
  const [showGroupBrowser, setShowGroupBrowser] = useState(false);

  const charTarget = character ? targets[character.id] : undefined;
  const charGroupsRaw = charTarget?.groups;
  const negativeOverride = charTarget?.negativeOverride ?? null;
  const assembledNegative = useMemo(
    () => assembleNegativeFromGroups(charGroupsRaw ?? []),
    [charGroupsRaw],
  );

  // Migrate legacy character.negativePrompt → negativeOverride (once, when target becomes available)
  const charTargetReady = charTarget != null;
  useEffect(() => {
    if (charTarget && !negativeOverride && character?.negativePrompt) {
      setNegativeOverride(character.id, character.negativePrompt);
      updateCharacter(index, { negativePrompt: "" });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charTargetReady]);

  if (!character) return null;

  const handleRemove = () => {
    removeTarget(character.id);
    removeCharacter(index);
  };

  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <CharacterHeader
        index={index}
        character={character}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        onRemove={handleRemove}
      />

      {!collapsed && (
        <>
          {/* Prompt groups + free text */}
          <CharacterPromptGroups
            targetId={character.id}
            onOpenGroupBrowser={() => setShowGroupBrowser(true)}
          />

          {/* Manga mode: the card only defines the look; lines and positions live in the panels */}
          {mangaOn ? (
            <p className="text-[9px] leading-snug text-muted-foreground">{t("manga.characterHint")}</p>
          ) : (
            <>
              <DialogueEditor targetId={character.id} />
              <SfxEditor targetId={character.id} />
              <EffectPalette targetId={character.id} scope="character" />
            </>
          )}

          {/* Negative prompt */}
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setShowNegative(!showNegative)}
          >
            {showNegative ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            {t("generation.negativePrompt")}
          </button>

          {showNegative && (
            <PromptTextarea
              value={negativeOverride ?? assembledNegative}
              onChange={(v) => setNegativeOverride(character.id, v)}
              placeholder={t("generation.negativePrompt")}
              rows={3}
              expandOnFocus
            />
          )}

          {/* Position */}
          {!mangaOn && (
            <PositionEditor
              currentIndex={index}
              centerX={character.centerX}
              centerY={character.centerY}
              onChangeX={(v) => updateCharacter(index, { centerX: v })}
              onChangeY={(v) => updateCharacter(index, { centerY: v })}
            />
          )}
        </>
      )}

      {showGroupBrowser && (
        <PromptGroupModal
          open={showGroupBrowser}
          onOpenChange={setShowGroupBrowser}
          targetId={character.id}
        />
      )}
    </div>
  );
}
