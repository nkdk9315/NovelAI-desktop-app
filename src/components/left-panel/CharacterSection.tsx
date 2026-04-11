import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import PromptTextarea from "@/components/shared/PromptTextarea";
import PositionEditor from "./PositionEditor";
import CharacterHeader from "./CharacterHeader";
import CharacterPromptGroups from "./CharacterPromptGroups";
import PromptGroupModal from "@/components/modals/PromptGroupModal";

interface CharacterSectionProps {
  index: number;
}

export default function CharacterSection({ index }: CharacterSectionProps) {
  const { t } = useTranslation();
  const character = useGenerationParamsStore((s) => s.characters[index]);
  const updateCharacter = useGenerationParamsStore((s) => s.updateCharacter);
  const removeCharacter = useGenerationParamsStore((s) => s.removeCharacter);
  const removeTarget = useSidebarPromptStore((s) => s.removeTarget);
  const [collapsed, setCollapsed] = useState(false);
  const [showNegative, setShowNegative] = useState(false);
  const [showGroupBrowser, setShowGroupBrowser] = useState(false);

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
            <PromptTextarea
              value={character.negativePrompt}
              onChange={(v) => updateCharacter(index, { negativePrompt: v })}
              placeholder={t("generation.negativePrompt")}
              rows={2}
            />
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
