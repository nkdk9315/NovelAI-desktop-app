import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FolderPlus, Inbox, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AssetFolderDto } from "@/types";
import { FolderNode, InlineCreateRow } from "./FolderTreePaneNodes";

export type FolderSelection = "all" | "unclassified" | number;

export interface FolderTreePaneProps {
  roots: AssetFolderDto[];
  loadChildren: (parentId: number) => Promise<AssetFolderDto[]>;
  selected: FolderSelection;
  onSelect: (sel: FolderSelection) => void;
  onCreate: (parentId: number | null, title: string) => Promise<void>;
  onRename: (folderId: number, title: string) => Promise<void>;
  onRequestDelete: (folder: AssetFolderDto) => void;
  itemCounts?: Record<string, number>;
  refreshKey?: number;
}

export default function FolderTreePane({
  roots, loadChildren, selected, onSelect, onCreate, onRename,
  onRequestDelete, itemCounts, refreshKey,
}: FolderTreePaneProps) {
  const { t } = useTranslation();
  const [childrenCache, setChildrenCache] = useState<Record<number, AssetFolderDto[]>>({});
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [creatingUnder, setCreatingUnder] = useState<number | "root" | null>(null);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    const ids = Array.from(expanded);
    if (ids.length === 0) return;
    (async () => {
      const next: Record<number, AssetFolderDto[]> = {};
      for (const id of ids) { try { next[id] = await loadChildren(id); } catch { /* ignore */ } }
      setChildrenCache((prev) => ({ ...prev, ...next }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const toggleExpand = useCallback(async (id: number) => {
    const next = new Set(expanded);
    if (next.has(id)) { next.delete(id); } else {
      next.add(id);
      if (!childrenCache[id]) { try { const kids = await loadChildren(id); setChildrenCache((prev) => ({ ...prev, [id]: kids })); } catch { /* ignore */ } }
    }
    setExpanded(next);
  }, [expanded, childrenCache, loadChildren]);

  const startRename = (folder: AssetFolderDto) => { setEditingId(folder.id); setEditText(folder.title); };
  const commitRename = async () => {
    if (editingId == null) return;
    const title = editText.trim();
    if (title.length > 0) { try { await onRename(editingId, title); } catch { /* parent surfaces errors */ } }
    setEditingId(null); setEditText("");
  };
  const startCreate = (parent: number | "root") => {
    setCreatingUnder(parent); setNewTitle("");
    if (typeof parent === "number" && !expanded.has(parent)) void toggleExpand(parent);
  };
  const commitCreate = async () => {
    if (creatingUnder == null) return;
    const title = newTitle.trim();
    if (title.length > 0) { try { await onCreate(creatingUnder === "root" ? null : creatingUnder, title); } catch { /* ignore */ } }
    setCreatingUnder(null); setNewTitle("");
  };

  const totalCount = itemCounts?.all;
  const unclassifiedCount = itemCounts?.unclassified ?? 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-1 flex shrink-0 items-center justify-between gap-1 px-1">
        <span className="text-[10px] font-semibold uppercase text-muted-foreground">{t("folder.title")}</span>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startCreate("root")} title={t("folder.newRoot")}>
          <FolderPlus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pr-1 text-xs">
        <FixedRow icon={<LayoutGrid className="h-3.5 w-3.5" />} label={t("folder.all")} count={totalCount} active={selected === "all"} onClick={() => onSelect("all")} />
        <FixedRow icon={<Inbox className="h-3.5 w-3.5" />} label={t("folder.unclassified")} count={unclassifiedCount} active={selected === "unclassified"} onClick={() => onSelect("unclassified")} />
        {creatingUnder === "root" && <InlineCreateRow depth={0} value={newTitle} onChange={setNewTitle} onCommit={commitCreate} onCancel={() => setCreatingUnder(null)} />}
        {roots.map((root) => (
          <FolderNode key={root.id} folder={root} depth={0} expanded={expanded} childrenCache={childrenCache}
            selected={selected} onSelect={onSelect} onToggleExpand={toggleExpand} onStartRename={startRename}
            onRequestDelete={onRequestDelete} onStartCreateChild={(id) => startCreate(id)}
            editingId={editingId} editText={editText} onEditTextChange={setEditText}
            onCommitRename={commitRename} onCancelRename={() => { setEditingId(null); setEditText(""); }}
            creatingUnder={creatingUnder} newTitle={newTitle} onNewTitleChange={setNewTitle}
            onCommitCreate={commitCreate} onCancelCreate={() => setCreatingUnder(null)} itemCounts={itemCounts} />
        ))}
      </div>
    </div>
  );
}

function FixedRow({ icon, label, count, active, onClick }: { icon: React.ReactNode; label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`flex w-full items-center gap-1.5 rounded px-1 py-1 text-left transition-colors ${active ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"}`} onClick={onClick}>
      {icon}
      <span className="flex-1 truncate leading-5">{label}</span>
      {count != null && count > 0 && <span className="text-[9px] text-muted-foreground">{count}</span>}
    </button>
  );
}
