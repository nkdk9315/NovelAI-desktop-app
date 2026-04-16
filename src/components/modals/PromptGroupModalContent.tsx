import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toastError } from "@/lib/toast-error";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePromptStore } from "@/stores/prompt-store";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import type { PromptGroupDto, TagInput } from "@/types";
import type { SystemTreeNode } from "./prompt-group/PromptGroupGrid";
import * as ipc from "@/lib/ipc";
import PromptGroupGrid from "./prompt-group/PromptGroupGrid";
import PromptGroupAddModal from "./prompt-group/PromptGroupAddModal";
import PromptGroupEditModal from "./prompt-group/PromptGroupEditModal";
import SystemGroupSettingsModal from "./prompt-group/SystemGroupSettingsModal";
import SidebarEntryEditModal from "@/components/left-panel/SidebarEntryEditModal";
import TagDatabaseModal from "./tag-database/TagDatabaseModal";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Database, Info } from "lucide-react";

interface Props {
  targetId: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  showSystem: boolean;
  onShowSystemChange: (v: boolean) => void;
  systemTree: SystemTreeNode[] | null;
  setSystemTree: (t: SystemTreeNode[] | null | ((prev: SystemTreeNode[] | null) => SystemTreeNode[] | null)) => void;
  tagDbGenresLoading: boolean;
}

const EMPTY_GROUP_SHELL = (id: string, name: string): PromptGroupDto => ({
  id, name, folderId: null, defaultGenreIds: [], isSystem: true, usageType: "both",
  tags: [], createdAt: "", updatedAt: "", thumbnailPath: null, isDefault: false,
  category: null, defaultStrength: 0, randomMode: false, randomCount: 1, randomSource: "enabled", wildcardToken: null,
});

