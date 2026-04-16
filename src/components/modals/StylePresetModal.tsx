import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Search, Star } from "lucide-react";
import { toastError } from "@/lib/toast-error";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import type { AssetFolderDto, StylePresetDto, VibeDto } from "@/types";
import * as ipc from "@/lib/ipc";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import StylePresetEditorModal from "./StylePresetEditorModal";
import FolderTreePane, { type FolderSelection } from "./shared/FolderTreePane";
import FolderPickerDialog from "./shared/FolderPickerDialog";
import FolderCard from "./shared/FolderCard";
import PresetCard from "./StylePresetCard";

interface StylePresetModalProps { open: boolean; onOpenChange: (open: boolean) => void; onPresetsChanged: () => void; }

export default function StylePresetModal({ open, onOpenChange, onPresetsChanged }: StylePresetModalProps) {
  const { t } = useTranslation();
  const [presets, setPresets] = useState<StylePresetDto[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<StylePresetDto | null>(null);
  const [editorPreset, setEditorPreset] = useState<StylePresetDto | null | undefined>(undefined);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const currentModel = useGenerationParamsStore((s) => s.model);
  const [filterModel, setFilterModel] = useState<string | null>(currentModel);
  const sidebarPresets = useGenerationParamsStore((s) => s.sidebarPresets);
  const sidebarPresetIds = sidebarPresets.map((p) => p.id);
  useEffect(() => { if (open) setFilterModel(currentModel); }, [open, currentModel]);
  const addSidebarPreset = useGenerationParamsStore((s) => s.addSidebarPreset);
  const removeSidebarPreset = useGenerationParamsStore((s) => s.removeSidebarPreset);
  const [vibes, setVibes] = useState<VibeDto[]>([]);
  const [folderRoots, setFolderRoots] = useState<AssetFolderDto[]>([]);
  const [folderCounts, setFolderCounts] = useState<Record<string, number>>({});
  const [selectedFolder, setSelectedFolder] = useState<FolderSelection>("all");
  const [treeRefreshKey, setTreeRefreshKey] = useState(0);
  const [moveTarget, setMoveTarget] = useState<StylePresetDto | null>(null);
  const [folderDeleteTarget, setFolderDeleteTarget] = useState<AssetFolderDto | null>(null);
  const [childFoldersOfSelected, setChildFoldersOfSelected] = useState<AssetFolderDto[]>([]);

  const loadPresets = async () => {
    try {
      const [p, v, roots, counts] = await Promise.all([ipc.listStylePresets(), ipc.listVibes(), ipc.listStylePresetFolderRoots(), ipc.countStylePresetsPerFolder()]);
      setPresets(p); setVibes(v); setFolderRoots(roots);
      const map: Record<string, number> = { all: p.length };
      for (const row of counts) { if (row.id === -1) map.unclassified = row.count; else map[String(row.id)] = row.count; }
      setFolderCounts(map);
    } catch (e) { toastError(String(e)); }
  };
  const handleCreateFolder = async (parentId: number | null, title: string) => { try { await ipc.createStylePresetFolder(parentId, title); await loadPresets(); setTreeRefreshKey((k) => k + 1); } catch (e) { toastError(String(e)); } };
  const handleRenameFolder = async (folderId: number, title: string) => { try { await ipc.renameStylePresetFolder(folderId, title); await loadPresets(); setTreeRefreshKey((k) => k + 1); } catch (e) { toastError(String(e)); } };
  const confirmDeleteFolder = async () => { if (!folderDeleteTarget) return; try { await ipc.deleteStylePresetFolder(folderDeleteTarget.id); if (selectedFolder === folderDeleteTarget.id) setSelectedFolder("all"); setFolderDeleteTarget(null); await loadPresets(); setTreeRefreshKey((k) => k + 1); onPresetsChanged(); } catch (e) { toastError(String(e)); } };
  const handlePickFolder = async (folderId: number | null) => { if (!moveTarget) return; try { await ipc.setStylePresetFolder(moveTarget.id, folderId); setMoveTarget(null); await loadPresets(); onPresetsChanged(); } catch (e) { toastError(String(e)); } };
  useEffect(() => { if (open) loadPresets(); }, [open]);
  useEffect(() => {
    if (typeof selectedFolder !== "number") { setChildFoldersOfSelected([]); return; }
    let cancelled = false;
    ipc.listStylePresetFolderChildren(selectedFolder).then((kids) => { if (!cancelled) setChildFoldersOfSelected(kids); }).catch(() => { if (!cancelled) setChildFoldersOfSelected([]); });
    return () => { cancelled = true; };
  }, [selectedFolder, treeRefreshKey, folderRoots]);

  const modelOptions = useMemo(() => { const models = new Set(presets.map((p) => p.model)); return [...models].sort(); }, [presets]);
  const displayPresets = useMemo(() => {
    let list = presets;
    if (selectedFolder === "unclassified") list = list.filter((p) => p.folderId == null);
    else if (typeof selectedFolder === "number") list = list.filter((p) => p.folderId === selectedFolder);
    if (showFavoritesOnly) list = list.filter((p) => p.isFavorite);
    if (filterModel) list = list.filter((p) => p.model === filterModel);
    if (searchQuery.trim()) { const q = searchQuery.trim().toLowerCase(); list = list.filter((p) => p.name.toLowerCase().includes(q)); }
    return list;
  }, [presets, selectedFolder, showFavoritesOnly, filterModel, searchQuery]);

  const handleToggleFavorite = async (id: string) => { try { await ipc.togglePresetFavorite(id); await loadPresets(); } catch (e) { toastError(String(e)); } };
  const handleDelete = async () => { if (!deleteTarget) return; try { await ipc.deleteStylePreset(deleteTarget.id); setDeleteTarget(null); await loadPresets(); onPresetsChanged(); } catch (e) { toastError(String(e)); } };
  const handleEditorClose = async () => { setEditorPreset(undefined); await loadPresets(); onPresetsChanged(); };
  const handleToggleSidebar = (preset: StylePresetDto) => { if (sidebarPresetIds.includes(preset.id)) { removeSidebarPreset(preset.id); } else { if (preset.model !== currentModel) { toast.error(t("vibe.modelMismatch")); return; } addSidebarPreset(preset, vibes); } };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="fixed left-[336px] right-4 translate-x-0 w-auto max-w-none h-[min(760px,88vh)] overflow-hidden flex flex-col sm:max-w-none">
          <DialogHeader className="shrink-0"><DialogTitle>{t("style.manage")}</DialogTitle></DialogHeader>
          <div className="flex min-h-0 flex-1 gap-4">
            <aside className="flex w-56 shrink-0 min-h-0 flex-col border-r border-border pr-3">
              <FolderTreePane roots={folderRoots} loadChildren={ipc.listStylePresetFolderChildren} selected={selectedFolder} onSelect={setSelectedFolder}
                onCreate={handleCreateFolder} onRename={handleRenameFolder} onRequestDelete={setFolderDeleteTarget} itemCounts={folderCounts} refreshKey={treeRefreshKey} />
            </aside>
            <div className="flex min-w-0 min-h-0 flex-1 flex-col gap-2">
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" className="shrink-0 whitespace-nowrap" onClick={() => setEditorPreset(null)}><Plus className="mr-1 h-3 w-3" />{t("style.newPreset")}</Button>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center cursor-text" onMouseEnter={() => setShowSearch(true)}>
                  <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <input ref={(el) => { if (el && showSearch) el.focus(); }} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={() => { if (!searchQuery) setShowSearch(false); }} placeholder={t("common.search")}
                    className={`bg-transparent border-b border-transparent text-[10px] outline-none transition-all duration-200 ml-1 ${showSearch ? "w-28 border-muted-foreground/30 opacity-100" : "w-0 opacity-0 pointer-events-none"}`} />
                </div>
                <div className="flex-1" />
                <Button variant={showFavoritesOnly ? "default" : "ghost"} size="sm" className="h-7 w-7 p-0" onClick={() => setShowFavoritesOnly((v) => !v)} title={t("vibe.favoritesOnly")}>
                  <Star className={`h-3.5 w-3.5 ${showFavoritesOnly ? "fill-current" : ""}`} />
                </Button>
                {modelOptions.length > 1 && (
                  <Select value={filterModel ?? "__all__"} onValueChange={(v) => setFilterModel(v === "__all__" ? null : v)}>
                    <SelectTrigger className="h-7 w-auto min-w-[120px] text-[10px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__" className="text-xs">{t("vibe.allModels")}</SelectItem>
                      {modelOptions.map((m) => (<SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <ScrollArea className="min-h-0 flex-1">
                {displayPresets.length === 0 && childFoldersOfSelected.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">{t("style.noPresets")}</p>
                ) : (
                  <div className="grid gap-2 pr-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
                    {childFoldersOfSelected.map((f) => (<FolderCard key={`folder-${f.id}`} folder={f} itemCount={folderCounts[String(f.id)]} onClick={() => setSelectedFolder(f.id)} onRequestDelete={setFolderDeleteTarget} />))}
                    {displayPresets.map((preset) => (<PresetCard key={preset.id} preset={preset} isInSidebar={sidebarPresetIds.includes(preset.id)}
                      onToggleSidebar={() => handleToggleSidebar(preset)} onToggleFavorite={() => handleToggleFavorite(preset.id)}
                      onEdit={() => setEditorPreset(preset)} onDelete={() => setDeleteTarget(preset)} onMoveToFolder={() => setMoveTarget(preset)} />))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <FolderPickerDialog open={!!moveTarget} onOpenChange={(o) => { if (!o) setMoveTarget(null); }}
        loadRoots={ipc.listStylePresetFolderRoots} loadChildren={ipc.listStylePresetFolderChildren} initial={moveTarget?.folderId ?? null} onPick={handlePickFolder} />
      <DeleteConfirmDialog open={!!folderDeleteTarget} onOpenChange={(o) => !o && setFolderDeleteTarget(null)} onConfirm={confirmDeleteFolder}
        title={t("folder.deleteConfirmTitle")} description={folderDeleteTarget ? t("folder.deleteConfirmDesc", { name: folderDeleteTarget.title }) : undefined} />
      <DeleteConfirmDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)} onConfirm={handleDelete} title={t("style.deleteConfirm")} description={deleteTarget?.name} />
      {editorPreset !== undefined && <StylePresetEditorModal open={true} onOpenChange={(o) => { if (!o) handleEditorClose(); }} preset={editorPreset} />}
    </>
  );
}
