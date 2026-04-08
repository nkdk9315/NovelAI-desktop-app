import { useTranslation } from "react-i18next";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GenreDto } from "@/types";

interface GenreTabsProps {
  genres: GenreDto[];
  selectedGenreId: string | undefined;
  onSelectGenre: (id: string | undefined) => void;
  newGenreName: string;
  onNewGenreNameChange: (name: string) => void;
  onCreateGenre: () => void;
  onDeleteGenre: (id: string, isSystem: boolean) => void;
}

export default function GenreTabs({
  genres,
  selectedGenreId,
  onSelectGenre,
  newGenreName,
  onNewGenreNameChange,
  onCreateGenre,
  onDeleteGenre,
}: GenreTabsProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-xs">{t("promptGroup.genre")}:</Label>
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
            <div key={genre.id} className="group relative">
              <Button
                variant={selectedGenreId === genre.id ? "secondary" : "ghost"}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => onSelectGenre(genre.id)}
              >
                {genre.name}
              </Button>
              {!genre.isSystem && (
                <button
                  type="button"
                  className="absolute -right-1 -top-1 hidden rounded-full bg-destructive p-0.5 text-destructive-foreground group-hover:block"
                  onClick={() => onDeleteGenre(genre.id, genre.isSystem)}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add genre */}
      <div className="flex gap-2">
        <Input
          value={newGenreName}
          onChange={(e) => onNewGenreNameChange(e.target.value)}
          placeholder={t("promptGroup.genreNamePlaceholder")}
          className="h-7 text-xs"
          onKeyDown={(e) => e.key === "Enter" && onCreateGenre()}
        />
        <Button size="sm" className="h-7 text-xs" onClick={onCreateGenre}>
          <Plus className="mr-1 h-3 w-3" />
          {t("promptGroup.newGenre")}
        </Button>
      </div>
    </div>
  );
}
