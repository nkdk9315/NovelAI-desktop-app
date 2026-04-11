import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, Plus, Minus, Search } from "lucide-react";
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
import * as ipc from "@/lib/ipc";
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

  // Group by genre, with system groups under "System" header
  const genreMap = new Map<string, { label: string; groups: PromptGroupDto[] }>();
  for (const g of genres) {
    genreMap.set(g.id, { label: g.name, groups: [] });
  }
  genreMap.set("__none__", { label: "—", groups: [] });
  genreMap.set("__system__", { label: "System", groups: [] });

  for (const group of filteredGroups) {
    if (group.isSystem) {
      genreMap.get("__system__")!.groups.push(group);
    } else {
      const key = group.genreId ?? "__none__";
      if (!genreMap.has(key)) genreMap.set(key, { label: "—", groups: [] });
      genreMap.get(key)!.groups.push(group);
    }
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

      <ScrollArea className="h-72">
        <div className="pr-3 text-xs">
          {[...genreMap.entries()]
            .filter(([, v]) => v.groups.length > 0)
            .map(([genreId, { label, groups: genreGroups }]) => {
              const isGenreOpen = expandedGenres.has(genreId);
              return (
                <div key={genreId}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-1 py-1 font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => toggleGenre(genreId)}
                  >
                    <ChevronRight className={`h-3 w-3 transition-transform ${isGenreOpen ? "rotate-90" : ""}`} />
                    <span>{label}</span>
                    <span className="text-[10px] text-muted-foreground/60">{genreGroups.length}</span>
                  </button>

                  {isGenreOpen && (
                    <div className="ml-3 border-l border-border/50 pl-2">
                      {genreGroups.map((group) => (
                        <GroupRow
                          key={group.id}
                          group={group}
                          isAdded={existingGroupIds.includes(group.id)}
                          isExpanded={expandedGroups.has(group.id)}
                          onToggleExpand={() => toggleGroup(group.id)}
                          onToggleSidebar={() => onToggleSidebar(group)}
                          onEdit={() => onEdit(group)}
                          onDelete={() => onDelete(group.id)}
                          t={t}
                        />
                      ))}
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

// ---- Group row with system tag support ----

function GroupRow({
  group,
  isAdded,
  isExpanded,
  onToggleExpand,
  onToggleSidebar,
  onEdit,
  onDelete,
  t,
}: {
  group: PromptGroupDto;
  isAdded: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleSidebar: () => void;
  onEdit: () => void;
  onDelete: () => void;
  t: (key: string) => string;
}) {
  const [sysTagSearch, setSysTagSearch] = useState("");
  const [sysTags, setSysTags] = useState<{ name: string; total: number }[]>([]);
  const [sysTotalCount, setSysTotalCount] = useState<number | null>(null);

  const isSystem = group.isSystem && group.category != null;

  const handleExpand = async () => {
    onToggleExpand();
    if (!isExpanded && isSystem && sysTotalCount === null) {
      try {
        const res = await ipc.listSystemGroupTags(group.category!, undefined, 0, 0);
        setSysTotalCount(res.totalCount);
      } catch { /* ignore */ }
    }
  };

  const handleSysSearch = async (query: string) => {
    setSysTagSearch(query);
    if (!query.trim() || group.category == null) {
      setSysTags([]);
      return;
    }
    try {
      const res = await ipc.listSystemGroupTags(group.category, query, 0, 20);
      setSysTags(res.tags.map((t) => ({ name: t.name, total: 0 })));
    } catch {
      setSysTags([]);
    }
  };

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger>
          <div className="flex items-center gap-1 py-0.5">
            <button
              type="button"
              className="flex items-center gap-1 flex-1 min-w-0 hover:text-foreground"
              onClick={handleExpand}
            >
              <ChevronRight className={`h-2.5 w-2.5 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
              <span className="truncate">{group.name}</span>
              <span className="text-[9px] text-muted-foreground/60 shrink-0">
                {isSystem && sysTotalCount !== null ? sysTotalCount.toLocaleString() : group.tags.length}
              </span>
            </button>
            <button
              type="button"
              className={`shrink-0 rounded p-0.5 transition-colors ${
                isAdded
                  ? "text-primary hover:bg-destructive/10 hover:text-destructive"
                  : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
              }`}
              onClick={onToggleSidebar}
              title={isAdded ? "Remove" : "Add"}
            >
              {isAdded ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            </button>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={onEdit}>{t("common.edit")}</ContextMenuItem>
          {!group.isSystem && (
            <ContextMenuItem className="text-destructive" onClick={onDelete}>
              {t("common.delete")}
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {isExpanded && (
        <div className="ml-4 py-0.5">
          {/* System group: count + search */}
          {isSystem && (
            <div className="space-y-1">
              {sysTotalCount !== null && (
                <span className="text-[9px] text-muted-foreground">
                  {sysTotalCount.toLocaleString()} tags
                </span>
              )}
              <div className="relative">
                <Search className="absolute left-1.5 top-1 h-3 w-3 text-muted-foreground" />
                <Input
                  value={sysTagSearch}
                  onChange={(e) => handleSysSearch(e.target.value)}
                  placeholder={t("common.search")}
                  className="h-6 pl-6 text-[10px]"
                />
              </div>
              {sysTags.length > 0 && (
                <div className="flex flex-wrap gap-0.5">
                  {sysTags.map((st) => (
                    <Badge key={st.name} variant="outline" className="text-[9px] px-1 py-0">
                      {st.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Regular group: show entry names */}
          {!isSystem && group.tags.length > 0 && (
            <div className="flex flex-wrap gap-0.5">
              {group.tags.map((tag) => (
                <Badge key={tag.id} variant="outline" className="text-[9px] px-1 py-0">
                  {tag.name || tag.tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
