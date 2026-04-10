import { useTranslation } from "react-i18next";
import { Check, Download, ImageIcon, Pencil, Star, Trash2, X } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import type { VibeDto } from "@/types";

export interface VibeCardProps {
  vibe: VibeDto;
  isInSidebar: boolean;
  isEditing: boolean;
  editName: string;
  onEditNameChange: (v: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onChangeThumbnail: () => void;
  onClearThumbnail: () => void;
  onToggleSidebar: () => void;
  onToggleFavorite: () => void;
  onExport: () => void;
  onDelete: () => void;
}

export default function VibeCard({
  vibe,
  isInSidebar,
  isEditing,
  editName,
  onEditNameChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onChangeThumbnail,
  onClearThumbnail,
  onToggleSidebar,
  onToggleFavorite,
  onExport,
  onDelete,
}: VibeCardProps) {
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
          {/* Thumbnail — card-width square, image not stretched */}
          <div className="aspect-square rounded bg-muted mb-1 overflow-hidden flex items-center justify-center">
            {vibe.thumbnailPath ? (
              <img
                src={`asset://localhost/${vibe.thumbnailPath}`}
                alt=""
                className="h-full w-full object-contain"
              />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            )}
          </div>

          {/* Name + model — compact */}
          {isEditing ? (
            <Input
              value={editName}
              onChange={(e) => onEditNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveEdit();
                if (e.key === "Escape") onCancelEdit();
              }}
              onBlur={onSaveEdit}
              onClick={(e) => e.stopPropagation()}
              className="h-5 text-[10px]"
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
          ) : (
            <p className="text-[10px] leading-tight truncate">{vibe.name}</p>
          )}
          <div className="flex items-center justify-between">
            <p className="text-[9px] text-muted-foreground/60 truncate flex-1">{vibe.model}</p>
            <button
              className="p-0.5 rounded-full hover:bg-accent transition-colors shrink-0"
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            >
              <Star
                className={`h-3 w-3 ${
                  vibe.isFavorite
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground/40 hover:text-yellow-400"
                }`}
              />
            </button>
          </div>

          {/* Sidebar badge — top-right */}
          {isInSidebar && (
            <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
              <Check className="h-2.5 w-2.5 text-primary-foreground" />
            </div>
          )}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem onClick={(e) => { e.stopPropagation(); onStartEdit(); }}>
          <Pencil className="mr-2 h-3.5 w-3.5" />
          {t("vibe.editName")}
        </ContextMenuItem>
        <ContextMenuItem onClick={(e) => { e.stopPropagation(); onChangeThumbnail(); }}>
          <ImageIcon className="mr-2 h-3.5 w-3.5" />
          {t("vibe.editThumbnail")}
        </ContextMenuItem>
        {vibe.thumbnailPath && (
          <ContextMenuItem onClick={(e) => { e.stopPropagation(); onClearThumbnail(); }}>
            <X className="mr-2 h-3.5 w-3.5" />
            {t("vibe.clearThumbnail")}
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onClick={(e) => { e.stopPropagation(); onExport(); }}>
          <Download className="mr-2 h-3.5 w-3.5" />
          {t("vibe.download")}
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