export default function PromptGroupModalContent(props: Props) {
  const { targetId, searchQuery, onSearchChange, showSystem, onShowSystemChange,
    systemTree, setSystemTree, tagDbGenresLoading } = props;
  const { t } = useTranslation();
  const genres = usePromptStore((s) => s.genres);
  const promptGroups = usePromptStore((s) => s.promptGroups);
  const promptGroupFolders = usePromptStore((s) => s.promptGroupFolders);
  const createPromptGroup = usePromptStore((s) => s.createPromptGroup);
  const updatePromptGroup = usePromptStore((s) => s.updatePromptGroup);
  const deletePromptGroupAction = usePromptStore((s) => s.deletePromptGroup);
  const createPromptGroupFolder = usePromptStore((s) => s.createPromptGroupFolder);
  const renamePromptGroupFolder = usePromptStore((s) => s.renamePromptGroupFolder);
  const deletePromptGroupFolderAction = usePromptStore((s) => s.deletePromptGroupFolder);
  const loadPromptGroups = usePromptStore((s) => s.loadPromptGroups);
  const addGroupToTarget = useSidebarPromptStore((s) => s.addGroupToTarget);
  const removeGroupFromTarget = useSidebarPromptStore((s) => s.removeGroupFromTarget);
  const target = useSidebarPromptStore((s) => s.targets[targetId]);
  const existingGroupIds = target?.groups.map((g) => g.groupId) ?? [];

  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalInitialFolderId, setAddModalInitialFolderId] = useState<number | null>(null);
  const [addModalInitialTags, setAddModalInitialTags] = useState<TagInput[] | null>(null);
  const [tagDbClearTick, setTagDbClearTick] = useState(0);
  const [editingGroup, setEditingGroup] = useState<PromptGroupDto | null>(null);
  const [editingSystemGroup, setEditingSystemGroup] = useState<PromptGroupDto | null>(null);
  const [editingEntry, setEditingEntry] = useState<{ groupId: string; tagId: string; name: string; tag: string; negativePrompt: string } | null>(null);
  const [showTagDb, setShowTagDb] = useState(false);
  const [folderConfirm, setFolderConfirm] = useState<{ folderId: number; count: number } | null>(null);

  useEffect(() => { if (!showTagDb) setSystemTree(null); }, [showTagDb, setSystemTree]);

  const displayedGroups = useMemo(() => (showSystem ? [] : promptGroups.filter((g) => !g.isSystem)), [showSystem, promptGroups]);

  const handleToggleSidebar = async (group: PromptGroupDto) => {
    if (existingGroupIds.includes(group.id)) { removeGroupFromTarget(targetId, group.id); return; }
    if (group.id.startsWith("tagdb-parent-")) return;
    if (group.id.startsWith("tagdb-")) {
      const realId = Number(group.id.slice("tagdb-".length));
      try {
        const tags = await ipc.listTagGroupTags(realId, 1000);
        addGroupToTarget(targetId, { ...group, tags: tags.map((td, i) => ({ id: `tagdb-tag-${td.id}`, name: td.name, tag: td.name, negativePrompt: "", sortOrder: i, defaultStrength: 0, thumbnailPath: null })) });
      } catch (e) { toastError(`${t("tagDb.loadFailed")}: ${String(e)}`); }
      return;
    }
    addGroupToTarget(targetId, group);
  };

  const handleAdd = async (data: { name: string; folderId: number | null; defaultGenreIds: string[]; tags: TagInput[]; isDefault: boolean; defaultStrength: number }) => {
    try {
      const group = await createPromptGroup({ name: data.name, folderId: data.folderId, defaultGenreIds: data.defaultGenreIds, tags: data.tags, defaultStrength: data.defaultStrength });
      if (data.isDefault) await updatePromptGroup({ id: group.id, isDefault: true });
      loadPromptGroups(searchQuery || undefined);
      if (addModalInitialTags != null) setTagDbClearTick((n) => n + 1);
    } catch (e) { toastError(String(e)); }
  };

  const handleEdit = async (data: { id: string; name: string; folderId: number | null; defaultGenreIds: string[]; tags: TagInput[]; isDefault: boolean; defaultStrength: number }) => {
    try { await updatePromptGroup({ id: data.id, name: data.name, folderId: data.folderId, defaultGenreIds: data.defaultGenreIds, tags: data.tags, isDefault: data.isDefault, defaultStrength: data.defaultStrength }); loadPromptGroups(searchQuery || undefined); }
    catch (e) { toastError(String(e)); }
  };

  const handleDelete = async (id: string) => {
    try { await deletePromptGroupAction(id); removeGroupFromTarget(targetId, id); loadPromptGroups(searchQuery || undefined); } catch (e) { toastError(String(e)); }
  };

  const handleEditEntry = async (groupId: string, tagId: string) => {
    try { const dto = await ipc.getPromptGroup(groupId); const tag = dto.tags.find((x) => x.id === tagId); if (!tag) return; setEditingEntry({ groupId, tagId, name: tag.name || "", tag: tag.tag, negativePrompt: tag.negativePrompt || "" }); } catch (e) { toastError(String(e)); }
  };

  const handleSaveEntry = async (name: string, tag: string, negativePrompt: string) => {
    if (!editingEntry) return;
    try {
      const dto = await ipc.getPromptGroup(editingEntry.groupId);
      const tags: TagInput[] = dto.tags.map((tg) => tg.id === editingEntry.tagId ? { name, tag, negativePrompt, defaultStrength: tg.defaultStrength, thumbnailPath: tg.thumbnailPath ?? undefined } : { name: tg.name || undefined, tag: tg.tag, negativePrompt: tg.negativePrompt || undefined, defaultStrength: tg.defaultStrength, thumbnailPath: tg.thumbnailPath ?? undefined });
      await updatePromptGroup({ id: editingEntry.groupId, tags }); loadPromptGroups(searchQuery || undefined);
    } catch (e) { toastError(String(e)); }
  };

  const handleDeleteEntry = async (groupId: string, tagId: string) => {
    try {
      const dto = await ipc.getPromptGroup(groupId);
      const tags: TagInput[] = dto.tags.filter((tg) => tg.id !== tagId).map((tg) => ({ name: tg.name || undefined, tag: tg.tag, negativePrompt: tg.negativePrompt || undefined, defaultStrength: tg.defaultStrength, thumbnailPath: tg.thumbnailPath ?? undefined }));
      await updatePromptGroup({ id: groupId, tags }); loadPromptGroups(searchQuery || undefined);
    } catch (e) { toastError(String(e)); }
  };

  const handleCreateFromTagDb = (_title: string, tagNames: string[]) => {
    setAddModalInitialTags(tagNames.map((n) => ({ name: n, tag: n, defaultStrength: 0 }))); setShowAddModal(true);
  };

  const handleRemoveSystemFavorite = async (leafIds: number[]) => {
    if (leafIds.length === 0) return;
    try {
      await Promise.all(leafIds.map((id) => ipc.toggleTagGroupFavorite(id)));
      const removed = new Set(leafIds);
      setSystemTree((prev: SystemTreeNode[] | null) => prev ? pruneLeaves(prev, removed) : prev);
    } catch (e) { toastError(String(e)); }
  };

  return (
    <>
      {showSystem && (systemTree?.length ?? 0) > 0 && (
        <TooltipProvider><Tooltip><TooltipTrigger asChild>
          <button type="button" className="text-muted-foreground/60 hover:text-foreground outline-none" tabIndex={0} aria-label={t("promptGroup.systemFavoritesNotice")}><Info className="h-3.5 w-3.5" /></button>
        </TooltipTrigger><TooltipContent className="max-w-[14rem] text-[11px]">{t("promptGroup.systemFavoritesNotice")}</TooltipContent></Tooltip></TooltipProvider>
      )}

      <PromptGroupGrid genres={genres} groups={displayedGroups} folders={promptGroupFolders} systemTree={systemTree ?? undefined}
        searchQuery={searchQuery} showSystem={showSystem} existingGroupIds={existingGroupIds} targetId={targetId}
        onSearchChange={onSearchChange} onShowSystemChange={onShowSystemChange} onOpenTagDb={() => setShowTagDb(true)}
        onAdd={() => { setAddModalInitialFolderId(null); setShowAddModal(true); }}
        onCreateInFolder={(fid) => { setAddModalInitialFolderId(fid); setShowAddModal(true); }}
        onCreateFolder={async (p, title) => { try { await createPromptGroupFolder(title, p); } catch (e) { toastError(String(e)); } }}
        onRenameFolder={async (id, title) => { try { await renamePromptGroupFolder(id, title); } catch (e) { toastError(String(e)); } }}
        onDeleteFolder={async (fid) => { try { const count = await ipc.countGroupsInFolderSubtree(fid); setFolderConfirm({ folderId: fid, count }); } catch (e) { toastError(String(e)); } }}
        onToggleSidebar={handleToggleSidebar}
        onEdit={(gr) => gr.isSystem && gr.id.startsWith("system-group-cat-") ? setEditingSystemGroup(gr) : setEditingGroup(gr)}
        onDelete={handleDelete} onEditEntry={handleEditEntry} onDeleteEntry={handleDeleteEntry}
        onCreateFromTagDb={handleCreateFromTagDb} onRemoveFromFavorites={handleRemoveSystemFavorite}
        onEditSystemGroupSettings={(id, name) => setEditingSystemGroup(EMPTY_GROUP_SHELL(id, name))} />

      {showSystem && !tagDbGenresLoading && (systemTree?.length ?? 0) === 0 && (
        <div className="mt-4 flex flex-col items-center justify-center gap-3 rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
          <Info className="h-6 w-6 text-muted-foreground/60" /><p className="max-w-[20rem]">{t("promptGroup.systemFavoritesNotice")}</p>
          <Button type="button" size="sm" variant="outline" onClick={() => setShowTagDb(true)}><Database className="h-4 w-4 mr-1" />{t("tagDb.openBrowser")}</Button>
        </div>
      )}

      <PromptGroupAddModal open={showAddModal} onOpenChange={(o) => { setShowAddModal(o); if (!o) { setAddModalInitialTags(null); setAddModalInitialFolderId(null); } }}
        genres={genres} folders={promptGroupFolders} createFolder={createPromptGroupFolder} onSave={handleAdd}
        initialTags={addModalInitialTags ?? undefined} initialFolderId={addModalInitialFolderId} contentClassName="max-w-md left-[8.5rem]! translate-x-0!" />
      <PromptGroupEditModal open={editingGroup !== null} onOpenChange={(o) => { if (!o) setEditingGroup(null); }} group={editingGroup} genres={genres}
        folders={promptGroupFolders} createFolder={createPromptGroupFolder} onSave={handleEdit} onDelete={handleDelete} contentClassName="max-w-md left-[8.5rem]! translate-x-0!" />
      <AlertDialog open={folderConfirm !== null} onOpenChange={(o) => { if (!o) setFolderConfirm(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("promptGroup.folder.delete")}</AlertDialogTitle>
          <AlertDialogDescription>{t("promptGroup.folder.deleteConfirm", { count: folderConfirm?.count ?? 0 })}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { if (!folderConfirm) return; try { await deletePromptGroupFolderAction(folderConfirm.folderId); } catch (e) { toastError(String(e)); } finally { setFolderConfirm(null); } }}>{t("common.delete")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <SidebarEntryEditModal open={editingEntry !== null} onOpenChange={(o) => { if (!o) setEditingEntry(null); }} initialName={editingEntry?.name ?? ""} initialTag={editingEntry?.tag ?? ""} initialNegative={editingEntry?.negativePrompt ?? ""} onSave={handleSaveEntry} />
      <SystemGroupSettingsModal open={editingSystemGroup !== null} onOpenChange={(o) => { if (!o) setEditingSystemGroup(null); }}
        systemGroupId={editingSystemGroup?.id ?? null} systemGroupName={editingSystemGroup?.name ?? ""} genres={genres} contentClassName="max-w-md left-[8.5rem]! translate-x-0!" />
      <TagDatabaseModal open={showTagDb} onOpenChange={setShowTagDb}
        onCreateGroupFromSelection={(names) => { setAddModalInitialTags(names.map((n) => ({ name: n, tag: n, defaultStrength: 0 }))); setShowAddModal(true); }}
        clearSelectionTrigger={tagDbClearTick} />
    </>
  );
}

function pruneLeaves(nodes: SystemTreeNode[], removed: Set<number>): SystemTreeNode[] {
  const out: SystemTreeNode[] = [];
  for (const n of nodes) {
    if (n.kind === "leaf") { if (!removed.has(n.id)) out.push(n); continue; }
    const children = pruneLeaves(n.children, removed);
    if (children.length === 0) continue;
    out.push({ ...n, children, leafCount: children.reduce((acc, c) => acc + (c.kind === "leaf" ? 1 : c.leafCount), 0) });
  }
  return out;
}
