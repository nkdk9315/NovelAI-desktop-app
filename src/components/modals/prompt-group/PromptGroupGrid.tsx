import { useTranslation } from "react-i18next";
import { Plus, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { GenreDto, PromptGroupDto } from "@/types";

interface PromptGroupGridProps {
  genres: GenreDto[];
  groups: PromptGroupDto[];
  selectedGenreId: string | undefined;
  searchQuery: string;
  onGenreChange: (id: string | undefined) => void;
  onSearchChange: (query: string) => void;
  onAdd: () => void;
  onEdit: (group: PromptGroupDto) => void;
}

export default function PromptGroupGrid({
  genres,
  groups,
  selectedGenreId,
  searchQuery,
  onGenreChange,
  onSearchChange,
  onAdd,
  onEdit,
}: PromptGroupGridProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex gap-2">
        <Select
          value={selectedGenreId ?? "all"}
          onValueChange={(v) => onGenreChange(v === "all" ? undefined : v)}
        >
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("promptGroup.all")}</SelectItem>
            {genres.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("common.search")}
          className="h-8 flex-1 text-xs"
        />
        <Button size="sm" className="h-8 gap-1 text-xs" onClick={onAdd}>
          <Plus className="h-3 w-3" />
          {t("promptGroup.newGroup")}
        </Button>
      </div>

      {/* Card grid */}
      <ScrollArea className="max-h-80">
        {groups.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            {t("promptGroup.noGroups")}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {groups.map((group) => (
              <button
                key={group.id}
                type="button"
                className="flex flex-col items-start gap-1 rounded-lg border border-border p-2 text-left hover:bg-accent"
                onClick={() => onEdit(group)}
              >
                {/* Thumbnail */}
                <div className="flex h-16 w-full items-center justify-center rounded bg-muted/50">
                  {group.thumbnailPath ? (
                    <img
                      src={group.thumbnailPath}
                      alt={group.name}
                      className="h-full w-full rounded object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground/30" />
                  )}
                </div>
                <span className="text-xs font-medium line-clamp-1">{group.name}</span>
                <div className="flex flex-wrap gap-0.5">
                  {group.isDefault && (
                    <Badge variant="outline" className="text-[8px]">
                      {t("promptGroup.defaultForGenre")}
                    </Badge>
                  )}
                  {group.isSystem && (
                    <Badge variant="secondary" className="text-[8px]">System</Badge>
                  )}
                  <Badge variant="secondary" className="text-[8px]">
                    {group.tags.length} tags
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
