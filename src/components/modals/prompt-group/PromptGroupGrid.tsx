import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, Plus, Minus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import * as ipc from "@/lib/ipc";
import type { GenreDto, PromptGroupDto } from "@/types";

interface Props {
  genres: GenreDto[]; groups: PromptGroupDto[];
  searchQuery: string; showSystem: boolean; existingGroupIds: string[]; targetId: string;
  onSearchChange: (q: string) => void; onShowSystemChange: (v: boolean) => void;
  onAdd: () => void; onToggleSidebar: (g: PromptGroupDto) => void;
  onEdit: (g: PromptGroupDto) => void; onDelete: (id: string) => void;
  onEditEntry: (groupId: string, tagId: string) => void;
  onDeleteEntry: (groupId: string, tagId: string) => void;
}

type FlatItem =
  | { kind: "genre"; id: string; label: string; count: number }
  | { kind: "group"; group: PromptGroupDto; isAdded: boolean }
  | { kind: "entry"; groupId: string; tagId: string; label: string }
  | { kind: "sysSearch"; groupId: string; category: number }
  | { kind: "sysTag"; groupId: string; tagName: string };

type NavSlot =
  | { kind: "topSearch" }
  | { kind: "addButton" }
  | { kind: "systemSwitch" }
  | { kind: "tree"; idx: number };

