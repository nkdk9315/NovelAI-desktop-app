import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, FolderClosed, FolderOpen } from "lucide-react";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { PromptGroupFolderDto } from "@/types";

// ---- Folder tree types & builder ----

export const UNCATEGORIZED_FOLDER_ID = -1;

export interface FolderNode {
  id: number;
  title: string;
  children: FolderNode[];
  groups: import("@/types").PromptGroupDto[];
}

export function buildFolderTree(
  folders: PromptGroupFolderDto[],
  groups: import("@/types").PromptGroupDto[],
): FolderNode[] {
  const byId = new Map<number, FolderNode>();
  for (const f of folders) {
    byId.set(f.id, { id: f.id, title: f.title, children: [], groups: [] });
  }
  const sorted = [...folders].sort(
    (a, b) => a.sortKey - b.sortKey || a.title.localeCompare(b.title),
  );
  const roots: FolderNode[] = [];
  for (const f of sorted) {
    const node = byId.get(f.id)!;
    if (f.parentId == null) roots.push(node);
    else byId.get(f.parentId)?.children.push(node);
  }
  const uncategorized: FolderNode = {
    id: UNCATEGORIZED_FOLDER_ID,
    title: "",
    children: [],
    groups: [],
  };
  for (const g of groups) {
    if (g.folderId == null) uncategorized.groups.push(g);
    else byId.get(g.folderId)?.groups.push(g);
  }
  return [uncategorized, ...roots];
}

// ---- Folder accordion node ----

interface FolderAccordionNodeProps {
  node: FolderNode;
  depth: number;
  isUncategorized: boolean;
  expanded: Set<number>;
  toggleExpanded: (id: number) => void;
  renameTarget: number | null;
  setRenameTarget: (id: number | null) => void;
  onCreateInFolder: (folderId: number | null) => void;
  onCreateSubfolder: (parentId: number) => void;
  onRenameFolder: (id: number, title: string) => Promise<void>;
  onDeleteFolder: (id: number) => void;
  renderGroupCard: (g: import("@/types").PromptGroupDto) => React.ReactNode;
}

export function FolderAccordionNode({
  node, depth, isUncategorized, expanded, toggleExpanded,
  renameTarget, setRenameTarget,
  onCreateInFolder, onCreateSubfolder, onRenameFolder,
  onDeleteFolder, renderGroupCard,
}: FolderAccordionNodeProps) {
  const { t } = useTranslation();
  const isOpen = expanded.has(node.id);
  const [renameDraft, setRenameDraft] = useState(node.title);
  const totalCount = node.groups.length;
  const title = isUncategorized ? t("promptGroup.folder.uncategorized") : node.title;

  useEffect(() => {
    if (renameTarget === node.id) setRenameDraft(node.title);
  }, [renameTarget, node.id, node.title]);

  const headerRow = (
    <div
      className="flex items-center gap-1 py-1 leading-4 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
      style={{ paddingLeft: `${depth * 12 + 4}px` }}
      onClick={() => toggleExpanded(node.id)}
    >
      <ChevronRight className={`h-3 w-3 transition-transform ${isOpen ? "rotate-90" : ""}`} />
      {isOpen ? <FolderOpen className="h-3 w-3" /> : <FolderClosed className="h-3 w-3" />}
      {renameTarget === node.id ? (
        <input
          autoFocus
          value={renameDraft}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setRenameDraft(e.target.value)}
          onBlur={() => {
            const next = renameDraft.trim();
            if (next && next !== node.title) onRenameFolder(node.id, next);
            setRenameTarget(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const next = renameDraft.trim();
              if (next && next !== node.title) onRenameFolder(node.id, next);
              setRenameTarget(null);
            } else if (e.key === "Escape") {
              setRenameTarget(null);
            }
          }}
          className="h-5 flex-1 min-w-0 rounded border border-border bg-background px-1 text-xs"
        />
      ) : (
        <span className="truncate">{title}</span>
      )}
      <span className="text-[10px] text-muted-foreground/60 tabular-nums">{totalCount}</span>
    </div>
  );

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>{headerRow}</ContextMenuTrigger>
        <ContextMenuContent className="min-w-[10rem] p-0.5 text-[11px]">
          <ContextMenuItem
            className="text-[11px] py-1 px-2"
            onClick={() => onCreateInFolder(isUncategorized ? null : node.id)}
          >
            {t("promptGroup.folder.createGroupHere")}
          </ContextMenuItem>
          {!isUncategorized && (
            <>
              <ContextMenuItem
                className="text-[11px] py-1 px-2"
                onClick={() => onCreateSubfolder(node.id)}
              >
                {t("promptGroup.folder.newSubfolder")}
              </ContextMenuItem>
              <ContextMenuItem
                className="text-[11px] py-1 px-2"
                onClick={() => setRenameTarget(node.id)}
              >
                {t("promptGroup.folder.rename")}
              </ContextMenuItem>
              <ContextMenuItem
                className="text-[11px] py-1 px-2 text-destructive"
                onClick={() => onDeleteFolder(node.id)}
              >
                {t("promptGroup.folder.delete")}
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
      {isOpen && (
        <div>
          {node.children.map((child) => (
            <FolderAccordionNode
              key={`f-${child.id}`}
              node={child}
              depth={depth + 1}
              isUncategorized={false}
              expanded={expanded}
              toggleExpanded={toggleExpanded}
              renameTarget={renameTarget}
              setRenameTarget={setRenameTarget}
              onCreateInFolder={onCreateInFolder}
              onCreateSubfolder={onCreateSubfolder}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              renderGroupCard={renderGroupCard}
            />
          ))}
          <div style={{ paddingLeft: `${(depth + 1) * 12 + 4}px` }}>
            {node.groups.map((g) => (
              <div key={`g-${g.id}`}>{renderGroupCard(g)}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
