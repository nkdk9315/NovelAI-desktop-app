import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, Database, FolderPlus, Plus, Minus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import HoverSearch from "@/components/shared/HoverSearch";
import * as ipc from "@/lib/ipc";
import type { GenreDto, PromptGroupDto, PromptGroupFolderDto, TagDto } from "@/types";
import { buildFolderTree, FolderAccordionNode, UNCATEGORIZED_FOLDER_ID } from "./PromptGroupGridCards";
import { buildSysFlatRows, SystemTreeView } from "./PromptGroupGridSystem";

// Re-export for consumers
export type SystemTreeNode =
  | { kind: "branch"; id: number; title: string; children: SystemTreeNode[]; leafCount: number }
  | { kind: "leaf"; id: number; title: string };

interface Props {
  genres: GenreDto[];
  groups: PromptGroupDto[];
  folders: PromptGroupFolderDto[];
  searchQuery: string;
  showSystem: boolean;
  existingGroupIds: string[];
  targetId: string;
  systemTree?: SystemTreeNode[];
  onSearchChange: (q: string) => void;
  onShowSystemChange: (v: boolean) => void;
  onOpenTagDb: () => void;
  onAdd: () => void;
  onCreateInFolder: (folderId: number | null) => void;
  onCreateFolder: (parentId: number | null, title: string) => Promise<void>;
  onRenameFolder: (id: number, title: string) => Promise<void>;
  onDeleteFolder: (id: number) => void;
  onToggleSidebar: (g: PromptGroupDto) => void;
  onEdit: (g: PromptGroupDto) => void;
  onDelete: (id: string) => void;
  onEditEntry: (groupId: string, tagId: string) => void;
  onDeleteEntry: (groupId: string, tagId: string) => void;
  onCreateFromTagDb: (title: string, tagNames: string[]) => void;
  onRemoveFromFavorites?: (leafIds: number[]) => void;
  onEditSystemGroupSettings?: (id: string, name: string) => void;
}

