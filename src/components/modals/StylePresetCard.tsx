import { useTranslation } from "react-i18next";
import { Check, FolderInput, ImageIcon, Pencil, Star, Trash2 } from "lucide-react";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { StylePresetDto } from "@/types";

interface PresetCardProps {
  preset: StylePresetDto;
  isInSidebar: boolean;
  onToggleSidebar: () => void;
  onToggleFavorite: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMoveToFolder: () => void;
}

export default function PresetCard({
  preset, isInSidebar, onToggleSidebar, onToggleFavorite, onEdit, onDelete, onMoveToFolder,
}: PresetCardProps) {
  const { t } = useTranslation();

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          role="button" tabIndex={0}
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
          <p className="text-[10px] leading-4 truncate">{preset.name}</p>
          <div className="flex items-center justify-between gap-1">
            <p className="text-[9px] leading-4 text-muted-foreground/60 truncate flex-1 min-w-0">
              {preset.artistTags.length}a / {preset.vibeRefs.length}v
            </p>
            <button className="shrink-0 p-0.5 rounded-full hover:bg-accent transition-colors"
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}>
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
          <Pencil className="mr-2 h-3.5 w-3.5" />{t("style.editPreset")}
        </ContextMenuItem>
        <ContextMenuItem onClick={(e) => { e.stopPropagation(); onMoveToFolder(); }}>
          <FolderInput className="mr-2 h-3.5 w-3.5" />{t("folder.moveToFolder")}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive">
          <Trash2 className="mr-2 h-3.5 w-3.5" />{t("common.delete")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
