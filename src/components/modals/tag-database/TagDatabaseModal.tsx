import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Pencil,
  Trash2,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as ipc from "@/lib/ipc";
import type { TagDto, TagGroupDto } from "@/types";
import { toastError } from "@/lib/toast-error";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Tag database browser.
 *
 * Left pane: lazy-loaded tag_groups tree from migration 013.
 * Right pane: the selected group's tags, with in-group search and user-edit
 * actions (create subgroup / rename / delete, add selected tags to another
 * user group). Seed groups (`source='seed'`) are read-only.
 */
export default function TagDatabaseModal({ open, onOpenChange }: Props) {
  const { t } = useTranslation();

  const [roots, setRoots] = useState<TagGroupDto[]>([]);
  const [childrenCache, setChildrenCache] = useState<Record<number, TagGroupDto[]>>({});
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const [selected, setSelected] = useState<TagGroupDto | null>(null);
  const [groupTags, setGroupTags] = useState<TagDto[]>([]);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TagDto[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set());

  // --- loading ---

  const loadRoots = useCallback(async () => {
    try {
      const r = await ipc.listTagGroupRoots();
      setRoots(r);
    } catch (e) {
      toastError(`${t("tagDb.loadFailed")}: ${String(e)}`);
    }
  }, [t]);

  const loadChildren = useCallback(
    async (parentId: number) => {
      try {
        const kids = await ipc.listTagGroupChildren(parentId);
        setChildrenCache((c) => ({ ...c, [parentId]: kids }));
      } catch (e) {
        toastError(`${t("tagDb.loadFailed")}: ${String(e)}`);
      }
    },
    [t],
  );

  useEffect(() => {
    if (open) {
      loadRoots();
    } else {
      setSelected(null);
      setGroupTags([]);
      setQuery("");
      setSearchResults([]);
      setSelectedTagIds(new Set());
    }
  }, [open, loadRoots]);

  // Load tags when the selected group changes.
  useEffect(() => {
    if (!selected) {
      setGroupTags([]);
      return;
    }
    ipc
      .listTagGroupTags(selected.id, 500)
      .then(setGroupTags)
      .catch((e) => toastError(`${t("tagDb.loadFailed")}: ${String(e)}`));
    setSelectedTagIds(new Set());
  }, [selected, t]);

  // In-group search via FTS5, or client-side filter if query is empty.
  useEffect(() => {
    const q = query.trim();
    if (!q || !selected) {
      setSearchResults([]);
      return;
    }
    const handle = setTimeout(() => {
      ipc
        .searchTags(q, selected.id, 100)
        .then(setSearchResults)
        .catch((e) => toastError(`${t("tagDb.searchFailed")}: ${String(e)}`));
    }, 200);
    return () => clearTimeout(handle);
  }, [query, selected, t]);

  // --- actions ---

  const toggleExpand = async (g: TagGroupDto) => {
    const next = new Set(expanded);
    if (next.has(g.id)) {
      next.delete(g.id);
    } else {
      next.add(g.id);
      if (!childrenCache[g.id] && g.childCount > 0) {
        await loadChildren(g.id);
      }
    }
    setExpanded(next);
  };

  const refreshParent = async (g: TagGroupDto) => {
    if (g.parentId == null) {
      await loadRoots();
    } else {
      await loadChildren(g.parentId);
    }
  };

  const handleCreateSubgroup = async () => {
    const parent = selected;
    const title = window.prompt(t("tagDb.newGroupPrompt"));
    if (!title) return;
    try {
      const created = await ipc.createUserTagGroup(parent?.id ?? null, title);
      if (parent) {
        await loadChildren(parent.id);
        setExpanded((s) => new Set(s).add(parent.id));
      } else {
        await loadRoots();
      }
      setSelected(created);
    } catch (e) {
      toastError(`${t("tagDb.createFailed")}: ${String(e)}`);
    }
  };

  const handleRename = async () => {
    if (!selected || selected.source !== "user") return;
    const next = window.prompt(t("tagDb.renamePrompt"), selected.title);
    if (!next || next === selected.title) return;
    try {
      await ipc.renameTagGroup(selected.id, next);
      setSelected({ ...selected, title: next });
      await refreshParent(selected);
    } catch (e) {
      toastError(`${t("tagDb.renameFailed")}: ${String(e)}`);
    }
  };

  const handleDelete = async () => {
    if (!selected || selected.source !== "user") return;
    if (!window.confirm(t("tagDb.deleteConfirm", { title: selected.title }))) return;
    try {
      await ipc.deleteTagGroup(selected.id);
      const parent = selected.parentId;
      setSelected(null);
      if (parent == null) {
        await loadRoots();
      } else {
        await loadChildren(parent);
      }
    } catch (e) {
      toastError(`${t("tagDb.deleteFailed")}: ${String(e)}`);
    }
  };

  const handleAddSelectedToGroup = async () => {
    if (selectedTagIds.size === 0) return;
    // Resolve target: simple prompt with user-group slug input. A proper
    // tree-picker UI is a follow-up; for now show the user-created groups
    // and let them pick by index.
    const userGroups = await ipc.listTagGroupChildren(
      // Walk roots → "root" then find children recursively would be heavy.
      // Simpler: show all roots + their immediate user-kind children.
      roots[0]?.id ?? 0,
    );
    const picks = userGroups.filter((g) => g.source === "user");
    if (picks.length === 0) {
      window.alert(t("tagDb.noUserGroupsYet"));
      return;
    }
    const choice = window.prompt(
      t("tagDb.pickGroupPrompt") +
        "\n" +
        picks.map((g, i) => `${i + 1}. ${g.title}`).join("\n"),
    );
    const idx = choice ? parseInt(choice, 10) - 1 : -1;
    if (idx < 0 || idx >= picks.length) return;
    const target = picks[idx];
    try {
      const added = await ipc.addTagsToGroup(
        target.id,
        Array.from(selectedTagIds),
      );
      window.alert(t("tagDb.addedCount", { count: added }));
      setSelectedTagIds(new Set());
    } catch (e) {
      toastError(`${t("tagDb.addFailed")}: ${String(e)}`);
    }
  };

  const toggleTagSelection = (tagId: number) => {
    setSelectedTagIds((s) => {
      const next = new Set(s);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  };

  // --- rendering ---

  const displayTags = useMemo(() => {
    if (query.trim()) return searchResults;
    return groupTags;
  }, [query, searchResults, groupTags]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("tagDb.title")}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 grid grid-cols-[minmax(260px,1fr)_2fr] gap-3">
          {/* Left: group tree */}
          <div className="flex flex-col min-h-0 border rounded-md">
            <div className="p-2 border-b flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                {t("tagDb.groups")}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCreateSubgroup}
                title={t("tagDb.newGroup")}
              >
                <FolderPlus className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-1">
                {roots.map((g) => (
                  <GroupNode
                    key={g.id}
                    group={g}
                    depth={0}
                    expanded={expanded}
                    childrenCache={childrenCache}
                    selected={selected}
                    onToggle={toggleExpand}
                    onSelect={setSelected}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Right: group contents */}
          <div className="flex flex-col min-h-0 border rounded-md">
            <div className="p-2 border-b space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">
                    {selected ? selected.title : t("tagDb.selectAGroup")}
                  </div>
                  {selected && (
                    <div className="text-[10px] text-muted-foreground flex gap-2">
                      <span>{selected.kind}</span>
                      <span>·</span>
                      <span>{selected.source}</span>
                      <span>·</span>
                      <span>{groupTags.length} tags</span>
                    </div>
                  )}
                </div>
                {selected?.source === "user" && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleRename}
                      title={t("tagDb.rename")}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDelete}
                      title={t("tagDb.delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  className="pl-7 h-8 text-xs"
                  placeholder={t("tagDb.searchPlaceholder")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  disabled={!selected}
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-2 flex flex-wrap gap-1">
                {displayTags.map((tag) => {
                  const isSelected = selectedTagIds.has(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTagSelection(tag.id)}
                      className="inline-block"
                    >
                      <Badge
                        variant={isSelected ? "default" : "secondary"}
                        className="cursor-pointer text-xs"
                      >
                        {tag.name}
                      </Badge>
                    </button>
                  );
                })}
                {selected && displayTags.length === 0 && (
                  <span className="text-xs text-muted-foreground p-2">
                    {t("tagDb.noTags")}
                  </span>
                )}
              </div>
            </ScrollArea>

            {selectedTagIds.size > 0 && (
              <div className="border-t p-2 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {t("tagDb.selectedCount", { count: selectedTagIds.size })}
                </span>
                <Button size="sm" onClick={handleAddSelectedToGroup}>
                  {t("tagDb.addToGroup")}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface NodeProps {
  group: TagGroupDto;
  depth: number;
  expanded: Set<number>;
  childrenCache: Record<number, TagGroupDto[]>;
  selected: TagGroupDto | null;
  onToggle: (g: TagGroupDto) => void;
  onSelect: (g: TagGroupDto) => void;
}

function GroupNode({
  group,
  depth,
  expanded,
  childrenCache,
  selected,
  onToggle,
  onSelect,
}: NodeProps) {
  const isOpen = expanded.has(group.id);
  const isSelected = selected?.id === group.id;
  const kids = childrenCache[group.id];
  const hasChildren = group.childCount > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-1 py-0.5 rounded text-xs cursor-pointer hover:bg-accent ${
          isSelected ? "bg-accent" : ""
        }`}
        style={{ paddingLeft: `${depth * 10 + 4}px` }}
        onClick={() => onSelect(group)}
      >
        <button
          type="button"
          className="shrink-0 w-4 h-4 flex items-center justify-center"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggle(group);
          }}
        >
          {hasChildren ? (
            isOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )
          ) : null}
        </button>
        <span className="truncate flex-1">{group.title}</span>
        {group.source === "user" && (
          <span className="text-[9px] text-muted-foreground">user</span>
        )}
        {hasChildren && (
          <span className="text-[9px] text-muted-foreground">
            {group.childCount}
          </span>
        )}
      </div>
      {isOpen && kids && (
        <div>
          {kids.map((c) => (
            <GroupNode
              key={c.id}
              group={c}
              depth={depth + 1}
              expanded={expanded}
              childrenCache={childrenCache}
              selected={selected}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
