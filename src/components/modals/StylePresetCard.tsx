import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, FolderInput, ImageIcon, Pencil, Plus, Star, Trash2 } from "lucide-react";
import ImageLightbox from "@/components/shared/ImageLightbox";
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
  const [zoomed, setZoomed] = useState(false);
  const thumbSrc = preset.thumbnailPath ? `asset://localhost/${preset.thumbnailPath}` : null;

  return (
    <>
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          role="button" tabIndex={0}
          className="relative rounded-lg border border-border p-1.5 hover:bg-accent/50 cursor-pointer transition-colors"
          onClick={onToggleSidebar}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggleSidebar(); } }}
        >
          {/* Absolute img: percentage heights inside aspect-ratio boxes are unreliable in WebKit. */}
          <div className="relative aspect-square rounded bg-muted mb-1 overflow-hidden flex items-center justify-center">
            {thumbSrc ? (
              <button
                type="button"
                title={t("style.thumbnailZoom")}
                className="absolute inset-0 cursor-zoom-in"
                onClick={(e) => { e.stopPropagation(); setZoomed(true); }}
              >
                <img src={thumbSrc} alt="" className="absolute inset-0 h-full w-full object-contain" />
              </button>
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <p className="text-[10px] leading-4 truncate">{preset.name}</p>
          <div className="flex items-center justify-between gap-1">
            <p className="text-[9px] leading-4 text-muted-foreground/60 truncate flex-1 min-w-0">
              {preset.artistTags.length}a / {preset.vibeRefs.length}v
            </p>
            <span className={`shrink-0 flex items-center gap-0.5 rounded px-1 text-[9px] leading-4 ${
              isInSidebar ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"
            }`}>
              {isInSidebar ? <Check className="h-2.5 w-2.5" /> : <Plus className="h-2.5 w-2.5" />}
              {isInSidebar ? t("style.presetAddedBadge") : t("style.presetAddToggle")}
            </span>
            <button className="shrink-0 p-0.5 rounded-full hover:bg-accent transition-colors"
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}>
              <Star className={`h-3 w-3 ${preset.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40 hover:text-yellow-400"}`} />
            </button>
          </div>
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
    <ImageLightbox src={zoomed ? thumbSrc : null} title={preset.name} onClose={() => setZoomed(false)} />
    </>
  );
}
