import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import { usePromptStore } from "@/stores/prompt-store";
import { MAX_CHARACTERS } from "@/lib/constants";
import { getGenreIcon } from "@/lib/genre-icons";
import * as ipc from "@/lib/ipc";
import GenreEditorPopover from "./GenreEditorPopover";
import type { GenreDto } from "@/types";

export default function CharacterAddButtons() {
  const { t } = useTranslation();
  const characters = useGenerationParamsStore((s) => s.characters);
  const addCharacter = useGenerationParamsStore((s) => s.addCharacter);
  const genres = usePromptStore((s) => s.genres);
  const loadGenres = usePromptStore((s) => s.loadGenres);
  const createGenre = usePromptStore((s) => s.createGenre);
  const initTarget = useSidebarPromptStore((s) => s.initTarget);
  const isMaxed = characters.length >= MAX_CHARACTERS;

  useEffect(() => {
    loadGenres();
  }, [loadGenres]);

  const systemGenres = genres.filter(
    (g) => g.id === "genre-male" || g.id === "genre-female",
  );
  const otherGenre = genres.find((g) => g.id === "genre-other");
  const customGenres = genres.filter(
    (g) => !g.isSystem,
  );

  const handleAdd = async (genre: GenreDto) => {
    addCharacter({ name: genre.name, id: genre.id, icon: genre.icon, color: genre.color });

    // Get the character that was just added (it'll be the last one)
    const newChars = useGenerationParamsStore.getState().characters;
    const addedChar = newChars[newChars.length - 1];
    if (!addedChar) return;

    // Load default groups for this genre and init sidebar state
    try {
      const groups = await ipc.listPromptGroups(genre.id);
      const defaults = groups.filter((g) => g.isDefault);
      initTarget(addedChar.id, defaults.length > 0 ? defaults : undefined);
    } catch {
      initTarget(addedChar.id);
    }
  };

  const handleCreateGenre = async (name: string, icon: string, color: string) => {
    try {
      await createGenre({ name, icon, color });
    } catch {
      // toast handled by caller if needed
    }
  };

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-foreground">
        {t("character.add")}
      </label>
      <div className="flex items-center gap-2">
        {/* Male / Female direct buttons */}
        {systemGenres.map((genre) => {
          const Icon = getGenreIcon(genre.icon);
          return (
            <Button
              key={genre.id}
              variant="outline"
              size="sm"
              disabled={isMaxed}
              onClick={() => handleAdd(genre)}
              title={isMaxed ? t("character.maxReached") : undefined}
            >
              <Icon className="mr-1 h-3 w-3" style={{ color: genre.color }} />
              {genre.name}
            </Button>
          );
        })}

        {/* Other dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isMaxed}
              title={isMaxed ? t("character.maxReached") : undefined}
            >
              {t("character.other")}
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {otherGenre && (
              <DropdownMenuItem onClick={() => handleAdd(otherGenre)}>
                {otherGenre.name}
              </DropdownMenuItem>
            )}
            {customGenres.map((genre) => {
              const Icon = getGenreIcon(genre.icon);
              return (
                <DropdownMenuItem key={genre.id} onClick={() => handleAdd(genre)}>
                  <Icon className="mr-2 h-3 w-3" style={{ color: genre.color }} />
                  {genre.name}
                </DropdownMenuItem>
              );
            })}
            {customGenres.length === 0 && !otherGenre && (
              <DropdownMenuItem disabled>
                {t("promptGroup.noGroups")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Genre create button */}
        <GenreEditorPopover onSave={handleCreateGenre} />
      </div>
    </div>
  );
}
