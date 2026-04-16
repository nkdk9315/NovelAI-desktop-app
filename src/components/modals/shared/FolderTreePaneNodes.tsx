import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, FolderIcon, Pencil, Plus, Trash2 } from "lucide-react";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { AssetFolderDto } from "@/types";
import type { FolderSelection } from "./FolderTreePane";

export interface FolderNodeProps {
  folder: AssetFolderDto;
  depth: number;
  expanded: Set<number>;
  childrenCache: Record<number, AssetFolderDto[]>;
  selected: FolderSelection;
  onSelect: (sel: FolderSelection) => void;
  onToggleExpand: (id: number) => void;
  onStartRename: (folder: AssetFolderDto) => void;
  onRequestDelete: (folder: AssetFolderDto) => void;
  onStartCreateChild: (parentId: number) => void;
  editingId: number | null;
  editText: string;
  onEditTextChange: (v: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  creatingUnder: number | "root" | null;
  newTitle: string;
  onNewTitleChange: (v: string) => void;
  onCommitCreate: () => void;
  onCancelCreate: () => void;
  itemCounts?: Record<string, number>;
}

export function FolderNode(props: FolderNodeProps) {
  const { t } = useTranslation();
  const {
    folder, depth, expanded, childrenCache, selected, onSelect,
    onToggleExpand, onStartRename, onRequestDelete, onStartCreateChild,
    editingId, editText, onEditTextChange, onCommitRename, onCancelRename,
    creatingUnder, newTitle, onNewTitleChange, onCommitCreate, onCancelCreate,
    itemCounts,
  } = props;
  const isOpen = expanded.has(folder.id);
  const isActive = selected === folder.id;
  const isEditing = editingId === folder.id;
  const kids = childrenCache[folder.id];
  const count = itemCounts?.[String(folder.id)];
  const indent = useMemo(() => ({ paddingLeft: depth * 10 + 4 }), [depth]);

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={`group flex items-center gap-1 rounded py-1 pr-1 transition-colors ${isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"}`}
            style={indent}
          >
            <button type="button" onClick={(e) => { e.stopPropagation(); if (folder.childCount > 0) onToggleExpand(folder.id); }}
              className="flex h-4 w-4 items-center justify-center shrink-0">
              {folder.childCount > 0 ? (isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />) : null}
            </button>
            <FolderIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {isEditing ? (
              // eslint-disable-next-line jsx-a11y/no-autofocus
              <input autoFocus value={editText} onChange={(e) => onEditTextChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") onCommitRename(); else if (e.key === "Escape") onCancelRename(); }}
                onBlur={onCommitRename}
                className="h-5 flex-1 rounded border border-border bg-background px-1 text-[11px] outline-none" />
            ) : (
              <button type="button" className="flex-1 truncate text-left leading-5"
                onClick={() => onSelect(folder.id)} onDoubleClick={() => onStartRename(folder)}>
                {folder.title}
              </button>
            )}
            {count != null && count > 0 && !isEditing && <span className="text-[9px] text-muted-foreground">{count}</span>}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => onStartCreateChild(folder.id)}><Plus className="mr-2 h-3.5 w-3.5" />{t("folder.newChild")}</ContextMenuItem>
          <ContextMenuItem onClick={() => onStartRename(folder)}><Pencil className="mr-2 h-3.5 w-3.5" />{t("folder.rename")}</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => onRequestDelete(folder)} className="text-destructive"><Trash2 className="mr-2 h-3.5 w-3.5" />{t("folder.delete")}</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {isOpen && creatingUnder === folder.id && (
        <InlineCreateRow depth={depth + 1} value={newTitle} onChange={onNewTitleChange} onCommit={onCommitCreate} onCancel={onCancelCreate} />
      )}

      {isOpen && kids?.map((child) => (
        <FolderNode key={child.id} {...props} folder={child} depth={depth + 1} />
      ))}
    </>
  );
}

export function InlineCreateRow({
  depth, value, onChange, onCommit, onCancel,
}: {
  depth: number; value: string; onChange: (v: string) => void; onCommit: () => void; onCancel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-1 py-1 pr-1" style={{ paddingLeft: depth * 10 + 20 }}>
      <FolderIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
      <input autoFocus value={value} placeholder={t("folder.namePlaceholder")}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") onCommit(); else if (e.key === "Escape") onCancel(); }}
        onBlur={onCommit}
        className="h-5 flex-1 rounded border border-border bg-background px-1 text-[11px] outline-none" />
    </div>
  );
}
