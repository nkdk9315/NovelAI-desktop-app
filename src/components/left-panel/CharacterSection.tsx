import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import PromptTextarea from "@/components/shared/PromptTextarea";
import PositionEditor from "./PositionEditor";
import CharacterHeader from "./CharacterHeader";
import CharacterPromptGroups from "./CharacterPromptGroups";
import PromptGroupModal from "@/components/modals/PromptGroupModal";
import { assembleNegativeFromGroups } from "@/lib/prompt-assembly";
import { appendContributions, getPresetContributionsForCharacter } from "@/lib/preset-contributions";
import { useSidebarPresetGroupStore } from "@/stores/sidebar-preset-group-store";
import { usePresetStore } from "@/stores/preset-store";

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
  const clearNegativeOverride = useSidebarPromptStore((s) => s.clearNegativeOverride);
  const [collapsed, setCollapsed] = useState(false);
  const [showNegative, setShowNegative] = useState(false);
  const [showGroupBrowser, setShowGroupBrowser] = useState(false);

  const charTarget = character ? targets[character.id] : undefined;
  const charGroupsRaw = charTarget?.groups;
  const negativeOverride = charTarget?.negativeOverride ?? null;
  const presetInstances = useSidebarPresetGroupStore((s) => s.instances);
  const allPresets = usePresetStore((s) => s.presets);
  const assembledNegative = useMemo(() => {
    const base = assembleNegativeFromGroups(charGroupsRaw ?? []);
    if (!character) return base;
    const contrib = getPresetContributionsForCharacter(character.id, presetInstances, allPresets);
    return appendContributions(base, contrib.negative);
  }, [charGroupsRaw, character, presetInstances, allPresets]);

  // Migrate legacy character.negativePrompt → negativeOverride (once, when target becomes available)
  const charTargetReady = charTarget != null;
  useEffect(() => {
    if (charTarget && negativeOverride === null && character?.negativePrompt) {
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
            <div className="relative">
              <PromptTextarea
                value={negativeOverride ?? assembledNegative}
                onChange={(v) => setNegativeOverride(character.id, v)}
                placeholder={t("generation.negativePrompt")}
                rows={2}
              />
              {negativeOverride !== null && (
                <button
                  type="button"
                  title={t("prompt.clearOverride")}
                  onClick={() => clearNegativeOverride(character.id)}
                  className="absolute top-1 right-1 rounded p-0.5 text-primary hover:bg-accent"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          {/* Position */}
          <PositionEditor
            currentIndex={index}
            centerX={character.centerX}
            centerY={character.centerY}
            onChangeX={(v) => updateCharacter(index, { centerX: v })}
            onChangeY={(v) => updateCharacter(index, { centerY: v })}
          />
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
