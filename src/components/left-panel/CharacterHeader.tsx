import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { getGenreIcon } from "@/lib/genre-icons";
import type { Character } from "@/stores/generation-params-store";

interface CharacterHeaderProps {
  index: number;
  character: Character;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onRemove: () => void;
}

export default function CharacterHeader({
  index,
  character,
  collapsed,
  onToggleCollapse,
  onRemove,
}: CharacterHeaderProps) {
  const { t } = useTranslation();
  const Icon = getGenreIcon(character.genreIcon);

  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        className="flex items-center gap-1.5 text-xs font-medium"
        onClick={onToggleCollapse}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        )}
        <Icon className="h-3.5 w-3.5" style={{ color: character.genreColor }} />
        <span>
          {t("character.label", { number: index + 1, genre: character.genreName })}
        </span>
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive"
        aria-label={`${t("common.delete")} ${t("character.label", { number: index + 1, genre: character.genreName })}`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
