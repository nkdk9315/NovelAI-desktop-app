import { Folder, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { AssetFolderDto } from "@/types";

export interface FolderCardProps {
  folder: AssetFolderDto;
  itemCount?: number;
  onClick: () => void;
  onRequestDelete?: (folder: AssetFolderDto) => void;
  onRequestRename?: (folder: AssetFolderDto) => void;
}

/** Grid card that represents a sub-folder, shown inside the right pane of
 * VibeModal / StylePresetModal when the currently selected folder has
 * children. Mirrors the shape of VibeCard/PresetCard so it tiles cleanly. */
export default function FolderCard({
  folder,
  itemCount,
  onClick,
  onRequestDelete,
  onRequestRename,
}: FolderCardProps) {
  const { t } = useTranslation();
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          className="relative rounded-lg border border-border p-1.5 hover:bg-accent/50 cursor-pointer transition-colors"
          onClick={onClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onClick();
            }
          }}
        >
          <div className="aspect-square rounded bg-muted mb-1 overflow-hidden flex items-center justify-center">
            <Folder className="h-10 w-10 text-muted-foreground" />
          </div>
          <p className="text-[10px] leading-5 truncate">{folder.title}</p>
          <p className="text-[9px] leading-5 text-muted-foreground/60 truncate">
            {itemCount ?? 0}
          </p>
        </div>
      </ContextMenuTrigger>
      {(onRequestDelete || onRequestRename) && (
        <ContextMenuContent>
          {onRequestRename && (
            <ContextMenuItem onClick={() => onRequestRename(folder)}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              {t("folder.rename")}
            </ContextMenuItem>
          )}
          {onRequestDelete && onRequestRename && <ContextMenuSeparator />}
          {onRequestDelete && (
            <ContextMenuItem
              onClick={() => onRequestDelete(folder)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              {t("folder.delete")}
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      )}
    </ContextMenu>
  );
}
