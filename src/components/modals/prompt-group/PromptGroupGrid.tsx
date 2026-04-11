import { useRef, useState } from "react";
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
  genres, groups, searchQuery, showSystem, existingGroupIds, targetId,
  onSearchChange, onShowSystemChange, onAdd, onToggleSidebar, onEdit, onDelete,
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
    if (group.isSystem) genreMap.get("__system__")!.groups.push(group);
    else {
      const key = group.genreId ?? "__none__";
      if (!genreMap.has(key)) genreMap.set(key, { label: "—", groups: [] });
      genreMap.get(key)!.groups.push(group);
    }
  }

  const toggle = (set: Set<string>, id: string) => { const n = new Set(set); n.has(id) ? n.delete(id) : n.add(id); return n; };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input value={searchQuery} onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("common.search")} className="h-7 flex-1 text-xs" />
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
          {[...genreMap.entries()].filter(([, v]) => v.groups.length > 0).map(([gid, { label, groups: gg }]) => {
            const open = expandedGenres.has(gid);
            return (
              <div key={gid}>
                <button type="button" className="flex w-full items-center gap-1 py-1 font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => setExpandedGenres((s) => toggle(s, gid))}>
                  <ChevronRight className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`} />
                  <span>{label}</span>
                  <span className="text-[10px] text-muted-foreground/60">{gg.length}</span>
                </button>
                {open && (
                  <div className="ml-3 border-l border-border/50 pl-2">
                    {gg.map((group) => (
                      <GroupRow key={group.id} group={group}
                        isAdded={existingGroupIds.includes(group.id)}
                        isExpanded={expandedGroups.has(group.id)}
                        targetId={targetId}
                        onToggleExpand={() => setExpandedGroups((s) => toggle(s, group.id))}
                        onToggleSidebar={() => onToggleSidebar(group)}
                        onEdit={() => onEdit(group)} onDelete={() => onDelete(group.id)} />
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

function GroupRow({ group, isAdded, isExpanded, targetId, onToggleExpand, onToggleSidebar, onEdit, onDelete }: {
  group: PromptGroupDto; isAdded: boolean; isExpanded: boolean; targetId: string;
  onToggleExpand: () => void; onToggleSidebar: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const { t } = useTranslation();
  const [sysSearch, setSysSearch] = useState("");
  const [sysTags, setSysTags] = useState<string[]>([]);
  const [sysTotal, setSysTotal] = useState<number | null>(null);
  const [sysHighlight, setSysHighlight] = useState(-1);
  const sysTagRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [entryHighlight, setEntryHighlight] = useState(-1);
  const entryRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const entryFocusRef = useRef<HTMLDivElement>(null);

  const addGroupToTarget = useSidebarPromptStore((s) => s.addGroupToTarget);
  const toggleTag = useSidebarPromptStore((s) => s.toggleTag);
  const addSystemTag = useSidebarPromptStore((s) => s.addSystemTag);
  const removeSystemTag = useSidebarPromptStore((s) => s.removeSystemTag);
  const sidebarGroup = useSidebarPromptStore((s) => s.targets[targetId]?.groups.find((g) => g.groupId === group.id));

  const isSys = group.isSystem && group.category != null;
  const enabledCount = sidebarGroup?.tags.filter((t) => t.enabled).length ?? 0;

  const handleExpand = async () => {
    onToggleExpand();
    if (!isExpanded && isSys && sysTotal === null) {
      try { const r = await ipc.listSystemGroupTags(group.category!, undefined, 0, 0); setSysTotal(r.totalCount); } catch {/**/}
    }
  };

  const handleSysSearch = async (q: string) => {
    setSysSearch(q);
    setSysHighlight(-1);
    if (!q.trim() || group.category == null) { setSysTags([]); return; }
    try { const r = await ipc.listSystemGroupTags(group.category, q, 0, 20); setSysTags(r.tags.map((t) => t.name)); } catch { setSysTags([]); }
  };

  const handleEntryClick = (tagId: string) => {
    if (!isAdded) {
      addGroupToTarget(targetId, group);
      setTimeout(() => toggleTag(targetId, group.id, tagId), 0);
    } else {
      toggleTag(targetId, group.id, tagId);
    }
  };

  // System tag click: add to sidebar group or toggle if already there
  const handleSysTagClick = (tagName: string) => {
    if (!isAdded) {
      addGroupToTarget(targetId, group);
      setTimeout(() => addSystemTag(targetId, group.id, { name: tagName, category: group.category! }), 0);
    } else {
      const existing = sidebarGroup?.tags.find((t) => t.tag === tagName);
      if (existing) {
        removeSystemTag(targetId, group.id, existing.tagId);
      } else {
        addSystemTag(targetId, group.id, { name: tagName, category: group.category! });
      }
    }
  };

  const isSysTagAdded = (tagName: string) => sidebarGroup?.tags.some((t) => t.tag === tagName) ?? false;
  const isEntryEnabled = (tagId: string) => sidebarGroup?.tags.find((t) => t.tagId === tagId)?.enabled ?? false;

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger>
          <div className="flex items-center py-0.5 gap-0.5">
            <button type="button" className="flex items-center gap-1 flex-1 min-w-0 hover:text-foreground"
              onClick={handleExpand}>
              <ChevronRight className={`h-2.5 w-2.5 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
              <span className={`truncate ${isAdded && enabledCount > 0 ? "font-semibold text-primary" : ""}`}>
                {group.name}
              </span>
              <span className="text-[9px] text-muted-foreground/60 shrink-0">
                {isSys && sysTotal !== null ? sysTotal.toLocaleString() : group.tags.length}
              </span>
              {isAdded && enabledCount > 0 && (
                <Badge variant="default" className="text-[7px] px-1 py-0 shrink-0">{enabledCount}</Badge>
              )}
            </button>
            <button type="button"
              className={`shrink-0 rounded p-0.5 transition-colors ${isAdded ? "text-primary hover:bg-destructive/10 hover:text-destructive" : "text-muted-foreground hover:bg-primary/10 hover:text-primary"}`}
              onClick={onToggleSidebar}>
              {isAdded ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            </button>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={onEdit}>{t("common.edit")}</ContextMenuItem>
          {!group.isSystem && <ContextMenuItem className="text-destructive" onClick={onDelete}>{t("common.delete")}</ContextMenuItem>}
        </ContextMenuContent>
      </ContextMenu>

      {isExpanded && (
        <div className="ml-4 py-0.5">
          {isSys && (
            <div className="space-y-0.5">
              {sysTotal !== null && <span className="text-[8px] text-muted-foreground">{sysTotal.toLocaleString()} tags</span>}
              <div className="flex items-center gap-1">
                <Search className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                <input value={sysSearch} onChange={(e) => handleSysSearch(e.target.value)}
                  placeholder="..."
                  className="h-5 w-full bg-transparent text-[10px] outline-none placeholder:text-muted-foreground/40"
                  onKeyDown={(e) => {
                    if (sysTags.length === 0) return;
                    const move = (delta: number) => {
                      e.preventDefault();
                      setSysHighlight((p) => {
                        const n = Math.max(0, Math.min(p + delta, sysTags.length - 1));
                        sysTagRefs.current[n]?.scrollIntoView({ block: "nearest" });
                        return n;
                      });
                    };
                    if (e.key === "ArrowDown" || e.key === "ArrowRight" || (e.key === "Tab" && !e.shiftKey)) move(1);
                    else if (e.key === "ArrowUp" || e.key === "ArrowLeft" || (e.key === "Tab" && e.shiftKey)) move(-1);
                    else if (e.key === "Enter" && sysHighlight >= 0 && sysHighlight < sysTags.length) {
                      e.preventDefault();
                      handleSysTagClick(sysTags[sysHighlight]);
                    }
                  }}
                />
              </div>
              {sysTags.length > 0 && (
                <div className="flex flex-wrap gap-0.5">
                  {sysTags.map((name, idx) => {
                    const added = isSysTagAdded(name);
                    return (
                      <Badge key={name}
                        ref={(el) => { sysTagRefs.current[idx] = el; }}
                        variant={added ? "default" : "outline"}
                        className={`cursor-pointer text-[9px] px-1 py-0 select-none transition-colors ${idx === sysHighlight ? "ring-1 ring-primary" : ""}`}
                        onClick={() => handleSysTagClick(name)}>
                        {name}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!isSys && group.tags.length > 0 && (
            <div
              ref={entryFocusRef}
              tabIndex={0}
              className="flex flex-wrap gap-0.5 outline-none"
              onFocus={() => { if (entryHighlight < 0) setEntryHighlight(0); }}
              onBlur={() => setEntryHighlight(-1)}
              onKeyDown={(e) => {
                const len = group.tags.length;
                if (len === 0) return;
                const move = (delta: number) => {
                  e.preventDefault();
                  setEntryHighlight((p) => {
                    const n = Math.max(0, Math.min(p + delta, len - 1));
                    entryRefs.current[n]?.scrollIntoView({ block: "nearest" });
                    return n;
                  });
                };
                if (e.key === "ArrowRight" || e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) move(1);
                else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) move(-1);
                else if (e.key === "Enter" && entryHighlight >= 0 && entryHighlight < len) {
                  e.preventDefault();
                  handleEntryClick(group.tags[entryHighlight].id);
                }
              }}
            >
              {group.tags.map((tag, idx) => {
                const enabled = isEntryEnabled(tag.id);
                return (
                  <ContextMenu key={tag.id}>
                    <ContextMenuTrigger>
                      <Badge
                        ref={(el) => { entryRefs.current[idx] = el; }}
                        variant={enabled ? "default" : "outline"}
                        className={`cursor-pointer text-[9px] px-1 py-0 select-none transition-colors ${idx === entryHighlight ? "ring-1 ring-primary" : ""}`}
                        onClick={() => { handleEntryClick(tag.id); entryFocusRef.current?.focus(); setEntryHighlight(idx); }}>
                        {tag.name || tag.tag}
                      </Badge>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={onEdit}>{t("common.edit")}</ContextMenuItem>
                      {!group.isSystem && <ContextMenuItem className="text-destructive" onClick={onDelete}>{t("common.delete")}</ContextMenuItem>}
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
