import { useTranslation } from "react-i18next";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { MAX_CHARACTERS } from "@/lib/constants";
import * as ipc from "@/lib/ipc";

const GENRE_MAP: Record<string, string> = {
  Male: "genre-male",
  Female: "genre-female",
  Other: "genre-other",
};

const SYSTEM_GENRES = ["Male", "Female", "Other"] as const;

export default function CharacterAddButtons() {
  const { t } = useTranslation();
  const characters = useGenerationParamsStore((s) => s.characters);
  const addCharacter = useGenerationParamsStore((s) => s.addCharacter);
  const updateCharacter = useGenerationParamsStore((s) => s.updateCharacter);
  const isMaxed = characters.length >= MAX_CHARACTERS;

  const handleAdd = async (genre: string) => {
    const idx = characters.length;
    addCharacter(genre);

    // Try to apply default prompt group tags for this genre
    const genreId = GENRE_MAP[genre];
    if (!genreId) return;

    try {
      const groups = await ipc.listPromptGroups(genreId);
      const defaultGroup = groups.find((g) => g.isDefaultForGenre);
      if (defaultGroup && defaultGroup.tags.length > 0) {
        const tagStr = defaultGroup.tags.map((t) => t.tag).join(", ");
        updateCharacter(idx, { prompt: tagStr });
      }
    } catch {
      // Non-critical — character is added regardless
    }
  };

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-foreground">
        {t("character.add")}
      </label>
      <div className="flex items-center gap-2">
        {SYSTEM_GENRES.map((genre) => (
          <Button
            key={genre}
            variant="outline"
            size="sm"
            disabled={isMaxed}
            onClick={() => handleAdd(genre)}
            title={isMaxed ? t("character.maxReached") : undefined}
          >
            <UserPlus className="mr-1 h-3 w-3" />
            {t(`character.${genre.toLowerCase()}`)}
          </Button>
        ))}
      </div>
    </div>
  );
}
