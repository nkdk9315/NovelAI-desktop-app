import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, FolderPlus, Plus } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { toastError } from "@/lib/toast-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePresetStore } from "@/stores/preset-store";
import { usePromptStore } from "@/stores/prompt-store";
import type { PromptPresetDto } from "@/types";
import * as ipc from "@/lib/ipc";
import PresetEditorModal from "./PresetEditorModal";
import ApplyPresetDialog from "./ApplyPresetDialog";
import SortablePresetChip from "./SortablePresetChip";
import { UNCATEGORIZED, buildTree, type FolderTreeNode } from "./preset-folder-tree";

export interface PresetModalSelectionMode { onSelectFolder: (folderId: number) => void }

interface Props {
  targetId: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectionMode?: PresetModalSelectionMode;
}

export default function PresetModalContent({ targetId, searchQuery, onSearchChange, selectionMode }: Props) {
  const { t } = useTranslation();
  const presets = usePresetStore((s) => s.presets);
  const presetFolders = usePresetStore((s) => s.presetFolders);
  const loadPresets = usePresetStore((s) => s.loadPresets);
  const loadPresetFolders = usePresetStore((s) => s.loadPresetFolders);
  const createPresetAction = usePresetStore((s) => s.createPreset);
  const updatePresetAction = usePresetStore((s) => s.updatePreset);
  const deletePresetAction = usePresetStore((s) => s.deletePreset);
  const reorderPresetsAction = usePresetStore((s) => s.reorderPresets);
  const createPresetFolderAction = usePresetStore((s) => s.createPresetFolder);
  const deletePresetFolderAction = usePresetStore((s) => s.deletePresetFolder);
  const genres = usePromptStore((s) => s.genres);

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const [expFolders, setExpFolders] = useState<Set<number>>(() => new Set([UNCATEGORIZED]));
  const [showEditor, setShowEditor] = useState(false);
  const [editingPreset, setEditingPreset] = useState<PromptPresetDto | null>(null);
  const [editorInitialFolderId, setEditorInitialFolderId] = useState<number | null>(null);
  const [applyingPreset, setApplyingPreset] = useState<PromptPresetDto | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [folderConfirm, setFolderConfirm] = useState<{ folderId: number; count: number } | null>(null);
  const [newFolderDialog, setNewFolderDialog] = useState<{ parentId: number | null } | null>(null);
  const [newFolderInput, setNewFolderInput] = useState("");
  const [renameDialog, setRenameDialog] = useState<{ folderId: number; title: string } | null>(null);
  useEffect(() => {
    loadPresets(searchQuery || undefined);
    loadPresetFolders().catch(() => {});
  }, [searchQuery, loadPresets, loadPresetFolders]);

  const tree = useMemo(() => buildTree(presetFolders, presets), [presetFolders, presets]);

  const toggleFolder = (id: number) => setExpFolders((s) => {
    const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n;
  });

  const handleSave = async (data: Parameters<typeof createPresetAction>[0]) => {
    try {
      if (editingPreset) {
        await updatePresetAction({ id: editingPreset.id, name: data.name, folderId: data.folderId, slots: data.slots });
        loadPresets(searchQuery || undefined);
      } else {
        await createPresetAction(data);
      }
    } catch (e) { toastError(String(e)); }
  };

  const handleDelete = async (id: string) => {
    try { await deletePresetAction(id); } catch (e) { toastError(String(e)); }
  };

  const submitNewFolder = async () => {
    if (!newFolderDialog) return;
    const title = newFolderInput.trim();
    if (!title) return;
    try {
      await createPresetFolderAction(title, newFolderDialog.parentId);
      if (newFolderDialog.parentId != null) setExpFolders((s) => new Set(s).add(newFolderDialog.parentId!));
    } catch (e) { toastError(String(e)); }
    setNewFolderDialog(null);
    setNewFolderInput("");
  };

  const renderPresetChip = (preset: PromptPresetDto) => (
    <SortablePresetChip
      key={preset.id}
      preset={preset}
      disabled={!!selectionMode}
      onApply={() => { if (!selectionMode) setApplyingPreset(preset); }}
      onEdit={() => { setEditingPreset(preset); setShowEditor(true); }}
      onDelete={() => setDeleteConfirm(preset.id)}
      editLabel={t("common.edit")}
      deleteLabel={t("common.delete")}
    />
  );

  const handlePresetDragEnd = async (
    event: DragEndEvent,
    folderId: number | null,
    presetsInFolder: PromptPresetDto[],
  ) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = presetsInFolder.map((p) => p.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const orderedIds = arrayMove(ids, oldIndex, newIndex);
    try {
      await reorderPresetsAction({ folderId, orderedIds });
    } catch (e) {
      toastError(String(e));
    }
  };

  const renderFolderNode = (node: FolderTreeNode, depth: number): React.ReactNode => {
    const isUncat = node.id === UNCATEGORIZED;
    const isOpen = expFolders.has(node.id);
    const title = isUncat ? t("preset.folder.uncategorized") : node.title;
    const total = node.presets.length + node.children.reduce((a, c) => a + c.presets.length, 0);

    const canSelectFolder = !!selectionMode && !isUncat;

    return (
      <div key={`pf-${node.id}`}>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div className="flex w-full items-center gap-0.5 rounded hover:bg-accent/30 transition-colors"
              style={{ paddingLeft: `${depth * 12 + 4}px` }}>
              <button type="button"
                className="flex flex-1 min-w-0 items-center gap-0.5 px-1 py-1 text-xs"
                onClick={() => toggleFolder(node.id)}>
                <ChevronRight className={`h-2.5 w-2.5 shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                <span className="truncate text-muted-foreground">{title}</span>
                {total > 0 && <span className="ml-1 text-[9px] text-muted-foreground/50">{total}</span>}
              </button>
              {canSelectFolder && (
                <button type="button"
                  onClick={(e) => { e.stopPropagation(); selectionMode!.onSelectFolder(node.id); }}
                  className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/10 mr-1">
                  {t("common.select")}
                </button>
              )}
            </div>
          </ContextMenuTrigger>
          {!isUncat && (
            <ContextMenuContent className="min-w-[9rem] p-0.5 text-[11px]">
              <ContextMenuItem className="text-[11px] py-1 px-2" onClick={() => { setEditorInitialFolderId(node.id); setEditingPreset(null); setShowEditor(true); }}>
                {t("preset.folder.createPresetHere")}
              </ContextMenuItem>
              <ContextMenuItem className="text-[11px] py-1 px-2" onClick={() => { setNewFolderInput(""); setNewFolderDialog({ parentId: node.id }); }}>
                {t("preset.folder.newSubfolder")}
              </ContextMenuItem>
              <ContextMenuItem className="text-[11px] py-1 px-2" onClick={() => setRenameDialog({ folderId: node.id, title: node.title })}>
                {t("preset.folder.rename")}
              </ContextMenuItem>
              <ContextMenuItem className="text-[11px] py-1 px-2 text-destructive"
                onClick={async () => { try { const count = await ipc.countPresetsInFolder(node.id); setFolderConfirm({ folderId: node.id, count }); } catch (e) { toastError(String(e)); } }}>
                {t("preset.folder.delete")}
              </ContextMenuItem>
            </ContextMenuContent>
          )}
        </ContextMenu>
        {isOpen && (
          <div>
            {node.presets.length > 0 && (
              <div
                className="flex flex-wrap items-center gap-1 py-0.5"
                style={{ paddingLeft: `${(depth + 1) * 12 + 4}px` }}
              >
                <DndContext
                  sensors={dndSensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(e) => handlePresetDragEnd(e, isUncat ? null : node.id, node.presets)}
                >
                  <SortableContext items={node.presets.map((p) => p.id)} strategy={rectSortingStrategy}>
                    {node.presets.map(renderPresetChip)}
                  </SortableContext>
                </DndContext>
              </div>
            )}
            {node.children.map((child) => renderFolderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="space-y-2">
        <Input value={searchQuery} onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("common.search")} className="h-7 w-full text-xs" />
        <div className="flex items-center gap-2">
          <Button size="sm" className="h-7 px-2 text-[11px]" onClick={() => { setEditingPreset(null); setEditorInitialFolderId(null); setShowEditor(true); }}>
            <Plus className="h-3 w-3 mr-1" />{t("preset.create")}
          </Button>
          <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => { setNewFolderInput(""); setNewFolderDialog({ parentId: null }); }}>
            <FolderPlus className="h-3 w-3 mr-1" />{t("preset.folder.newFolder")}
          </Button>
        </div>
        <div className="h-72 overflow-y-auto pr-3 text-xs">
          {tree.length === 0 && (
            <div className="flex items-center justify-center h-full text-muted-foreground text-xs">{t("preset.noPresets")}</div>
          )}
          {tree.map((node) => renderFolderNode(node, 0))}
        </div>
      </div>

      <PresetEditorModal open={showEditor} onOpenChange={(o) => { if (!o) { setShowEditor(false); setEditingPreset(null); setEditorInitialFolderId(null); } }}
        preset={editingPreset} genres={genres} folders={presetFolders}
        initialFolderId={editorInitialFolderId} onSave={handleSave}
        contentClassName="max-w-md left-[8.5rem]! translate-x-0!" />

      <ApplyPresetDialog open={applyingPreset !== null} onOpenChange={(o) => { if (!o) setApplyingPreset(null); }}
        preset={applyingPreset} genres={genres} targetId={targetId} />

      <AlertDialog open={deleteConfirm !== null} onOpenChange={(o) => { if (!o) setDeleteConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t("common.delete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("preset.deleteConfirm")}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { if (deleteConfirm) await handleDelete(deleteConfirm); setDeleteConfirm(null); }}>{t("common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={folderConfirm !== null} onOpenChange={(o) => { if (!o) setFolderConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t("preset.folder.delete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("preset.folder.deleteConfirm", { count: folderConfirm?.count ?? 0 })}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { if (folderConfirm) { try { await deletePresetFolderAction(folderConfirm.folderId); } catch (e) { toastError(String(e)); } } setFolderConfirm(null); }}>{t("common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={newFolderDialog !== null} onOpenChange={(o) => { if (!o) { setNewFolderDialog(null); setNewFolderInput(""); } }}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle className="text-sm">{newFolderDialog?.parentId == null ? t("preset.folder.newFolder") : t("preset.folder.newSubfolder")}</DialogTitle></DialogHeader>
          <Input autoFocus value={newFolderInput} onChange={(e) => setNewFolderInput(e.target.value)} // eslint-disable-line jsx-a11y/no-autofocus
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void submitNewFolder(); } }} placeholder={t("preset.folder.newFolder")} className="h-8 text-xs" />
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => { setNewFolderDialog(null); setNewFolderInput(""); }}>{t("common.cancel")}</Button>
            <Button size="sm" disabled={!newFolderInput.trim()} onClick={() => void submitNewFolder()}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameDialog !== null} onOpenChange={(o) => { if (!o) setRenameDialog(null); }}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle className="text-sm">{t("preset.folder.rename")}</DialogTitle></DialogHeader>
          <Input autoFocus value={renameDialog?.title ?? ""} // eslint-disable-line jsx-a11y/no-autofocus
            onChange={(e) => setRenameDialog((prev) => prev ? { ...prev, title: e.target.value } : prev)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const title = renameDialog?.title.trim(); if (title && renameDialog) { ipc.renamePresetFolder(renameDialog.folderId, title).then(() => loadPresetFolders()).catch((err) => toastError(String(err))); setRenameDialog(null); } } }}
            className="h-8 text-xs" />
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setRenameDialog(null)}>{t("common.cancel")}</Button>
            <Button size="sm" disabled={!renameDialog?.title.trim()}
              onClick={() => { const title = renameDialog?.title.trim(); if (title && renameDialog) { ipc.renamePresetFolder(renameDialog.folderId, title).then(() => loadPresetFolders()).catch((err) => toastError(String(err))); setRenameDialog(null); } }}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
