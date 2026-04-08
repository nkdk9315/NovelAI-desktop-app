import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Layers } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePromptStore } from "@/stores/prompt-store";
import type { PromptGroupDto } from "@/types";

interface PromptGroupPickerProps {
  onInsertTags: (tags: string[]) => void;
}

export default function PromptGroupPicker({ onInsertTags }: PromptGroupPickerProps) {
  const { t } = useTranslation();
  const genres = usePromptStore((s) => s.genres);
  const promptGroups = usePromptStore((s) => s.promptGroups);
  const loadGenres = usePromptStore((s) => s.loadGenres);
  const loadPromptGroups = usePromptStore((s) => s.loadPromptGroups);
  const [open, setOpen] = useState(false);
  const [selectedGenreId, setSelectedGenreId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (open) {
      loadGenres();
      loadPromptGroups(selectedGenreId);
    }
  }, [open, selectedGenreId, loadGenres, loadPromptGroups]);

  const handleSelectGroup = (group: PromptGroupDto) => {
    const tags = group.tags.map((t) => t.tag);
    onInsertTags(tags);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs">
          <Layers className="h-3 w-3" />
          {t("promptGroup.selectGroup")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="flex gap-1 overflow-x-auto border-b p-2">
          <Button
            variant={selectedGenreId === undefined ? "secondary" : "ghost"}
            size="sm"
            className="h-6 shrink-0 px-2 text-xs"
            onClick={() => setSelectedGenreId(undefined)}
          >
            {t("promptGroup.all")}
          </Button>
          {genres.map((genre) => (
            <Button
              key={genre.id}
              variant={selectedGenreId === genre.id ? "secondary" : "ghost"}
              size="sm"
              className="h-6 shrink-0 px-2 text-xs"
              onClick={() => setSelectedGenreId(genre.id)}
            >
              {genre.name}
            </Button>
          ))}
        </div>
        <ScrollArea className="max-h-60">
          {promptGroups.length === 0 ? (
            <p className="p-4 text-center text-xs text-muted-foreground">
              {t("promptGroup.noGroups")}
            </p>
          ) : (
            <div className="p-1">
              {promptGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  className="flex w-full flex-col gap-1 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => handleSelectGroup(group)}
                >
                  <span className="font-medium">{group.name}</span>
                  <div className="flex flex-wrap gap-1">
                    {group.tags.slice(0, 5).map((tag) => (
                      <Badge key={tag.id} variant="secondary" className="text-[10px]">
                        {tag.tag}
                      </Badge>
                    ))}
                    {group.tags.length > 5 && (
                      <Badge variant="outline" className="text-[10px]">
                        +{group.tags.length - 5}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
