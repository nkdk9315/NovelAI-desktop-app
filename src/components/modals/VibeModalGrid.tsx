import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Search, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AssetFolderDto, VibeDto } from "@/types";
import VibeCard from "./VibeCard";
import FolderCard from "./shared/FolderCard";

interface VibeModalGridProps {
  vibes: VibeDto[];
  projectVibeIds: Set<string>;
  filterModel: string | null;
  onFilterModelChange: (v: string | null) => void;
  showFavoritesOnly: boolean;
  onShowFavoritesOnlyChange: (v: boolean) => void;
  searchQuery: string;
  onSearchQueryChange: (v: string) => void;
  selectedFolder: "all" | "unclassified" | number;
  childFoldersOfSelected: AssetFolderDto[];
  folderCounts: Record<string, number>;
  onSelectFolder: (id: number) => void;
  onFolderDeleteRequest: (f: AssetFolderDto) => void;
  editingId: string | null;
  editName: string;
  onEditNameChange: (v: string) => void;
  onStartEdit: (vibe: VibeDto) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onChangeThumbnail: (vibeId: string) => void;
  onClearThumbnail: (vibeId: string) => void;
  onToggleSidebar: (vibe: VibeDto) => void;
  onToggleFavorite: (vibeId: string) => void;
  onExport: (vibe: VibeDto) => void;
  onDelete: (vibe: VibeDto) => void;
  onMoveToFolder: (vibe: VibeDto) => void;
  onImportClick: () => void;
  onEncodeClick: () => void;
}

export default function VibeModalGrid({
  vibes, projectVibeIds, filterModel, onFilterModelChange,
  showFavoritesOnly, onShowFavoritesOnlyChange,
  searchQuery, onSearchQueryChange,
  selectedFolder, childFoldersOfSelected, folderCounts,
  onSelectFolder, onFolderDeleteRequest,
  editingId, editName, onEditNameChange,
  onStartEdit, onSaveEdit, onCancelEdit,
  onChangeThumbnail, onClearThumbnail,
  onToggleSidebar, onToggleFavorite, onExport, onDelete, onMoveToFolder,
  onImportClick, onEncodeClick,
}: VibeModalGridProps) {
  const { t } = useTranslation();
  const [showSearch, setShowSearch] = useState(false);

  const modelOptions = useMemo(() => {
    const models = new Set(vibes.map((v) => v.model));
    return [...models].sort();
  }, [vibes]);

  const displayVibes = useMemo(() => {
    let list = vibes;
    if (selectedFolder === "unclassified") list = list.filter((v) => v.folderId == null);
    else if (typeof selectedFolder === "number") list = list.filter((v) => v.folderId === selectedFolder);
    if (showFavoritesOnly) list = list.filter((v) => v.isFavorite);
    if (filterModel) list = list.filter((v) => v.model === filterModel);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((v) => v.name.toLowerCase().includes(q));
    }
    return list;
  }, [vibes, selectedFolder, showFavoritesOnly, filterModel, searchQuery]);

  return (
    <div className="flex min-w-0 min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center gap-2 shrink-0">
        <Button variant="outline" size="sm" className="shrink-0 whitespace-nowrap" onClick={onImportClick}>
          <Plus className="mr-1 h-3 w-3" />{t("vibe.import")}
        </Button>
        <Button variant="outline" size="sm" className="shrink-0 whitespace-nowrap" onClick={onEncodeClick}>
          <Sparkles className="mr-1 h-3 w-3" />{t("vibe.encodeButton")}
        </Button>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center cursor-text" onMouseEnter={() => setShowSearch(true)}>
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            ref={(el) => { if (el && showSearch) el.focus(); }}
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            onBlur={() => { if (!searchQuery) setShowSearch(false); }}
            placeholder={t("common.search")}
            className={`bg-transparent border-b border-transparent text-[10px] outline-none transition-all duration-200 ml-1 ${showSearch ? "w-28 border-muted-foreground/30 opacity-100" : "w-0 opacity-0 pointer-events-none"}`}
          />
        </div>
        <div className="flex-1" />
        <Button variant={showFavoritesOnly ? "default" : "ghost"} size="sm" className="h-7 w-7 p-0"
          onClick={() => onShowFavoritesOnlyChange(!showFavoritesOnly)} title={t("vibe.favoritesOnly")}>
          <Star className={`h-3.5 w-3.5 ${showFavoritesOnly ? "fill-current" : ""}`} />
        </Button>
        {modelOptions.length > 1 && (
          <Select value={filterModel ?? "__all__"} onValueChange={(v) => onFilterModelChange(v === "__all__" ? null : v)}>
            <SelectTrigger className="h-7 w-auto min-w-[120px] text-[10px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__" className="text-xs">{t("vibe.allModels")}</SelectItem>
              {modelOptions.map((model) => (<SelectItem key={model} value={model} className="text-xs">{model}</SelectItem>))}
            </SelectContent>
          </Select>
        )}
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {displayVibes.length === 0 && childFoldersOfSelected.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">{t("vibe.empty")}</p>
        ) : (
          <div className="grid gap-2 pr-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
            {childFoldersOfSelected.map((f) => (
              <FolderCard key={`folder-${f.id}`} folder={f} itemCount={folderCounts[String(f.id)]}
                onClick={() => onSelectFolder(f.id)} onRequestDelete={onFolderDeleteRequest} />
            ))}
            {displayVibes.map((vibe) => (
              <VibeCard key={vibe.id} vibe={vibe} isInSidebar={projectVibeIds.has(vibe.id)}
                isEditing={editingId === vibe.id} editName={editName}
                onEditNameChange={onEditNameChange} onStartEdit={() => onStartEdit(vibe)}
                onSaveEdit={() => onSaveEdit(vibe.id)} onCancelEdit={onCancelEdit}
                onChangeThumbnail={() => onChangeThumbnail(vibe.id)} onClearThumbnail={() => onClearThumbnail(vibe.id)}
                onToggleSidebar={() => onToggleSidebar(vibe)} onToggleFavorite={() => onToggleFavorite(vibe.id)}
                onExport={() => onExport(vibe)} onDelete={() => onDelete(vibe)}
                onMoveToFolder={() => onMoveToFolder(vibe)} />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
