import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { toastError } from "@/lib/toast-error";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useProjectStore } from "@/stores/project-store";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { MODEL_TO_VIBE_KEY } from "@/lib/constants";
import type { AssetFolderDto, VibeDto } from "@/types";
import * as ipc from "@/lib/ipc";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import VibeImportDialog from "./VibeImportDialog";
import VibeEncodeDialog from "./VibeEncodeDialog";
import FolderTreePane, { type FolderSelection } from "./shared/FolderTreePane";
import FolderPickerDialog from "./shared/FolderPickerDialog";
import VibeModalGrid from "./VibeModalGrid";

interface VibeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVibesChanged: () => void;
}

export default function VibeModal({ open, onOpenChange, onVibesChanged }: VibeModalProps) {
  const { t } = useTranslation();
  const currentProject = useProjectStore((s) => s.currentProject);
  const [vibes, setVibes] = useState<VibeDto[]>([]);
  const [projectVibeIds, setProjectVibeIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<VibeDto | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [importFilePath, setImportFilePath] = useState<string | null>(null);
  const [encodeOpen, setEncodeOpen] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const currentModel = useGenerationParamsStore((s) => s.model);
  const addVibeToSidebar = useGenerationParamsStore((s) => s.addVibe);
  const removeVibeFromSidebar = useGenerationParamsStore((s) => s.removeVibe);
  const currentVibeKey = MODEL_TO_VIBE_KEY[currentModel] ?? null;
  const [filterModel, setFilterModel] = useState<string | null>(currentVibeKey);
  const [folderRoots, setFolderRoots] = useState<AssetFolderDto[]>([]);
  const [folderCounts, setFolderCounts] = useState<Record<string, number>>({});
  const [selectedFolder, setSelectedFolder] = useState<FolderSelection>("all");
  const [treeRefreshKey, setTreeRefreshKey] = useState(0);
  const [moveTarget, setMoveTarget] = useState<VibeDto | null>(null);
  const [folderDeleteTarget, setFolderDeleteTarget] = useState<AssetFolderDto | null>(null);
  const [childFoldersOfSelected, setChildFoldersOfSelected] = useState<AssetFolderDto[]>([]);

  useEffect(() => { if (open) setFilterModel(currentVibeKey); }, [open, currentVibeKey]);

  const loadVibes = useCallback(async () => {
    try {
      const [list, roots, counts] = await Promise.all([ipc.listVibes(), ipc.listVibeFolderRoots(), ipc.countVibesPerFolder()]);
      setVibes(list); setFolderRoots(roots);
      const map: Record<string, number> = { all: list.length };
      for (const row of counts) { if (row.id === -1) map.unclassified = row.count; else map[String(row.id)] = row.count; }
      setFolderCounts(map);
      if (currentProject) { const pvs = await ipc.listProjectVibesAll(currentProject.id); setProjectVibeIds(new Set(pvs.map((pv) => pv.vibeId))); }
    } catch (e) { toastError(String(e)); }
  }, [currentProject]);

  useEffect(() => { if (open) loadVibes(); }, [open, loadVibes]);
  useEffect(() => {
    if (typeof selectedFolder !== "number") { setChildFoldersOfSelected([]); return; }
    let cancelled = false;
    ipc.listVibeFolderChildren(selectedFolder).then((kids) => { if (!cancelled) setChildFoldersOfSelected(kids); }).catch(() => { if (!cancelled) setChildFoldersOfSelected([]); });
    return () => { cancelled = true; };
  }, [selectedFolder, treeRefreshKey, folderRoots]);

  const refresh = async () => { await loadVibes(); onVibesChanged(); };
  const handleCreateFolder = async (parentId: number | null, title: string) => { try { await ipc.createVibeFolder(parentId, title); await loadVibes(); setTreeRefreshKey((k) => k + 1); } catch (e) { toastError(String(e)); } };
  const handleRenameFolder = async (folderId: number, title: string) => { try { await ipc.renameVibeFolder(folderId, title); await loadVibes(); setTreeRefreshKey((k) => k + 1); } catch (e) { toastError(String(e)); } };
  const confirmDeleteFolder = async () => { if (!folderDeleteTarget) return; try { await ipc.deleteVibeFolder(folderDeleteTarget.id); if (selectedFolder === folderDeleteTarget.id) setSelectedFolder("all"); setFolderDeleteTarget(null); await loadVibes(); setTreeRefreshKey((k) => k + 1); onVibesChanged(); } catch (e) { toastError(String(e)); } };
  const handlePickFolder = async (folderId: number | null) => { if (!moveTarget) return; try { await ipc.setVibeFolder(moveTarget.id, folderId); setMoveTarget(null); await loadVibes(); } catch (e) { toastError(String(e)); } };
  const handleImportClick = async () => { try { const { open: openDialog } = await import("@tauri-apps/plugin-dialog"); const selected = await openDialog({ multiple: false, filters: [{ name: "Vibe", extensions: ["naiv4vibe"] }] }); if (selected) setImportFilePath(selected as string); } catch (e) { toastError(String(e)); } };
  const handleDelete = async () => { if (!deleteTarget) return; try { await ipc.deleteVibe(deleteTarget.id); setDeleteTarget(null); await refresh(); } catch (e) { toastError(String(e)); } };
  const handleSaveEdit = async (id: string) => { if (!editName.trim()) return; try { await ipc.updateVibeName({ id, name: editName.trim() }); setEditingId(null); await refresh(); } catch (e) { toastError(String(e)); } };
  const handleChangeThumbnail = async (vibeId: string) => { try { const { open: openDialog } = await import("@tauri-apps/plugin-dialog"); const selected = await openDialog({ multiple: false, filters: [{ name: "Image", extensions: ["png", "jpg", "jpeg", "webp"] }] }); if (selected) { await ipc.updateVibeThumbnail({ id: vibeId, thumbnailPath: selected as string }); await refresh(); } } catch (e) { toastError(String(e)); } };
  const handleToggleSidebar = async (vibe: VibeDto) => { if (!currentProject) return; try { if (projectVibeIds.has(vibe.id)) { await ipc.removeVibeFromProject(currentProject.id, vibe.id); removeVibeFromSidebar(vibe.id); } else { if (currentVibeKey && vibe.model !== currentVibeKey) { toast.error(t("vibe.modelMismatch")); return; } await ipc.addVibeToProject(currentProject.id, vibe.id); addVibeToSidebar(vibe.id); const scroll = () => { const el = document.getElementById("left-sidebar"); if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }); }; setTimeout(scroll, 100); setTimeout(scroll, 400); setTimeout(scroll, 800); } await refresh(); } catch (e) { toastError(String(e)); } };
  const handleClearThumbnail = async (vibeId: string) => { try { await ipc.clearVibeThumbnail(vibeId); await refresh(); } catch (e) { toastError(String(e)); } };
  const handleToggleFavorite = async (vibeId: string) => { try { await ipc.toggleVibeFavorite(vibeId); await loadVibes(); } catch (e) { toastError(String(e)); } };
  const handleExport = async (vibe: VibeDto) => { try { const { save } = await import("@tauri-apps/plugin-dialog"); const dest = await save({ defaultPath: `${vibe.name}.naiv4vibe`, filters: [{ name: "Vibe", extensions: ["naiv4vibe"] }] }); if (dest) await ipc.exportVibe(vibe.id, dest); } catch (e) { toastError(String(e)); } };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="fixed left-[336px] right-4 translate-x-0 w-auto max-w-none h-[min(760px,88vh)] overflow-hidden flex flex-col sm:max-w-none">
          <DialogHeader className="shrink-0"><DialogTitle>{t("vibe.manage")}</DialogTitle></DialogHeader>
          <div className="flex min-h-0 flex-1 gap-4">
            <aside className="flex w-56 shrink-0 min-h-0 flex-col border-r border-border pr-3">
              <FolderTreePane roots={folderRoots} loadChildren={ipc.listVibeFolderChildren} selected={selectedFolder} onSelect={setSelectedFolder}
                onCreate={handleCreateFolder} onRename={handleRenameFolder} onRequestDelete={setFolderDeleteTarget} itemCounts={folderCounts} refreshKey={treeRefreshKey} />
            </aside>
            <VibeModalGrid vibes={vibes} projectVibeIds={projectVibeIds} filterModel={filterModel} onFilterModelChange={setFilterModel}
              showFavoritesOnly={showFavoritesOnly} onShowFavoritesOnlyChange={setShowFavoritesOnly} searchQuery={searchQuery} onSearchQueryChange={setSearchQuery}
              selectedFolder={selectedFolder} childFoldersOfSelected={childFoldersOfSelected} folderCounts={folderCounts}
              onSelectFolder={(id) => setSelectedFolder(id)} onFolderDeleteRequest={setFolderDeleteTarget}
              editingId={editingId} editName={editName} onEditNameChange={setEditName}
              onStartEdit={(vibe) => { setEditingId(vibe.id); setEditName(vibe.name); }} onSaveEdit={handleSaveEdit} onCancelEdit={() => setEditingId(null)}
              onChangeThumbnail={handleChangeThumbnail} onClearThumbnail={handleClearThumbnail}
              onToggleSidebar={handleToggleSidebar} onToggleFavorite={handleToggleFavorite} onExport={handleExport}
              onDelete={setDeleteTarget} onMoveToFolder={setMoveTarget} onImportClick={handleImportClick} onEncodeClick={() => setEncodeOpen(true)} />
          </div>
        </DialogContent>
      </Dialog>
      <FolderPickerDialog open={!!moveTarget} onOpenChange={(o) => { if (!o) setMoveTarget(null); }}
        loadRoots={ipc.listVibeFolderRoots} loadChildren={ipc.listVibeFolderChildren} initial={moveTarget?.folderId ?? null} onPick={handlePickFolder} />
      <DeleteConfirmDialog open={!!folderDeleteTarget} onOpenChange={(o) => !o && setFolderDeleteTarget(null)} onConfirm={confirmDeleteFolder}
        title={t("folder.deleteConfirmTitle")} description={folderDeleteTarget ? t("folder.deleteConfirmDesc", { name: folderDeleteTarget.title }) : undefined} />
      <DeleteConfirmDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)} onConfirm={handleDelete} title={t("vibe.deleteConfirm")} description={deleteTarget?.name} />
      {importFilePath && <VibeImportDialog open={true} onOpenChange={(o) => { if (!o) setImportFilePath(null); }} filePath={importFilePath} onImported={refresh} />}
      <VibeEncodeDialog open={encodeOpen} onOpenChange={setEncodeOpen} onEncoded={refresh} />
    </>
  );
}
