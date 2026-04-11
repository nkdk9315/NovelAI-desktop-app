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
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import * as ipc from "@/lib/ipc";
import type { GenreDto, PromptGroupDto } from "@/types";

interface PromptGroupGridProps {
  genres: GenreDto[];
  groups: PromptGroupDto[];
  searchQuery: string;
  showSystem: boolean;
  existingGroupIds: string[];
  targetId: string;
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
  targetId,
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

  const genreMap = new Map<string, { label: string; groups: PromptGroupDto[] }>();
  for (const g of genres) genreMap.set(g.id, { label: g.name, groups: [] });
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
    setExpandedGenres((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
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
        <Checkbox id="show-system" checked={showSystem} onCheckedChange={(v) => onShowSystemChange(v === true)} />
        <label htmlFor="show-system" className="text-[10px] text-muted-foreground cursor-pointer">System</label>
      </div>

      <ScrollArea className="h-72">
        <div className="pr-3 text-xs">
          {[...genreMap.entries()]
            .filter(([, v]) => v.groups.length > 0)
            .map(([genreId, { label, groups: gg }]) => {
              const open = expandedGenres.has(genreId);
              return (
                <div key={genreId}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-1 py-1 font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => toggleGenre(genreId)}
                  >
                    <ChevronRight className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`} />
                    <span>{label}</span>
                    <span className="text-[10px] text-muted-foreground/60">{gg.length}</span>
                  </button>
                  {open && (
                    <div className="ml-3 border-l border-border/50 pl-2">
                      {gg.map((group) => (
                        <GroupRow
                          key={group.id}
                          group={group}
                          isAdded={existingGroupIds.includes(group.id)}
                          isExpanded={expandedGroups.has(group.id)}
                          targetId={targetId}
                          onToggleExpand={() => toggleGroup(group.id)}
                          onToggleSidebar={() => onToggleSidebar(group)}
                          onEdit={() => onEdit(group)}
                          onDelete={() => onDelete(group.id)}
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

function GroupRow({
  group, isAdded, isExpanded, targetId,
  onToggleExpand, onToggleSidebar, onEdit, onDelete,
}: {
  group: PromptGroupDto; isAdded: boolean; isExpanded: boolean; targetId: string;
  onToggleExpand: () => void; onToggleSidebar: () => void;
  onEdit: () => void; onDelete: () => void;
}) {
  const { t } = useTranslation();
  const [sysSearch, setSysSearch] = useState("");
  const [sysTags, setSysTags] = useState<string[]>([]);
  const [sysTotal, setSysTotal] = useState<number | null>(null);

  const addGroupToTarget = useSidebarPromptStore((s) => s.addGroupToTarget);
  const toggleTag = useSidebarPromptStore((s) => s.toggleTag);
  const sidebarGroup = useSidebarPromptStore((s) => s.targets[targetId]?.groups.find((g) => g.groupId === group.id));

  const isSys = group.isSystem && group.category != null;

  const handleExpand = async () => {
    onToggleExpand();
    if (!isExpanded && isSys && sysTotal === null) {
      try {
        const res = await ipc.listSystemGroupTags(group.category!, undefined, 0, 0);
        setSysTotal(res.totalCount);
      } catch { /* */ }
    }
  };

  const handleSysSearch = async (q: string) => {
    setSysSearch(q);
    if (!q.trim() || group.category == null) { setSysTags([]); return; }
    try {
      const res = await ipc.listSystemGroupTags(group.category, q, 0, 20);
      setSysTags(res.tags.map((t) => t.name));
    } catch { setSysTags([]); }
  };

  // Click entry: if group not in sidebar, add it with this entry enabled. If in sidebar, toggle entry.
  const handleEntryClick = (tagId: string) => {
    if (!isAdded) {
      addGroupToTarget(targetId, group);
      // After adding, enable the clicked entry
      setTimeout(() => toggleTag(targetId, group.id, tagId), 0);
    } else {
      toggleTag(targetId, group.id, tagId);
    }
  };

  const isEntryEnabled = (tagId: string) => {
    if (!sidebarGroup) return false;
    return sidebarGroup.tags.find((t) => t.tagId === tagId)?.enabled ?? false;
  };

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger>
          <div className="flex items-center py-0.5 gap-0.5">
            <button
              type="button"
              className="flex items-center gap-1 flex-1 min-w-0 hover:text-foreground"
              onClick={handleExpand}
            >
              <ChevronRight className={`h-2.5 w-2.5 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
              <span className="truncate">{group.name}</span>
              <span className="text-[9px] text-muted-foreground/60 shrink-0">
                {isSys && sysTotal !== null ? sysTotal.toLocaleString() : group.tags.length}
              </span>
            </button>
            <button
              type="button"
              className={`shrink-0 rounded p-0.5 transition-colors ${
                isAdded ? "text-primary hover:bg-destructive/10 hover:text-destructive" : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
              }`}
              onClick={onToggleSidebar}
            >
              {isAdded ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            </button>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={onEdit}>{t("common.edit")}</ContextMenuItem>
          {!group.isSystem && (
            <ContextMenuItem className="text-destructive" onClick={onDelete}>{t("common.delete")}</ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {isExpanded && (
        <div className="ml-4 py-0.5">
          {isSys && (
            <div className="space-y-0.5">
              {sysTotal !== null && (
                <span className="text-[8px] text-muted-foreground">{sysTotal.toLocaleString()} tags</span>
              )}
              <div className="flex items-center gap-1">
                <Search className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                <input
                  value={sysSearch}
                  onChange={(e) => handleSysSearch(e.target.value)}
                  placeholder="..."
                  className="h-5 w-full bg-transparent text-[10px] outline-none placeholder:text-muted-foreground/40"
                />
              </div>
              {sysTags.length > 0 && (
                <div className="flex flex-wrap gap-0.5">
                  {sysTags.map((name) => (
                    <Badge key={name} variant="outline" className="text-[9px] px-1 py-0">{name}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {!isSys && group.tags.length > 0 && (
            <div className="flex flex-wrap gap-0.5">
              {group.tags.map((tag) => {
                const enabled = isEntryEnabled(tag.id);
                return (
                  <ContextMenu key={tag.id}>
                    <ContextMenuTrigger>
                      <Badge
                        variant={enabled ? "default" : "outline"}
                        className={`cursor-pointer text-[9px] px-1 py-0 select-none transition-colors ${
                          enabled ? "" : "text-muted-foreground/50 bg-transparent"
                        }`}
                        onClick={() => handleEntryClick(tag.id)}
                      >
                        {tag.name || tag.tag}
                      </Badge>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={onEdit}>{t("common.edit")}</ContextMenuItem>
                      {!group.isSystem && (
                        <ContextMenuItem className="text-destructive" onClick={onDelete}>{t("common.delete")}</ContextMenuItem>
                      )}
                    </ContextMenuContent>
                  </ContextMenu>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
