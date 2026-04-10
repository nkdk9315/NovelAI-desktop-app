import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ImageIcon, Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
import { toastError } from "@/lib/toast-error";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import type { StylePresetDto, VibeDto } from "@/types";
import * as ipc from "@/lib/ipc";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import StylePresetEditorModal from "./StylePresetEditorModal";

interface StylePresetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPresetsChanged: () => void;
}

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

  useEffect(() => {
    if (open) setFilterModel(currentModel);
  }, [open, currentModel]);
  const addSidebarPreset = useGenerationParamsStore((s) => s.addSidebarPreset);
  const removeSidebarPreset = useGenerationParamsStore((s) => s.removeSidebarPreset);

  const [vibes, setVibes] = useState<VibeDto[]>([]);

  const loadPresets = async () => {
    try {
      const [p, v] = await Promise.all([ipc.listStylePresets(), ipc.listVibes()]);
      setPresets(p);
      setVibes(v);
    } catch (e) {
      toastError(String(e));
    }
  };

  useEffect(() => {
    if (open) loadPresets();
  }, [open]);

  const modelOptions = useMemo(() => {
    const models = new Set(presets.map((p) => p.model));
    return [...models].sort();
  }, [presets]);

  const displayPresets = useMemo(() => {
    let list = presets;
    if (showFavoritesOnly) list = list.filter((p) => p.isFavorite);
    if (filterModel) list = list.filter((p) => p.model === filterModel);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [presets, showFavoritesOnly, filterModel, searchQuery]);

  const handleToggleFavorite = async (id: string) => {
    try {
      await ipc.togglePresetFavorite(id);
      await loadPresets();
    } catch (e) {
      toastError(String(e));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await ipc.deleteStylePreset(deleteTarget.id);
      setDeleteTarget(null);
      await loadPresets();
      onPresetsChanged();
    } catch (e) {
      toastError(String(e));
    }
  };

  const handleEditorClose = async () => {
    setEditorPreset(undefined);
    await loadPresets();
    onPresetsChanged();
  };

  const handleToggleSidebar = (preset: StylePresetDto) => {
    if (sidebarPresetIds.includes(preset.id)) {
      removeSidebarPreset(preset.id);
    } else {
      if (preset.model !== currentModel) {
        toast.error(t("vibe.modelMismatch"));
        return;
      }
      addSidebarPreset(preset, vibes);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("style.manage")}</DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditorPreset(null)}>
              <Plus className="mr-1 h-3 w-3" />
              {t("style.newPreset")}
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
                  {modelOptions.map((m) => (
                    <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <ScrollArea className="h-80">
            {displayPresets.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                {t("style.noPresets")}
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2 pr-2">
                {displayPresets.map((preset) => (
                  <PresetCard
                    key={preset.id}
                    preset={preset}
                    isInSidebar={sidebarPresetIds.includes(preset.id)}
                    onToggleSidebar={() => handleToggleSidebar(preset)}
                    onToggleFavorite={() => handleToggleFavorite(preset.id)}
                    onEdit={() => setEditorPreset(preset)}
                    onDelete={() => setDeleteTarget(preset)}
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
        title={t("style.deleteConfirm")}
        description={deleteTarget?.name}
      />

      {editorPreset !== undefined && (
        <StylePresetEditorModal
          open={true}
          onOpenChange={(o) => { if (!o) handleEditorClose(); }}
          preset={editorPreset}
        />
      )}
    </>
  );
}

function PresetCard({
  preset,
  isInSidebar,
  onToggleSidebar,
  onToggleFavorite,
  onEdit,
  onDelete,
}: {
  preset: StylePresetDto;
  isInSidebar: boolean;
  onToggleSidebar: () => void;
  onToggleFavorite: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          className="relative rounded-lg border border-border p-1.5 hover:bg-accent/50 cursor-pointer transition-colors"
          onClick={onToggleSidebar}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggleSidebar(); } }}
        >
          <div className="aspect-square rounded bg-muted mb-1 overflow-hidden flex items-center justify-center">
            {preset.thumbnailPath ? (
              <img src={`asset://localhost/${preset.thumbnailPath}`} alt="" className="h-full w-full object-contain" />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <p className="text-[10px] leading-tight truncate">{preset.name}</p>
          <div className="flex items-center justify-between">
            <p className="text-[9px] text-muted-foreground/60 truncate flex-1">
              {preset.artistTags.length} artists, {preset.vibeRefs.length} vibes
            </p>
            <button
              className="p-0.5 rounded-full hover:bg-accent transition-colors shrink-0"
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            >
              <Star className={`h-3 w-3 ${preset.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40 hover:text-yellow-400"}`} />
            </button>
          </div>
          {isInSidebar && (
            <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
              <Check className="h-2.5 w-2.5 text-primary-foreground" />
            </div>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
          <Pencil className="mr-2 h-3.5 w-3.5" />
          {t("style.editPreset")}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive">
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          {t("common.delete")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
