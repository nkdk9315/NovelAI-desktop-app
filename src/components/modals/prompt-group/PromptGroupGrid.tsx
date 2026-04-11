import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import type { GenreDto, PromptGroupDto } from "@/types";

interface PromptGroupGridProps {
  genres: GenreDto[];
  groups: PromptGroupDto[];
  searchQuery: string;
  showSystem: boolean;
  existingGroupIds: string[];
  onSearchChange: (query: string) => void;
  onShowSystemChange: (show: boolean) => void;
  onAdd: () => void;
  onToggleSidebar: (group: PromptGroupDto) => void;
  onEdit: (group: PromptGroupDto) => void;
  onDelete: (id: string) => void;
}

export default function PromptGroupGrid({
  genres,
  groups,
  searchQuery,
  showSystem,
  existingGroupIds,
  onSearchChange,
  onShowSystemChange,
  onAdd,
  onToggleSidebar,
  onEdit,
  onDelete,
}: PromptGroupGridProps) {
  const { t } = useTranslation();
  const [expandedGenres, setExpandedGenres] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const filteredGroups = showSystem ? groups : groups.filter((g) => !g.isSystem);

  // Group by genre
  const genreMap = new Map<string, { genre: GenreDto | null; groups: PromptGroupDto[] }>();
  for (const g of genres) {
    genreMap.set(g.id, { genre: g, groups: [] });
  }
  genreMap.set("__none__", { genre: null, groups: [] });
  for (const group of filteredGroups) {
    const key = group.genreId ?? "__none__";
    if (!genreMap.has(key)) genreMap.set(key, { genre: null, groups: [] });
    genreMap.get(key)!.groups.push(group);
  }

  const toggleGenre = (id: string) => {
    setExpandedGenres((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex gap-2">
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("common.search")}
          className="h-7 flex-1 text-xs"
        />
        <Button size="icon" className="h-7 w-7 shrink-0" onClick={onAdd} title={t("promptGroup.newGroup")}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="show-system"
          checked={showSystem}
          onCheckedChange={(v) => onShowSystemChange(v === true)}
        />
        <label htmlFor="show-system" className="text-[10px] text-muted-foreground cursor-pointer">
          System
        </label>
      </div>

      {/* Tree */}
      <ScrollArea className="h-72">
        <div className="pr-3 text-xs">
          {[...genreMap.entries()]
            .filter(([, v]) => v.groups.length > 0)
            .map(([genreId, { genre, groups: genreGroups }]) => {
              const isGenreOpen = expandedGenres.has(genreId);
              return (
                <div key={genreId}>
                  {/* Genre header */}
                  <button
                    type="button"
                    className="flex w-full items-center gap-1 py-1 font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => toggleGenre(genreId)}
                  >
                    <ChevronRight className={`h-3 w-3 transition-transform ${isGenreOpen ? "rotate-90" : ""}`} />
                    <span>{genre?.name ?? "—"}</span>
                    <span className="text-[10px] text-muted-foreground/60">{genreGroups.length}</span>
                  </button>

                  {/* Groups */}
                  {isGenreOpen && (
                    <div className="ml-3 border-l border-border/50 pl-2">
                      {genreGroups.map((group) => {
                        const isAdded = existingGroupIds.includes(group.id);
                        const isGroupOpen = expandedGroups.has(group.id);
                        return (
                          <div key={group.id}>
                            <ContextMenu>
                              <ContextMenuTrigger>
                                <div className="flex items-center gap-1 py-0.5">
                                  <button
                                    type="button"
                                    className="flex items-center gap-1 flex-1 min-w-0 hover:text-foreground"
                                    onClick={() => toggleGroup(group.id)}
                                  >
                                    <ChevronRight className={`h-2.5 w-2.5 shrink-0 transition-transform ${isGroupOpen ? "rotate-90" : ""}`} />
                                    <span className="truncate">{group.name}</span>
                                    <span className="text-[9px] text-muted-foreground/60 shrink-0">{group.tags.length}</span>
                                  </button>
                                  <button
                                    type="button"
                                    className={`shrink-0 rounded p-0.5 transition-colors ${
                                      isAdded
                                        ? "text-primary hover:bg-destructive/10 hover:text-destructive"
                                        : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                    }`}
                                    onClick={() => onToggleSidebar(group)}
                                    title={isAdded ? "Remove" : "Add"}
                                  >
                                    {isAdded ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                                  </button>
                                </div>
                              </ContextMenuTrigger>
                              <ContextMenuContent>
                                <ContextMenuItem onClick={() => onEdit(group)}>
                                  {t("common.edit")}
                                </ContextMenuItem>
                                {!group.isSystem && (
                                  <ContextMenuItem
                                    className="text-destructive"
                                    onClick={() => onDelete(group.id)}
                                  >
                                    {t("common.delete")}
                                  </ContextMenuItem>
                                )}
                              </ContextMenuContent>
                            </ContextMenu>

                            {/* Entries */}
                            {isGroupOpen && group.tags.length > 0 && (
                              <div className="ml-4 flex flex-wrap gap-0.5 py-0.5">
                                {group.tags.map((tag) => (
                                  <Badge key={tag.id} variant="outline" className="text-[9px] px-1 py-0">
                                    {tag.name || tag.tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </ScrollArea>
    </div>
  );
}