export default function PromptGroupGrid({
  genres: _genres, groups, folders, searchQuery, showSystem, existingGroupIds, targetId,
  systemTree, onSearchChange, onShowSystemChange, onOpenTagDb, onAdd,
  onCreateInFolder, onCreateFolder, onRenameFolder, onDeleteFolder,
  onToggleSidebar, onEdit, onDelete, onEditEntry, onDeleteEntry,
  onCreateFromTagDb, onRemoveFromFavorites, onEditSystemGroupSettings,
}: Props) {
  void _genres;
  const { t } = useTranslation();
  const [expGroups, setExpGroups] = useState<Set<string>>(new Set());
  const [expFolders, setExpFolders] = useState<Set<number>>(() => new Set([UNCATEGORIZED_FOLDER_ID]));
  const [renameTarget, setRenameTarget] = useState<number | null>(null);
  const [newFolderDialog, setNewFolderDialog] = useState<{ parentId: number | null } | null>(null);
  const [newFolderInput, setNewFolderInput] = useState("");
  const [expBranches, setExpBranches] = useState<Set<number>>(new Set());
  const [leafSearchByGroup, setLeafSearchByGroup] = useState<Record<string, string>>({});
  const setLeafSearch = (groupId: string, q: string) => {
    setLeafSearchByGroup((m) => {
      if (q === "") { if (!(groupId in m)) return m; const next = { ...m }; delete next[groupId]; return next; }
      return { ...m, [groupId]: q };
    });
  };
  const [sysSearches, setSysSearches] = useState<Record<string, string>>({});
  const [sysResults, setSysResults] = useState<Record<string, string[]>>({});
  const [sysTotals, setSysTotals] = useState<Record<string, number>>({});
  const [tagDbCache, setTagDbCache] = useState<Record<string, TagDto[]>>({});

  const addGroupToTarget = useSidebarPromptStore((s) => s.addGroupToTarget);
  const toggleTag = useSidebarPromptStore((s) => s.toggleTag);
  const addSystemTag = useSidebarPromptStore((s) => s.addSystemTag);
  const removeSystemTag = useSidebarPromptStore((s) => s.removeSystemTag);
  const sidebarTargets = useSidebarPromptStore((s) => s.targets[targetId]);

  const useSystemTree = showSystem && systemTree != null;
  const folderTree = useMemo(() => buildFolderTree(folders, groups), [folders, groups]);

  const toggleFolder = (id: number) => setExpFolders((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const togGroup = (id: string) => setExpGroups((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleBranch = (id: number) => setExpBranches((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const handleExpandGroup = async (gr: PromptGroupDto) => {
    togGroup(gr.id);
    if (expGroups.has(gr.id)) { setLeafSearch(gr.id, ""); return; }
    if (gr.id.startsWith("tagdb-") && !(gr.id in tagDbCache)) {
      const realId = Number(gr.id.slice("tagdb-".length));
      try { const tags = await ipc.listTagGroupTags(realId, 1000); setTagDbCache((c) => ({ ...c, [gr.id]: tags })); } catch {/**/}
      return;
    }
    if (gr.isSystem && gr.category != null && !(gr.id in sysTotals)) {
      try { const r = await ipc.listSystemGroupTags(gr.category, undefined, 0, 0); setSysTotals((p) => ({ ...p, [gr.id]: r.totalCount })); } catch {/**/}
    }
  };

  const doSysSearch = async (gid: string, cat: number, q: string) => {
    setSysSearches((p) => ({ ...p, [gid]: q }));
    if (!q.trim()) { setSysResults((p) => ({ ...p, [gid]: [] })); return; }
    try { const r = await ipc.listSystemGroupTags(cat, q, 0, 20); setSysResults((p) => ({ ...p, [gid]: r.tags.map((tt) => tt.name) })); }
    catch { setSysResults((p) => ({ ...p, [gid]: [] })); }
  };

  const isEnabled = (gid: string, tid: string) => sidebarTargets?.groups.find((g) => g.groupId === gid)?.tags.find((tt) => tt.tagId === tid)?.enabled ?? false;
  const isSysAdded = (gid: string, name: string) => sidebarTargets?.groups.find((g) => g.groupId === gid)?.tags.some((tt) => tt.tag === name) ?? false;
  const clickEntry = (gr: PromptGroupDto, tid: string) => {
    if (!existingGroupIds.includes(gr.id)) { addGroupToTarget(targetId, gr); setTimeout(() => toggleTag(targetId, gr.id, tid), 0); }
    else toggleTag(targetId, gr.id, tid);
  };
  const clickSysTag = (gr: PromptGroupDto, name: string) => {
    if (!existingGroupIds.includes(gr.id)) { addGroupToTarget(targetId, gr); setTimeout(() => addSystemTag(targetId, gr.id, { name, category: gr.category! }), 0); }
    else { const ex = sidebarTargets?.groups.find((g) => g.groupId === gr.id)?.tags.find((tt) => tt.tag === name); if (ex) removeSystemTag(targetId, gr.id, ex.tagId); else addSystemTag(targetId, gr.id, { name, category: gr.category! }); }
  };

  const handleNewSubfolder = (parentId: number) => { setNewFolderInput(""); setNewFolderDialog({ parentId }); };
  const submitNewFolder = async () => {
    if (!newFolderDialog) return; const title = newFolderInput.trim(); if (!title) return;
    try { await onCreateFolder(newFolderDialog.parentId, title); if (newFolderDialog.parentId != null) setExpFolders((s) => new Set(s).add(newFolderDialog.parentId!)); } catch {/**/}
    setNewFolderDialog(null); setNewFolderInput("");
  };

  const renderGroupCard = (gr: PromptGroupDto): React.ReactNode => {
    const isAdded = existingGroupIds.includes(gr.id);
    const isOpen = expGroups.has(gr.id);
    const ec = sidebarTargets?.groups.find((g) => g.groupId === gr.id)?.tags.filter((tt) => tt.enabled).length ?? 0;
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="flex items-center py-1 leading-4 gap-0.5 text-xs">
            <button type="button" className="shrink-0 w-4 h-4 flex items-center justify-center" onClick={() => handleExpandGroup(gr)}>
              <ChevronRight className={`h-2.5 w-2.5 transition-transform ${isOpen ? "rotate-90" : ""}`} />
            </button>
            <button type="button" className="flex items-center min-w-0 hover:text-foreground" onClick={() => handleExpandGroup(gr)}>
              <span className={`truncate ${isAdded && ec > 0 ? "font-semibold text-primary" : ""}`}>{gr.name}</span>
            </button>
            <span className="ml-1 shrink-0 text-[9px] text-muted-foreground/60 tabular-nums">{gr.tags.length}</span>
            <button type="button" className={`ml-0.5 shrink-0 rounded p-0.5 transition-colors ${isAdded ? "text-primary hover:bg-destructive/10 hover:text-destructive" : "text-muted-foreground hover:bg-primary/10 hover:text-primary"}`} onClick={() => onToggleSidebar(gr)}>
              {isAdded ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            </button>
            {isOpen && <HoverSearch value={leafSearchByGroup[gr.id] ?? ""} onChange={(q) => setLeafSearch(gr.id, q)} className="shrink-0 ml-0.5" />}
            {isAdded && ec > 0 && <Badge variant="default" className="text-[7px] px-1 py-0 shrink-0 ml-0.5">{ec}</Badge>}
            <span className="flex-1" />
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="min-w-[7rem] p-0.5 text-[11px]">
          <ContextMenuItem className="text-[11px] py-1 px-2" onClick={() => onEdit(gr)}>{t("common.edit")}</ContextMenuItem>
          <ContextMenuItem className="text-[11px] py-1 px-2 text-destructive" onClick={() => onDelete(gr.id)}>{t("common.delete")}</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  const renderSysSearchRow = (gr: PromptGroupDto): React.ReactNode => (
    <div className="ml-6 border-l border-border pl-2 py-0.5">
      <div className="space-y-0.5 mb-1">
        {gr.id in sysTotals && <span className="text-[8px] text-muted-foreground">{sysTotals[gr.id].toLocaleString()} tags</span>}
        <div className="flex items-center gap-1">
          <Search className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
          <input value={sysSearches[gr.id] ?? ""} onChange={(e) => doSysSearch(gr.id, gr.category!, e.target.value)} placeholder="..." className="h-5 w-full bg-transparent text-[10px] outline-none placeholder:text-muted-foreground/40" />
        </div>
        <div className="flex flex-wrap gap-0.5 pt-0.5">
          {(sysResults[gr.id] ?? []).map((n) => {
            const added = isSysAdded(gr.id, n);
            return <Badge key={`st-${gr.id}-${n}`} variant={added ? "default" : "outline"} className="cursor-pointer text-[9px] px-1 py-0 select-none transition-colors" onClick={() => clickSysTag(gr, n)}>{n}</Badge>;
          })}
        </div>
      </div>
    </div>
  );

  const renderExpandedGroupChildren = (gr: PromptGroupDto): React.ReactNode => {
    if (!expGroups.has(gr.id)) return null;
    if (gr.isSystem && gr.category != null) return renderSysSearchRow(gr);
    const q = (leafSearchByGroup[gr.id] ?? "").trim().toLowerCase();
    const visible = q ? gr.tags.filter((tg) => (tg.name || tg.tag).toLowerCase().includes(q)) : gr.tags;
    return (
      <div className="ml-6 border-l border-border pl-2 py-0.5 flex flex-wrap gap-0.5 items-center">
        {visible.map((tg) => {
          const en = isEnabled(gr.id, tg.id);
          return (
            <ContextMenu key={`e-${tg.id}`}>
              <ContextMenuTrigger asChild>
                <Badge variant={en ? "default" : "outline"} className="cursor-pointer text-[9px] px-1 py-0 select-none transition-colors" onClick={() => clickEntry(gr, tg.id)}>{tg.name || tg.tag}</Badge>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => onEditEntry(gr.id, tg.id)}>{t("common.edit")}</ContextMenuItem>
                <ContextMenuItem className="text-destructive" onClick={() => onDeleteEntry(gr.id, tg.id)}>{t("common.delete")}</ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
      </div>
    );
  };

  const renderGroupCardWithChildren = (gr: PromptGroupDto): React.ReactNode => (<div>{renderGroupCard(gr)}{renderExpandedGroupChildren(gr)}</div>);

  const sysFlatRows = useMemo(() => {
    if (!showSystem || !systemTree) return [];
    return buildSysFlatRows(systemTree, expBranches, expGroups, tagDbCache, existingGroupIds, leafSearchByGroup);
  }, [showSystem, systemTree, expBranches, expGroups, tagDbCache, existingGroupIds, leafSearchByGroup]);

  return (
    <div className="space-y-2">
      <Input value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} placeholder={t("common.search")} className="h-7 w-full text-xs" />
      <div className="flex items-center gap-2">
        <Button size="sm" className="h-7 px-2 text-[11px]" onClick={onAdd} title={t("promptGroup.newGroup")}><Plus className="h-3 w-3 mr-1" />{t("promptGroup.newGroup")}</Button>
        <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => { setNewFolderInput(""); setNewFolderDialog({ parentId: null }); }} title={t("promptGroup.folder.newFolder")}><FolderPlus className="h-3 w-3 mr-1" />{t("promptGroup.folder.newFolder")}</Button>
        <div className="flex-1" />
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-muted-foreground" onClick={onOpenTagDb} title={t("tagDb.openBrowser")}><Database className="h-3.5 w-3.5 mr-1" />{t("tagDb.openBrowser")}</Button>
        <div className="flex items-center gap-1.5 pl-1 border-l border-border ml-0.5">
          <Switch id="show-system" checked={showSystem} onCheckedChange={onShowSystemChange} />
          <label htmlFor="show-system" className="text-[10px] text-muted-foreground cursor-pointer select-none">System</label>
        </div>
      </div>
      {useSystemTree ? (
        <SystemTreeView sysFlatRows={sysFlatRows} tagDbCache={tagDbCache} sidebarTargets={sidebarTargets}
          leafSearchByGroup={leafSearchByGroup} setLeafSearch={setLeafSearch}
          onToggleBranch={toggleBranch} onExpandGroup={handleExpandGroup} onToggleSidebar={onToggleSidebar}
          onToggleTag={toggleTag} onAddGroupToTarget={addGroupToTarget} targetId={targetId}
          onCreateFromTagDb={onCreateFromTagDb} onRemoveFromFavorites={onRemoveFromFavorites}
          onEditSystemGroupSettings={onEditSystemGroupSettings} />
      ) : (
        <div className="h-72 overflow-y-auto pr-3 text-xs">
          {folderTree.map((node) => (
            <FolderAccordionNode key={`f-${node.id}`} node={node} depth={0} isUncategorized={node.id === UNCATEGORIZED_FOLDER_ID}
              expanded={expFolders} toggleExpanded={toggleFolder} renameTarget={renameTarget} setRenameTarget={setRenameTarget}
              onCreateInFolder={onCreateInFolder} onCreateSubfolder={handleNewSubfolder} onRenameFolder={onRenameFolder} onDeleteFolder={onDeleteFolder}
              renderGroupCard={renderGroupCardWithChildren} />
          ))}
        </div>
      )}
      <Dialog open={newFolderDialog !== null} onOpenChange={(o) => { if (!o) { setNewFolderDialog(null); setNewFolderInput(""); } }}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle className="text-sm">{newFolderDialog?.parentId == null ? t("promptGroup.folder.newFolder") : t("promptGroup.folder.newSubfolder")}</DialogTitle></DialogHeader>
          <Input autoFocus value={newFolderInput} onChange={(e) => setNewFolderInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void submitNewFolder(); } }} placeholder={t("promptGroup.folder.newFolder")} className="h-8 text-xs" />
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => { setNewFolderDialog(null); setNewFolderInput(""); }}>{t("common.cancel")}</Button>
            <Button size="sm" disabled={!newFolderInput.trim()} onClick={() => void submitNewFolder()}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
