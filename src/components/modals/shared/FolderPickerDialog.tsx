import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, FolderIcon, Inbox } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { AssetFolderDto } from "@/types";

export interface FolderPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loadRoots: () => Promise<AssetFolderDto[]>;
  loadChildren: (parentId: number) => Promise<AssetFolderDto[]>;
  initial: number | null;
  /** `null` = unclassified. */
  onPick: (folderId: number | null) => Promise<void> | void;
  title?: string;
}

export default function FolderPickerDialog({
  open,
  onOpenChange,
  loadRoots,
  loadChildren,
  initial,
  onPick,
  title,
}: FolderPickerDialogProps) {
  const { t } = useTranslation();
  const [roots, setRoots] = useState<AssetFolderDto[]>([]);
  const [childrenCache, setChildrenCache] = useState<Record<number, AssetFolderDto[]>>({});
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [selection, setSelection] = useState<number | "unclassified" | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelection(initial ?? "unclassified");
    setExpanded(new Set());
    setChildrenCache({});
    loadRoots()
      .then(setRoots)
      .catch(() => setRoots([]));
  }, [open, initial, loadRoots]);

  const toggle = useCallback(
    async (id: number) => {
      const next = new Set(expanded);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        if (!childrenCache[id]) {
          try {
            const kids = await loadChildren(id);
            setChildrenCache((prev) => ({ ...prev, [id]: kids }));
          } catch {
            /* ignore */
          }
        }
      }
      setExpanded(next);
    },
    [expanded, childrenCache, loadChildren],
  );

  const handleConfirm = async () => {
    const folderId = selection === "unclassified" || selection == null ? null : selection;
    await onPick(folderId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title ?? t("folder.pickTitle")}</DialogTitle>
        </DialogHeader>
        <div className="max-h-72 overflow-y-auto rounded border border-border p-2 text-xs">
          <FixedRow
            icon={<Inbox className="h-3.5 w-3.5" />}
            label={t("folder.unclassified")}
            active={selection === "unclassified"}
            onClick={() => setSelection("unclassified")}
          />
          {roots.map((root) => (
            <PickerNode
              key={root.id}
              folder={root}
              depth={0}
              expanded={expanded}
              childrenCache={childrenCache}
              selection={selection}
              onSelect={setSelection}
              onToggle={toggle}
            />
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleConfirm}>{t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FixedRow({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`flex w-full items-center gap-1.5 rounded px-1 py-1 text-left transition-colors ${
        active ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
      }`}
      onClick={onClick}
    >
      {icon}
      <span className="flex-1 truncate">{label}</span>
    </button>
  );
}

function PickerNode({
  folder,
  depth,
  expanded,
  childrenCache,
  selection,
  onSelect,
  onToggle,
}: {
  folder: AssetFolderDto;
  depth: number;
  expanded: Set<number>;
  childrenCache: Record<number, AssetFolderDto[]>;
  selection: number | "unclassified" | null;
  onSelect: (s: number) => void;
  onToggle: (id: number) => void;
}) {
  const isOpen = expanded.has(folder.id);
  const isActive = selection === folder.id;
  const kids = childrenCache[folder.id];
  return (
    <>
      <div
        className={`flex items-center gap-1 rounded py-1 pr-1 transition-colors ${
          isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
        }`}
        style={{ paddingLeft: depth * 10 + 4 }}
      >
        <button
          type="button"
          className="flex h-4 w-4 items-center justify-center shrink-0"
          onClick={() => folder.childCount > 0 && onToggle(folder.id)}
        >
          {folder.childCount > 0 ? (
            isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
          ) : null}
        </button>
        <FolderIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <button
          type="button"
          className="flex-1 truncate text-left"
          onClick={() => onSelect(folder.id)}
        >
          {folder.title}
        </button>
      </div>
      {isOpen &&
        kids?.map((child) => (
          <PickerNode
            key={child.id}
            folder={child}
            depth={depth + 1}
            expanded={expanded}
            childrenCache={childrenCache}
            selection={selection}
            onSelect={onSelect}
            onToggle={onToggle}
          />
        ))}
    </>
  );
}
