import { useTranslation } from "react-i18next";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { MAX_CHARACTERS } from "@/lib/constants";

const SYSTEM_GENRES = ["Male", "Female", "Other"] as const;

export default function CharacterAddButtons() {
  const { t } = useTranslation();
  const characters = useGenerationParamsStore((s) => s.characters);
  const addCharacter = useGenerationParamsStore((s) => s.addCharacter);
  const isMaxed = characters.length >= MAX_CHARACTERS;

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
            onClick={() => addCharacter(genre)}
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
