import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Folder } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { AssetFolderDto } from "@/types";

export function PseudoFolderRow({
  label, checked, onClick, count,
}: {
  label: string; checked: boolean; onClick: () => void; count: number;
}) {
  return (
    <div className="flex items-center gap-1 py-0.5 px-1 rounded hover:bg-accent" style={{ paddingLeft: "4px" }}>
      <span className="w-3 shrink-0" />
      <Checkbox checked={checked} onCheckedChange={onClick} aria-label={label} />
      <Folder className="h-3 w-3 text-muted-foreground shrink-0" />
      <span className="text-xs leading-5 truncate flex-1">{label}</span>
      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{count}</span>
    </div>
  );
}

export function FolderTree({
  folders, selectedIds, onToggle, directCountByFolder,
}: {
  folders: AssetFolderDto[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  directCountByFolder: Map<number, number>;
}) {
  const childrenByParent = useMemo(() => {
    const map = new Map<number | null, AssetFolderDto[]>();
    for (const f of folders) {
      const key = f.parentId;
      const arr = map.get(key) ?? [];
      arr.push(f);
      map.set(key, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.sortKey - b.sortKey || a.title.localeCompare(b.title));
    }
    return map;
  }, [folders]);

  const roots = childrenByParent.get(null) ?? [];
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  return (
    <div className="space-y-0.5">
      {roots.map((root) => (
        <FolderNode key={root.id} folder={root} depth={0} childrenByParent={childrenByParent}
          selectedSet={selectedSet} onToggle={onToggle} directCountByFolder={directCountByFolder} />
      ))}
    </div>
  );
}

function FolderNode({
  folder, depth, childrenByParent, selectedSet, onToggle, directCountByFolder,
}: {
  folder: AssetFolderDto; depth: number;
  childrenByParent: Map<number | null, AssetFolderDto[]>;
  selectedSet: Set<number>; onToggle: (id: number) => void;
  directCountByFolder: Map<number, number>;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const children = childrenByParent.get(folder.id) ?? [];
  const hasChildren = children.length > 0;
  const directCount = directCountByFolder.get(folder.id) ?? 0;

  return (
    <div>
      <div className="flex items-center gap-1 py-0.5 px-1 rounded hover:bg-accent" style={{ paddingLeft: `${depth * 12 + 4}px` }}>
        {hasChildren ? (
          <button type="button" className="shrink-0 text-muted-foreground hover:text-foreground" onClick={() => setExpanded((v) => !v)}>
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <Checkbox checked={selectedSet.has(folder.id)} onCheckedChange={() => onToggle(folder.id)} aria-label={folder.title} />
        <Folder className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="text-xs leading-5 truncate flex-1">{folder.title}</span>
        <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{directCount}</span>
      </div>
      {hasChildren && expanded && (
        <div>
          {children.map((c) => (
            <FolderNode key={c.id} folder={c} depth={depth + 1} childrenByParent={childrenByParent}
              selectedSet={selectedSet} onToggle={onToggle} directCountByFolder={directCountByFolder} />
          ))}
        </div>
      )}
    </div>
  );
}
