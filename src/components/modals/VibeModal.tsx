import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Search, Sparkles, Star } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/toast-error";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjectStore } from "@/stores/project-store";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { MODEL_TO_VIBE_KEY } from "@/lib/constants";
import type { VibeDto } from "@/types";
import * as ipc from "@/lib/ipc";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import VibeImportDialog from "./VibeImportDialog";
import VibeEncodeDialog from "./VibeEncodeDialog";
import VibeCard from "./VibeCard";

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
  const [showSearch, setShowSearch] = useState(false);
  const currentModel = useGenerationParamsStore((s) => s.model);
  const addVibeToSidebar = useGenerationParamsStore((s) => s.addVibe);
  const removeVibeFromSidebar = useGenerationParamsStore((s) => s.removeVibe);
  const currentVibeKey = MODEL_TO_VIBE_KEY[currentModel] ?? null;
  const [filterModel, setFilterModel] = useState<string | null>(currentVibeKey);

  // Reset filter to current model when modal opens
  useEffect(() => {
    if (open) setFilterModel(currentVibeKey);
  }, [open, currentVibeKey]);

  const loadVibes = useCallback(async () => {
    try {
      setVibes(await ipc.listVibes());
      if (currentProject) {
        const pvs = await ipc.listProjectVibesAll(currentProject.id);
        setProjectVibeIds(new Set(pvs.map((pv) => pv.vibeId)));
      }
    } catch (e) {
      toastError(String(e));
    }
  }, [currentProject]);

  useEffect(() => {
    if (open) loadVibes();
  }, [open, loadVibes]);

  const modelOptions = useMemo(() => {
    const models = new Set(vibes.map((v) => v.model));
    return [...models].sort();
  }, [vibes]);

  const displayVibes = useMemo(() => {
    let list = vibes;
    if (showFavoritesOnly) list = list.filter((v) => v.isFavorite);
    if (filterModel) list = list.filter((v) => v.model === filterModel);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((v) => v.name.toLowerCase().includes(q));
    }
    return list;
  }, [vibes, showFavoritesOnly, filterModel, searchQuery]);

  const handleImportClick = async () => {
    try {
      const { open: openDialog } = await import("@tauri-apps/plugin-dialog");
      const selected = await openDialog({
        multiple: false,
        filters: [{ name: "Vibe", extensions: ["naiv4vibe"] }],
      });
      if (selected) setImportFilePath(selected as string);
    } catch (e) {
      toastError(String(e));
    }
  };

  const refresh = async () => {
    await loadVibes();
    onVibesChanged();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await ipc.deleteVibe(deleteTarget.id); setDeleteTarget(null); await refresh(); }
    catch (e) { toastError(String(e)); }
  };

  const handleStartEdit = (vibe: VibeDto) => { setEditingId(vibe.id); setEditName(vibe.name); };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    try { await ipc.updateVibeName({ id, name: editName.trim() }); setEditingId(null); await refresh(); }
    catch (e) { toastError(String(e)); }
  };

  const handleChangeThumbnail = async (vibeId: string) => {
    try {
      const { open: openDialog } = await import("@tauri-apps/plugin-dialog");
      const selected = await openDialog({ multiple: false, filters: [{ name: "Image", extensions: ["png", "jpg", "jpeg", "webp"] }] });
      if (selected) { await ipc.updateVibeThumbnail({ id: vibeId, thumbnailPath: selected as string }); await refresh(); }
    } catch (e) { toastError(String(e)); }
  };

  const handleToggleSidebar = async (vibe: VibeDto) => {
    if (!currentProject) return;
    try {
      if (projectVibeIds.has(vibe.id)) {
        await ipc.removeVibeFromProject(currentProject.id, vibe.id);
        removeVibeFromSidebar(vibe.id);
      } else {
        if (currentVibeKey && vibe.model !== currentVibeKey) { toast.error(t("vibe.modelMismatch")); return; }
        await ipc.addVibeToProject(currentProject.id, vibe.id);
        addVibeToSidebar(vibe.id);
        const scrollToBottom = () => {
          const el = document.getElementById("left-sidebar");
          if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
        };
        setTimeout(scrollToBottom, 100);
        setTimeout(scrollToBottom, 400);
        setTimeout(scrollToBottom, 800);
      }
      await refresh();
    } catch (e) { toastError(String(e)); }
  };

  const handleClearThumbnail = async (vibeId: string) => {
    try { await ipc.clearVibeThumbnail(vibeId); await refresh(); }
    catch (e) { toastError(String(e)); }
  };

  const handleToggleFavorite = async (vibeId: string) => {
    try { await ipc.toggleVibeFavorite(vibeId); await loadVibes(); }
    catch (e) { toastError(String(e)); }
  };

  const handleExport = async (vibe: VibeDto) => {
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const dest = await save({ defaultPath: `${vibe.name}.naiv4vibe`, filters: [{ name: "Vibe", extensions: ["naiv4vibe"] }] });
      if (dest) await ipc.exportVibe(vibe.id, dest);
    } catch (e) { toastError(String(e)); }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("vibe.manage")}</DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleImportClick}>
              <Plus className="mr-1 h-3 w-3" />
              {t("vibe.import")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEncodeOpen(true)}>
              <Sparkles className="mr-1 h-3 w-3" />
              {t("vibe.encodeButton")}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="flex items-center cursor-text"
              onMouseEnter={() => setShowSearch(true)}
            >
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                ref={(el) => { if (el && showSearch) el.focus(); }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => { if (!searchQuery) setShowSearch(false); }}
                placeholder={t("common.search")}
                className={`bg-transparent border-b border-transparent text-[10px] outline-none transition-all duration-200 ml-1 ${
                  showSearch ? "w-28 border-muted-foreground/30 opacity-100" : "w-0 opacity-0 pointer-events-none"
                }`}
              />
            </div>
            <div className="flex-1" />
            <Button
              variant={showFavoritesOnly ? "default" : "ghost"}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setShowFavoritesOnly((v) => !v)}
              title={t("vibe.favoritesOnly")}
            >
              <Star className={`h-3.5 w-3.5 ${showFavoritesOnly ? "fill-current" : ""}`} />
            </Button>
            {modelOptions.length > 1 && (
              <Select
                value={filterModel ?? "__all__"}
                onValueChange={(v) => setFilterModel(v === "__all__" ? null : v)}
              >
                <SelectTrigger className="h-7 w-auto min-w-[120px] text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__" className="text-xs">{t("vibe.allModels")}</SelectItem>
                  {modelOptions.map((model) => (
                    <SelectItem key={model} value={model} className="text-xs">{model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <ScrollArea className="h-80">
            {displayVibes.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                {t("vibe.empty")}
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2 pr-2">
                {displayVibes.map((vibe) => (
                  <VibeCard
                    key={vibe.id}
                    vibe={vibe}
                    isInSidebar={projectVibeIds.has(vibe.id)}
                    isEditing={editingId === vibe.id}
                    editName={editName}
                    onEditNameChange={setEditName}
                    onStartEdit={() => handleStartEdit(vibe)}
                    onSaveEdit={() => handleSaveEdit(vibe.id)}
                    onCancelEdit={() => setEditingId(null)}
                    onChangeThumbnail={() => handleChangeThumbnail(vibe.id)}
                    onClearThumbnail={() => handleClearThumbnail(vibe.id)}
                    onToggleSidebar={() => handleToggleSidebar(vibe)}
                    onToggleFavorite={() => handleToggleFavorite(vibe.id)}
                    onExport={() => handleExport(vibe)}
                    onDelete={() => setDeleteTarget(vibe)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t("vibe.deleteConfirm")}
        description={deleteTarget?.name}
      />

      {importFilePath && (
        <VibeImportDialog
          open={true}
          onOpenChange={(o) => { if (!o) setImportFilePath(null); }}
          filePath={importFilePath}
          onImported={refresh}
        />
      )}

      <VibeEncodeDialog
        open={encodeOpen}
        onOpenChange={setEncodeOpen}
        onEncoded={refresh}
      />
    </>
  );
}
