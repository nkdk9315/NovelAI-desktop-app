import { useCallback, useMemo, useRef, useState } from "react";
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

type TreeItem =
  | { kind: "genre"; id: string; label: string; count: number }
  | { kind: "group"; group: PromptGroupDto; isAdded: boolean }
  | { kind: "entry"; groupId: string; tagId: string; label: string; isSys: false }
  | { kind: "sysSearch"; groupId: string; category: number }
  | { kind: "sysTag"; groupId: string; tagName: string };

export default function PromptGroupGrid({
  genres, groups, searchQuery, showSystem, existingGroupIds, targetId,
  onSearchChange, onShowSystemChange, onAdd, onToggleSidebar, onEdit, onDelete,
}: PromptGroupGridProps) {
  const { t } = useTranslation();
  const [expandedGenres, setExpandedGenres] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [focusIdx, setFocusIdx] = useState(-1);
  const [sysSearches, setSysSearches] = useState<Record<string, string>>({});
  const [sysResults, setSysResults] = useState<Record<string, string[]>>({});
  const [sysTotals, setSysTotals] = useState<Record<string, number>>({});
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const treeRef = useRef<HTMLDivElement>(null);

  const addGroupToTarget = useSidebarPromptStore((s) => s.addGroupToTarget);
  const toggleTag = useSidebarPromptStore((s) => s.toggleTag);
  const addSystemTag = useSidebarPromptStore((s) => s.addSystemTag);
  const removeSystemTag = useSidebarPromptStore((s) => s.removeSystemTag);
  const sidebarTargets = useSidebarPromptStore((s) => s.targets[targetId]);

  const filteredGroups = showSystem ? groups : groups.filter((g) => !g.isSystem);

  // Build genre map
  const genreEntries = useMemo(() => {
    const m = new Map<string, { label: string; groups: PromptGroupDto[] }>();
    for (const g of genres) m.set(g.id, { label: g.name, groups: [] });
    m.set("__none__", { label: "—", groups: [] });
    m.set("__system__", { label: "System", groups: [] });
    for (const group of filteredGroups) {
      if (group.isSystem) m.get("__system__")!.groups.push(group);
      else { const k = group.genreId ?? "__none__"; if (!m.has(k)) m.set(k, { label: "—", groups: [] }); m.get(k)!.groups.push(group); }
    }
    return [...m.entries()].filter(([, v]) => v.groups.length > 0);
  }, [genres, filteredGroups]);

  // Build flat item list
  const items: TreeItem[] = useMemo(() => {
    const list: TreeItem[] = [];
    for (const [gid, { label, groups: gg }] of genreEntries) {
      list.push({ kind: "genre", id: gid, label, count: gg.length });
      if (expandedGenres.has(gid)) {
        for (const group of gg) {
          const isAdded = existingGroupIds.includes(group.id);
          list.push({ kind: "group", group, isAdded });
          if (expandedGroups.has(group.id)) {
            const isSys = group.isSystem && group.category != null;
            if (isSys) {
              list.push({ kind: "sysSearch", groupId: group.id, category: group.category! });
              for (const name of (sysResults[group.id] ?? [])) {
                list.push({ kind: "sysTag", groupId: group.id, tagName: name });
              }
            } else {
              for (const tag of group.tags) {
                list.push({ kind: "entry", groupId: group.id, tagId: tag.id, label: tag.name || tag.tag, isSys: false });
              }
            }
          }
        }
      }
    }
    return list;
  }, [genreEntries, expandedGenres, expandedGroups, existingGroupIds, sysResults]);

  const toggleSet = (s: Set<string>, id: string) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; };

  const handleSysSearch = async (groupId: string, category: number, q: string) => {
    setSysSearches((p) => ({ ...p, [groupId]: q }));
    if (!q.trim()) { setSysResults((p) => ({ ...p, [groupId]: [] })); return; }
    try {
      const r = await ipc.listSystemGroupTags(category, q, 0, 20);
      setSysResults((p) => ({ ...p, [groupId]: r.tags.map((t) => t.name) }));
    } catch { setSysResults((p) => ({ ...p, [groupId]: [] })); }
  };

  const handleExpandGroup = async (group: PromptGroupDto) => {
    setExpandedGroups((s) => toggleSet(s, group.id));
    if (!expandedGroups.has(group.id) && group.isSystem && group.category != null && !(group.id in sysTotals)) {
      try { const r = await ipc.listSystemGroupTags(group.category, undefined, 0, 0); setSysTotals((p) => ({ ...p, [group.id]: r.totalCount })); } catch {/**/}
    }
  };

  const isEntryEnabled = (groupId: string, tagId: string) =>
    sidebarTargets?.groups.find((g) => g.groupId === groupId)?.tags.find((t) => t.tagId === tagId)?.enabled ?? false;

  const isSysTagAdded = (groupId: string, tagName: string) =>
    sidebarTargets?.groups.find((g) => g.groupId === groupId)?.tags.some((t) => t.tag === tagName) ?? false;

  const handleEntryClick = (group: PromptGroupDto, tagId: string) => {
    if (!existingGroupIds.includes(group.id)) {
      addGroupToTarget(targetId, group);
      setTimeout(() => toggleTag(targetId, group.id, tagId), 0);
    } else {
      toggleTag(targetId, group.id, tagId);
    }
  };

  const handleSysTagClick = (group: PromptGroupDto, tagName: string) => {
    if (!existingGroupIds.includes(group.id)) {
      addGroupToTarget(targetId, group);
      setTimeout(() => addSystemTag(targetId, group.id, { name: tagName, category: group.category! }), 0);
    } else {
      const existing = sidebarTargets?.groups.find((g) => g.groupId === group.id)?.tags.find((t) => t.tag === tagName);
      if (existing) removeSystemTag(targetId, group.id, existing.tagId);
      else addSystemTag(targetId, group.id, { name: tagName, category: group.category! });
    }
  };

  const activateItem = useCallback((idx: number) => {
    const item = items[idx];
    if (!item) return;
    if (item.kind === "genre") setExpandedGenres((s) => toggleSet(s, item.id));
    else if (item.kind === "group") handleExpandGroup(item.group);
    else if (item.kind === "entry") {
      const gItem = items.slice(0, idx).reverse().find((i) => i.kind === "group");
      if (gItem?.kind === "group") handleEntryClick(gItem.group, item.tagId);
    } else if (item.kind === "sysTag") {
      const gItem = items.slice(0, idx).reverse().find((i) => i.kind === "group");
      if (gItem?.kind === "group") handleSysTagClick(gItem.group, item.tagName);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, existingGroupIds, sidebarTargets]);

  const handleTreeKeyDown = (e: React.KeyboardEvent) => {
    // Don't interfere with system search input
    if ((e.target as HTMLElement).tagName === "INPUT") return;

    const move = (delta: number) => {
      e.preventDefault();
      setFocusIdx((p) => {
        // Skip sysSearch items
        let n = p + delta;
        while (n >= 0 && n < items.length && items[n].kind === "sysSearch") n += delta;
        n = Math.max(0, Math.min(n, items.length - 1));
        itemRefs.current[n]?.scrollIntoView({ block: "nearest" });
        return n;
      });
    };

    if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) move(1);
    else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) move(-1);
    else if (e.key === "ArrowRight") {
      const item = items[focusIdx];
      if (item?.kind === "genre" && !expandedGenres.has(item.id)) { e.preventDefault(); setExpandedGenres((s) => toggleSet(s, item.id)); }
      else if (item?.kind === "group" && !expandedGroups.has(item.group.id)) { e.preventDefault(); handleExpandGroup(item.group); }
      else move(1);
    } else if (e.key === "ArrowLeft") {
      const item = items[focusIdx];
      if (item?.kind === "genre" && expandedGenres.has(item.id)) { e.preventDefault(); setExpandedGenres((s) => toggleSet(s, item.id)); }
      else if (item?.kind === "group" && expandedGroups.has(item.group.id)) { e.preventDefault(); setExpandedGroups((s) => toggleSet(s, item.group.id)); }
      else move(-1);
    } else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activateItem(focusIdx); }
  };

  const enabledCountFor = (groupId: string) =>
    sidebarTargets?.groups.find((g) => g.groupId === groupId)?.tags.filter((t) => t.enabled).length ?? 0;

  const focusStyle = "border-b-2 border-primary";

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
        <div ref={treeRef} className="pr-3 text-xs outline-none" tabIndex={0}
          onKeyDown={handleTreeKeyDown}
          onFocus={() => { if (focusIdx < 0 && items.length > 0) setFocusIdx(0); }}>
          {items.map((item, idx) => {
            const focused = idx === focusIdx;
            if (item.kind === "genre") {
              const open = expandedGenres.has(item.id);
              return (
                <div key={`g-${item.id}`} ref={(el) => { itemRefs.current[idx] = el; }}
                  className={`flex items-center gap-1 py-1 font-medium text-muted-foreground hover:text-foreground cursor-pointer ${focused ? focusStyle : ""}`}
                  onClick={() => { setExpandedGenres((s) => toggleSet(s, item.id)); setFocusIdx(idx); }}>
                  <ChevronRight className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`} />
                  <span>{item.label}</span>
                  <span className="text-[10px] text-muted-foreground/60">{item.count}</span>
                </div>
              );
            }
            if (item.kind === "group") {
              const { group, isAdded } = item;
              const open = expandedGroups.has(group.id);
              const ec = enabledCountFor(group.id);
              const isSys = group.isSystem && group.category != null;
              return (
                <ContextMenu key={`grp-${group.id}`}>
                  <ContextMenuTrigger>
                    <div ref={(el) => { itemRefs.current[idx] = el; }}
                      className={`ml-3 flex items-center py-0.5 gap-0.5 ${focused ? focusStyle : ""}`}>
                      <button type="button" className="flex items-center gap-1 flex-1 min-w-0 hover:text-foreground"
                        onClick={() => { handleExpandGroup(group); setFocusIdx(idx); }}>
                        <ChevronRight className={`h-2.5 w-2.5 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
                        <span className={`truncate ${isAdded && ec > 0 ? "font-semibold text-primary" : ""}`}>{group.name}</span>
                        <span className="text-[9px] text-muted-foreground/60 shrink-0">
                          {isSys && group.id in sysTotals ? sysTotals[group.id].toLocaleString() : group.tags.length}
                        </span>
                        {isAdded && ec > 0 && <Badge variant="default" className="text-[7px] px-1 py-0 shrink-0">{ec}</Badge>}
                      </button>
                      <button type="button"
                        className={`shrink-0 rounded p-0.5 transition-colors ${isAdded ? "text-primary hover:bg-destructive/10 hover:text-destructive" : "text-muted-foreground hover:bg-primary/10 hover:text-primary"}`}
                        onClick={() => onToggleSidebar(group)}>
                        {isAdded ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                      </button>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => onEdit(group)}>{t("common.edit")}</ContextMenuItem>
                    {!group.isSystem && <ContextMenuItem className="text-destructive" onClick={() => onDelete(group.id)}>{t("common.delete")}</ContextMenuItem>}
                  </ContextMenuContent>
                </ContextMenu>
              );
            }
            if (item.kind === "sysSearch") {
              return (
                <div key={`ss-${item.groupId}`} ref={(el) => { itemRefs.current[idx] = el; }} className="ml-7 py-0.5 space-y-0.5">
                  {item.groupId in sysTotals && <span className="text-[8px] text-muted-foreground">{sysTotals[item.groupId].toLocaleString()} tags</span>}
                  <div className="flex items-center gap-1">
                    <Search className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                    <input value={sysSearches[item.groupId] ?? ""}
                      onChange={(e) => handleSysSearch(item.groupId, item.category, e.target.value)}
                      placeholder="..." className="h-5 w-full bg-transparent text-[10px] outline-none placeholder:text-muted-foreground/40" />
                  </div>
                </div>
              );
            }
            if (item.kind === "sysTag") {
              const added = isSysTagAdded(item.groupId, item.tagName);
              const gItem = items.slice(0, idx).reverse().find((i) => i.kind === "group");
              return (
                <Badge key={`st-${item.groupId}-${item.tagName}`}
                  ref={(el) => { itemRefs.current[idx] = el; }}
                  variant={added ? "default" : "outline"}
                  className={`ml-7 cursor-pointer text-[9px] px-1 py-0 select-none transition-colors inline-block mr-0.5 mb-0.5 ${focused ? focusStyle : ""}`}
                  onClick={() => { if (gItem?.kind === "group") handleSysTagClick(gItem.group, item.tagName); setFocusIdx(idx); }}>
                  {item.tagName}
                </Badge>
              );
            }
            if (item.kind === "entry") {
              const enabled = isEntryEnabled(item.groupId, item.tagId);
              const gItem = items.slice(0, idx).reverse().find((i) => i.kind === "group");
              return (
                <ContextMenu key={`e-${item.tagId}`}>
                  <ContextMenuTrigger>
                    <Badge ref={(el) => { itemRefs.current[idx] = el; }}
                      variant={enabled ? "default" : "outline"}
                      className={`ml-7 cursor-pointer text-[9px] px-1 py-0 select-none transition-colors inline-block mr-0.5 mb-0.5 ${focused ? focusStyle : ""}`}
                      onClick={() => { if (gItem?.kind === "group") handleEntryClick(gItem.group, item.tagId); setFocusIdx(idx); }}>
                      {item.label}
                    </Badge>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    {gItem?.kind === "group" && <ContextMenuItem onClick={() => onEdit(gItem.group)}>{t("common.edit")}</ContextMenuItem>}
                    {gItem?.kind === "group" && !gItem.group.isSystem && <ContextMenuItem className="text-destructive" onClick={() => onDelete(gItem.group.id)}>{t("common.delete")}</ContextMenuItem>}
                  </ContextMenuContent>
                </ContextMenu>
              );
            }
            return null;
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
