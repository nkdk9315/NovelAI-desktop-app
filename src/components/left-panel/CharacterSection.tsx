import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import PromptTextarea from "@/components/shared/PromptTextarea";
import PositionSliders from "./PositionSliders";

interface CharacterSectionProps {
  index: number;
}

export default function CharacterSection({ index }: CharacterSectionProps) {
  const { t } = useTranslation();
  const character = useGenerationParamsStore((s) => s.characters[index]);
  const updateCharacter = useGenerationParamsStore((s) => s.updateCharacter);
  const removeCharacter = useGenerationParamsStore((s) => s.removeCharacter);
  const [showNegative, setShowNegative] = useState(false);

  if (!character) return null;

  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">
          {t("character.label", { number: index + 1, genre: character.genreName })}
        </span>
        <button
          type="button"
          onClick={() => removeCharacter(index)}
          className="text-muted-foreground hover:text-destructive"
          aria-label={`${t("common.delete")} ${t("character.label", { number: index + 1, genre: character.genreName })}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <PromptTextarea
        value={character.prompt}
        onChange={(v) => updateCharacter(index, { prompt: v })}
        placeholder={t("generation.prompt")}
        rows={3}
      />

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

      <PositionSliders
        centerX={character.centerX}
        centerY={character.centerY}
        onChangeX={(v) => updateCharacter(index, { centerX: v })}
        onChangeY={(v) => updateCharacter(index, { centerY: v })}
      />
    </div>
  );
}
