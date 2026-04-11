import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { GenreDto } from "@/types";

interface GenreTabsProps {
  genres: GenreDto[];
  selectedGenreId: string | undefined;
  onSelectGenre: (id: string | undefined) => void;
}

export default function GenreTabs({
  genres,
  selectedGenreId,
  onSelectGenre,
}: GenreTabsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium">{t("promptGroup.genre")}:</label>
      <div className="flex flex-wrap gap-1">
        <Button
          variant={selectedGenreId === undefined ? "secondary" : "ghost"}
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => onSelectGenre(undefined)}
        >
          {t("promptGroup.all")}
        </Button>
        {genres.map((genre) => (
          <Button
            key={genre.id}
            variant={selectedGenreId === genre.id ? "secondary" : "ghost"}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => onSelectGenre(genre.id)}
          >
            {genre.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