export default function PromptGroupGrid({
  genres, groups, searchQuery, showSystem, existingGroupIds, targetId,
  onSearchChange, onShowSystemChange, onAdd, onToggleSidebar, onEdit, onDelete,
  onEditEntry, onDeleteEntry,
}: Props) {
  const { t } = useTranslation();
  const [expGenres, setExpGenres] = useState<Set<string>>(new Set());
  const [expGroups, setExpGroups] = useState<Set<string>>(new Set());
  const [navIdx, setNavIdx] = useState(0);
  const [sysSearches, setSysSearches] = useState<Record<string, string>>({});
  const [sysResults, setSysResults] = useState<Record<string, string[]>>({});
  const [sysTotals, setSysTotals] = useState<Record<string, number>>({});
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const treeRef = useRef<HTMLDivElement>(null);
  const topSearchRef = useRef<HTMLInputElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const sysCheckRef = useRef<HTMLButtonElement>(null);

  const addGroupToTarget = useSidebarPromptStore((s) => s.addGroupToTarget);
  const toggleTag = useSidebarPromptStore((s) => s.toggleTag);
  const addSystemTag = useSidebarPromptStore((s) => s.addSystemTag);
  const removeSystemTag = useSidebarPromptStore((s) => s.removeSystemTag);
  const sidebarTargets = useSidebarPromptStore((s) => s.targets[targetId]);

  const filtered = showSystem ? groups : groups.filter((g) => !g.isSystem);

  const genreEntries = useMemo(() => {
    const m = new Map<string, { label: string; groups: PromptGroupDto[] }>();
    for (const g of genres) m.set(g.id, { label: g.name, groups: [] });
    m.set("__none__", { label: "—", groups: [] });
    m.set("__system__", { label: "System", groups: [] });
    for (const gr of filtered) {
      if (gr.isSystem) m.get("__system__")!.groups.push(gr);
      else { const k = gr.genreId ?? "__none__"; if (!m.has(k)) m.set(k, { label: "—", groups: [] }); m.get(k)!.groups.push(gr); }
    }
    return [...m.entries()].filter(([, v]) => v.groups.length > 0);
  }, [genres, filtered]);

  const items: FlatItem[] = useMemo(() => {
    const list: FlatItem[] = [];
    for (const [gid, { label, groups: gg }] of genreEntries) {
      list.push({ kind: "genre", id: gid, label, count: gg.length });
      if (expGenres.has(gid)) for (const gr of gg) {
        list.push({ kind: "group", group: gr, isAdded: existingGroupIds.includes(gr.id) });
        if (expGroups.has(gr.id)) {
          if (gr.isSystem && gr.category != null) {
            list.push({ kind: "sysSearch", groupId: gr.id, category: gr.category });
            for (const n of (sysResults[gr.id] ?? [])) list.push({ kind: "sysTag", groupId: gr.id, tagName: n });
          } else for (const tag of gr.tags) list.push({ kind: "entry", groupId: gr.id, tagId: tag.id, label: tag.name || tag.tag });
        }
      }
    }
    return list;
  }, [genreEntries, expGenres, expGroups, existingGroupIds, sysResults]);

  const navItems: NavSlot[] = useMemo(() => [
    { kind: "topSearch" },
    { kind: "addButton" },
    { kind: "systemSwitch" },
    ...items.map((_, idx) => ({ kind: "tree" as const, idx })),
  ], [items]);

  const TREE_OFFSET = 3;

  const treeFocusIdx = navItems[navIdx]?.kind === "tree" ? (navItems[navIdx] as { kind: "tree"; idx: number }).idx : -1;

  const tog = (s: Set<string>, id: string) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; };

  const handleExpandGroup = async (gr: PromptGroupDto) => {
    setExpGroups((s) => tog(s, gr.id));
    if (!expGroups.has(gr.id) && gr.isSystem && gr.category != null && !(gr.id in sysTotals))
      try { const r = await ipc.listSystemGroupTags(gr.category, undefined, 0, 0); setSysTotals((p) => ({ ...p, [gr.id]: r.totalCount })); } catch {/**/}
  };

  const doSysSearch = async (gid: string, cat: number, q: string) => {
    setSysSearches((p) => ({ ...p, [gid]: q }));
    if (!q.trim()) { setSysResults((p) => ({ ...p, [gid]: [] })); return; }
    try { const r = await ipc.listSystemGroupTags(cat, q, 0, 20); setSysResults((p) => ({ ...p, [gid]: r.tags.map((t) => t.name) })); } catch { setSysResults((p) => ({ ...p, [gid]: [] })); }
  };

  const isEnabled = (gid: string, tid: string) => sidebarTargets?.groups.find((g) => g.groupId === gid)?.tags.find((t) => t.tagId === tid)?.enabled ?? false;
  const isSysAdded = (gid: string, name: string) => sidebarTargets?.groups.find((g) => g.groupId === gid)?.tags.some((t) => t.tag === name) ?? false;
  const enabledCount = (gid: string) => sidebarTargets?.groups.find((g) => g.groupId === gid)?.tags.filter((t) => t.enabled).length ?? 0;

  const clickEntry = (gr: PromptGroupDto, tid: string) => {
    if (!existingGroupIds.includes(gr.id)) { addGroupToTarget(targetId, gr); setTimeout(() => toggleTag(targetId, gr.id, tid), 0); }
    else toggleTag(targetId, gr.id, tid);
  };
  const clickSysTag = (gr: PromptGroupDto, name: string) => {
    if (!existingGroupIds.includes(gr.id)) { addGroupToTarget(targetId, gr); setTimeout(() => addSystemTag(targetId, gr.id, { name, category: gr.category! }), 0); }
    else { const ex = sidebarTargets?.groups.find((g) => g.groupId === gr.id)?.tags.find((t) => t.tag === name); if (ex) removeSystemTag(targetId, gr.id, ex.tagId); else addSystemTag(targetId, gr.id, { name, category: gr.category! }); }
  };

  const focusSlot = (n: number) => {
    const slot = navItems[n];
    if (!slot) return;
    if (slot.kind === "topSearch") {
      topSearchRef.current?.focus();
      return;
    }
    if (slot.kind === "addButton") {
      addBtnRef.current?.focus();
      return;
    }
    if (slot.kind === "systemSwitch") {
      sysCheckRef.current?.focus();
      return;
    }
    const el = itemRefs.current[slot.idx];
    const treeItem = items[slot.idx];
    if (treeItem?.kind === "sysSearch") {
      const input = el?.querySelector("input") as HTMLInputElement | null;
      input?.focus();
    } else {
      treeRef.current?.focus();
      el?.scrollIntoView({ block: "nearest" });
    }
  };

  const moveFocus = (delta: number) => {
    const next = Math.max(0, Math.min(navIdx + delta, navItems.length - 1));
    if (next === navIdx) { focusSlot(next); return; }
    setNavIdx(next);
    focusSlot(next);
  };

  const activate = useCallback((idx: number) => {
    const it = items[idx]; if (!it) return;
    if (it.kind === "genre") setExpGenres((s) => tog(s, it.id));
    else if (it.kind === "group") handleExpandGroup(it.group);
    else if (it.kind === "entry") { const g = findGroup(items, idx); if (g) clickEntry(g, it.tagId); }
    else if (it.kind === "sysTag") { const g = findGroup(items, idx); if (g) clickSysTag(g, it.tagName); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, existingGroupIds, sidebarTargets]);

  const handleNavKey = (e: React.KeyboardEvent, opts?: { allowUpEscape?: boolean }) => {
    if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
      e.preventDefault();
      moveFocus(1);
      return true;
    }
    if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
      if (opts?.allowUpEscape && navIdx === 0) return false;
      e.preventDefault();
      moveFocus(-1);
      return true;
    }
    return false;
  };

  const onTreeKey = (e: React.KeyboardEvent) => {
    if (handleNavKey(e)) return;
    if (e.key === "ArrowRight") {
      const it = items[treeFocusIdx];
      if (it?.kind === "genre" && !expGenres.has(it.id)) { e.preventDefault(); setExpGenres((s) => tog(s, it.id)); }
      else if (it?.kind === "group" && !expGroups.has(it.group.id)) { e.preventDefault(); handleExpandGroup(it.group); }
      else { e.preventDefault(); moveFocus(1); }
    } else if (e.key === "ArrowLeft") {
      const it = items[treeFocusIdx];
      if (it?.kind === "genre" && expGenres.has(it.id)) { e.preventDefault(); setExpGenres((s) => tog(s, it.id)); }
      else if (it?.kind === "group" && expGroups.has(it.group.id)) { e.preventDefault(); setExpGroups((s) => tog(s, it.group.id)); }
      else { e.preventDefault(); moveFocus(-1); }
    } else if (e.key === "Enter" || e.key === " ") {
      if (treeFocusIdx >= 0) { e.preventDefault(); activate(treeFocusIdx); }
    }
  };

  const ul = "border-b border-primary/60";

  const rendered: React.ReactNode[] = [];
  let i = 0;
  while (i < items.length) {
    const it = items[i];
    const f = i === treeFocusIdx;

    if (it.kind === "genre") {
      const open = expGenres.has(it.id);
      const gi = i;
      rendered.push(
        <div key={`g-${it.id}`} ref={(el) => { itemRefs.current[gi] = el; }}
          className="flex items-center gap-1 py-1 font-medium text-muted-foreground hover:text-foreground cursor-pointer"
          onClick={() => { setExpGenres((s) => tog(s, it.id)); setNavIdx(gi + TREE_OFFSET); }}>
          <ChevronRight className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`} />
          <span className={f ? ul : ""}>{it.label}</span>
          <span className="text-[10px] text-muted-foreground/60">{it.count}</span>
        </div>
      );
      i++; continue;
    }

    if (it.kind === "group") {
      const { group: gr, isAdded } = it;
      const open = expGroups.has(gr.id);
      const ec = enabledCount(gr.id);
      const isSys = gr.isSystem && gr.category != null;
      const gi = i;

      const kids: { it: FlatItem; idx: number }[] = [];
      let j = i + 1;
      while (j < items.length && items[j].kind !== "genre" && items[j].kind !== "group") { kids.push({ it: items[j], idx: j }); j++; }

      rendered.push(
        <div key={`grp-${gr.id}`}>
          <ContextMenu>
            <ContextMenuTrigger>
              <div ref={(el) => { itemRefs.current[gi] = el; }} className="ml-3 flex items-center py-0.5 gap-0.5">
                <button type="button" className="flex items-center gap-1 flex-1 min-w-0 hover:text-foreground"
                  onClick={() => { handleExpandGroup(gr); setNavIdx(gi + TREE_OFFSET); }}>
                  <ChevronRight className={`h-2.5 w-2.5 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
                  <span className={`truncate ${isAdded && ec > 0 ? "font-semibold text-primary" : ""} ${gi === treeFocusIdx ? ul : ""}`}>{gr.name}</span>
                  <span className="text-[9px] text-muted-foreground/60 shrink-0">{isSys && gr.id in sysTotals ? sysTotals[gr.id].toLocaleString() : gr.tags.length}</span>
                  {isAdded && ec > 0 && <Badge variant="default" className="text-[7px] px-1 py-0 shrink-0">{ec}</Badge>}
                </button>
                <button type="button" className={`shrink-0 rounded p-0.5 transition-colors ${isAdded ? "text-primary hover:bg-destructive/10 hover:text-destructive" : "text-muted-foreground hover:bg-primary/10 hover:text-primary"}`}
                  onClick={() => onToggleSidebar(gr)}>{isAdded ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}</button>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => onEdit(gr)}>{t("common.edit")}</ContextMenuItem>
              {!gr.isSystem && <ContextMenuItem className="text-destructive" onClick={() => onDelete(gr.id)}>{t("common.delete")}</ContextMenuItem>}
            </ContextMenuContent>
          </ContextMenu>

          {kids.length > 0 && (
            <div className="ml-6 border-l border-border pl-2 py-0.5">
              {kids.filter((k) => k.it.kind === "sysSearch").map((k) => {
                const s = k.it as Extract<FlatItem, { kind: "sysSearch" }>;
                return (
                  <div key={`ss-${s.groupId}`} ref={(el) => { itemRefs.current[k.idx] = el; }} className="space-y-0.5 mb-1">
                    {s.groupId in sysTotals && <span className="text-[8px] text-muted-foreground">{sysTotals[s.groupId].toLocaleString()} tags</span>}
                    <div className="flex items-center gap-1">
                      <Search className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                      <input value={sysSearches[s.groupId] ?? ""} onChange={(e) => doSysSearch(s.groupId, s.category, e.target.value)}
                        onFocus={() => setNavIdx(k.idx + TREE_OFFSET)}
                        onKeyDown={(e) => handleNavKey(e)}
                        placeholder="..." className="h-5 w-full bg-transparent text-[10px] outline-none placeholder:text-muted-foreground/40" />
                    </div>
                  </div>
                );
              })}
              <div className="flex flex-wrap gap-0.5">
                {kids.filter((k) => k.it.kind === "sysTag" || k.it.kind === "entry").map((k) => {
                  const fi = k.idx === treeFocusIdx;
                  if (k.it.kind === "sysTag") {
                    const added = isSysAdded(k.it.groupId, k.it.tagName);
                    return <Badge key={`st-${k.it.tagName}`} ref={(el) => { itemRefs.current[k.idx] = el; }}
                      variant={added ? "default" : "outline"} className={`cursor-pointer text-[9px] px-1 py-0 select-none transition-colors ${fi ? ul : ""}`}
                      onClick={() => { clickSysTag(gr, k.it.kind === "sysTag" ? k.it.tagName : ""); setNavIdx(k.idx + TREE_OFFSET); }}>{(k.it as Extract<FlatItem, {kind:"sysTag"}>).tagName}</Badge>;
                  }
                  if (k.it.kind === "entry") {
                    const en = isEnabled(k.it.groupId, k.it.tagId);
                    return (
                      <ContextMenu key={`e-${k.it.tagId}`}>
                        <ContextMenuTrigger>
                          <Badge ref={(el) => { itemRefs.current[k.idx] = el; }} variant={en ? "default" : "outline"}
                            className={`cursor-pointer text-[9px] px-1 py-0 select-none transition-colors ${fi ? ul : ""}`}
                            onClick={() => { clickEntry(gr, (k.it as Extract<FlatItem, {kind:"entry"}>).tagId); setNavIdx(k.idx + TREE_OFFSET); }}>
                            {(k.it as Extract<FlatItem, {kind:"entry"}>).label}
                          </Badge>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem onClick={() => onEditEntry(gr.id, (k.it as Extract<FlatItem, {kind:"entry"}>).tagId)}>{t("common.edit")}</ContextMenuItem>
                          {!gr.isSystem && <ContextMenuItem className="text-destructive" onClick={() => onDeleteEntry(gr.id, (k.it as Extract<FlatItem, {kind:"entry"}>).tagId)}>{t("common.delete")}</ContextMenuItem>}
                        </ContextMenuContent>
                      </ContextMenu>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          )}
        </div>
      );
      i = j; continue;
    }
    i++;
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input ref={topSearchRef} value={searchQuery} onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setNavIdx(0)}
          onKeyDown={(e) => handleNavKey(e, { allowUpEscape: true })}
          placeholder={t("common.search")} className="h-7 flex-1 text-xs" />
        <Button ref={addBtnRef} size="icon" className="h-7 w-7 shrink-0 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background focus:outline-none" onClick={onAdd} title={t("promptGroup.newGroup")}
          onFocus={() => setNavIdx(1)}
          onKeyDown={(e) => handleNavKey(e)}><Plus className="h-3.5 w-3.5" /></Button>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="show-system" ref={sysCheckRef} checked={showSystem} onCheckedChange={onShowSystemChange}
          onFocus={() => setNavIdx(2)}
          onKeyDown={(e) => handleNavKey(e)}
          className="focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background" />
        <label htmlFor="show-system" className="text-[10px] text-muted-foreground cursor-pointer">System</label>
      </div>
      <ScrollArea className="h-72">
        <div ref={treeRef} className="pr-3 text-xs outline-none" tabIndex={0} onKeyDown={onTreeKey}
          onFocus={() => { if (treeFocusIdx < 0 && items.length > 0) setNavIdx(TREE_OFFSET); }}>
          {rendered}
        </div>
      </ScrollArea>
    </div>
  );
}

function findGroup(items: FlatItem[], idx: number): PromptGroupDto | null {
  for (let k = idx - 1; k >= 0; k--) if (items[k].kind === "group") return (items[k] as Extract<FlatItem, {kind:"group"}>).group;
  return null;
}
