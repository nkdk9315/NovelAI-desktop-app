import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import * as ipc from "@/lib/ipc-tags";
import type { TagDto, TagGroupDto, TagWithGroupsDto } from "@/types";
import { toastError } from "@/lib/toast-error";
import {
  VIRT_UNCLASSIFIED_ROOT, VIRT_UNCLASSIFIED_CHILDREN,
  buildLetterChildrenForCategory, parseOrphanLetterSlug, buildFlatRows,
} from "./tag-db-utils";
import TagGroupTreePane from "./TagGroupTreePane";
import TagContentPane from "./TagContentPane";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateGroupFromSelection?: (names: string[]) => void;
  clearSelectionTrigger?: number;
}

export default function TagDatabaseModal({ open, onOpenChange, onCreateGroupFromSelection, clearSelectionTrigger }: Props) {
  const { t } = useTranslation();

  const [roots, setRoots] = useState<TagGroupDto[]>([]);
  const [childrenCache, setChildrenCache] = useState<Record<number, TagGroupDto[]>>({});
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [openLetters, setOpenLetters] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<TagGroupDto | null>(null);
  const [groupTags, setGroupTags] = useState<TagDto[]>([]);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TagDto[]>([]);
  const [globalQuery, setGlobalQuery] = useState("");
  const [globalResults, setGlobalResults] = useState<TagWithGroupsDto[]>([]);
  const [memberCountById, setMemberCountById] = useState<Record<number, number>>({});
  const [favCountById, setFavCountById] = useState<Record<number, number>>({});
  const [selectedByGroup, setSelectedByGroup] = useState<Record<number, Map<number, string>>>({});

  const loadRoots = useCallback(async () => {
    try {
      const r = favoritesOnly ? await ipc.listFavoriteTagGroupRoots() : await ipc.listTagGroupRoots();
      if (favoritesOnly) { setRoots(r); } else {
        setRoots([VIRT_UNCLASSIFIED_ROOT, ...r]);
        setChildrenCache((c) => ({ ...c, [VIRT_UNCLASSIFIED_ROOT.id]: VIRT_UNCLASSIFIED_CHILDREN }));
      }
    } catch (e) { toastError(`${t("tagDb.loadFailed")}: ${String(e)}`); }
  }, [t, favoritesOnly]);

  const loadChildren = useCallback(async (parentId: number) => {
    try {
      const kids = favoritesOnly ? await ipc.listFavoriteTagGroupChildren(parentId) : await ipc.listTagGroupChildren(parentId);
      setChildrenCache((c) => ({ ...c, [parentId]: kids }));
    } catch (e) { toastError(`${t("tagDb.loadFailed")}: ${String(e)}`); }
  }, [t, favoritesOnly]);

  useEffect(() => {
    if (open) { loadRoots(); } else {
      setSelected(null); setGroupTags([]); setQuery(""); setSearchResults([]);
      setSelectedByGroup({}); setGlobalQuery(""); setGlobalResults([]);
      setFavoritesOnly(false); setMemberCountById({}); setFavCountById({});
    }
  }, [open, loadRoots]);

  useEffect(() => {
    if (!open) return;
    Promise.all([ipc.countTagMembersPerGroup(), ipc.countFavoriteDescendantsPerGroup()])
      .then(([mems, favs]) => {
        const m: Record<number, number> = {}; for (const r of mems) m[r.id] = r.count;
        const f: Record<number, number> = {}; for (const r of favs) f[r.id] = r.count;
        setMemberCountById(m); setFavCountById(f);
      })
      .catch((e) => toastError(`${t("tagDb.loadFailed")}: ${String(e)}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setExpanded(new Set()); setChildrenCache({}); setSelected(null); setGroupTags([]);
    loadRoots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favoritesOnly]);

  useEffect(() => { if (clearSelectionTrigger !== undefined) setSelectedByGroup({}); }, [clearSelectionTrigger]);

  useEffect(() => {
    if (!selected) { setGroupTags([]); return; }
    const orphanInfo = parseOrphanLetterSlug(selected.slug);
    if (orphanInfo) {
      ipc.listOrphanTagsByCategory(orphanInfo.csvCategory, orphanInfo.letterBucket, 20_000)
        .then(setGroupTags).catch((e) => toastError(`${t("tagDb.loadFailed")}: ${String(e)}`));
      return;
    }
    if (selected.id < 0) { setGroupTags([]); return; }
    ipc.listTagGroupTags(selected.id, 20_000)
      .then(setGroupTags).catch((e) => toastError(`${t("tagDb.loadFailed")}: ${String(e)}`));
  }, [selected, t]);

  useEffect(() => {
    const q = globalQuery.trim();
    if (!q) { setGlobalResults([]); return; }
    const handle = setTimeout(() => {
      ipc.searchTagsWithGroups(q, 50).then(setGlobalResults)
        .catch((e) => toastError(`${t("tagDb.searchFailed")}: ${String(e)}`));
    }, 200);
    return () => clearTimeout(handle);
  }, [globalQuery, t]);

  useEffect(() => {
    const q = query.trim();
    if (!q || !selected) { setSearchResults([]); return; }
    const handle = setTimeout(() => {
      ipc.searchTags(q, selected.id, 100).then(setSearchResults)
        .catch((e) => toastError(`${t("tagDb.searchFailed")}: ${String(e)}`));
    }, 200);
    return () => clearTimeout(handle);
  }, [query, selected, t]);

  // --- actions ---

  const toggleExpand = async (g: TagGroupDto) => {
    const next = new Set(expanded);
    if (next.has(g.id)) { next.delete(g.id); } else {
      next.add(g.id);
      if (!childrenCache[g.id] && g.childCount > 0) {
        if (g.slug.startsWith("virt:cat")) {
          setChildrenCache((c) => ({ ...c, [g.id]: buildLetterChildrenForCategory(Number(g.slug.slice("virt:cat".length))) }));
        } else if (g.id >= 0) { await loadChildren(g.id); }
      }
    }
    setExpanded(next);
  };

  const refreshParent = async (g: TagGroupDto) => {
    if (g.parentId == null) await loadRoots(); else await loadChildren(g.parentId);
  };

  const handleRename = async () => {
    if (!selected || selected.source !== "user") return;
    const next = window.prompt(t("tagDb.renamePrompt"), selected.title);
    if (!next || next === selected.title) return;
    try {
      await ipc.renameTagGroup(selected.id, next);
      setSelected({ ...selected, title: next }); await refreshParent(selected);
    } catch (e) { toastError(`${t("tagDb.renameFailed")}: ${String(e)}`); }
  };

  const handleDelete = async () => {
    if (!selected || selected.source !== "user") return;
    if (!window.confirm(t("tagDb.deleteConfirm", { title: selected.title }))) return;
    try {
      await ipc.deleteTagGroup(selected.id);
      const parent = selected.parentId; setSelected(null);
      if (parent == null) await loadRoots(); else await loadChildren(parent);
    } catch (e) { toastError(`${t("tagDb.deleteFailed")}: ${String(e)}`); }
  };

  const totalSelectedCount = useMemo(
    () => Object.values(selectedByGroup).reduce((acc, m) => acc + m.size, 0), [selectedByGroup],
  );

  const handleCreateGroupFromSelection = () => {
    if (!onCreateGroupFromSelection || totalSelectedCount === 0) return;
    const names: string[] = []; const seen = new Set<string>();
    for (const m of Object.values(selectedByGroup))
      for (const name of m.values()) { if (!seen.has(name)) { seen.add(name); names.push(name); } }
    onCreateGroupFromSelection(names);
  };

  const handleToggleFavorite = async (g: TagGroupDto) => {
    try {
      const next = await ipc.toggleTagGroupFavorite(g.id);
      const patchOne = (list: TagGroupDto[]) => list.map((x) => (x.id === g.id ? { ...x, isFavorite: next } : x));
      if (g.parentId == null) { setRoots(patchOne); } else {
        setChildrenCache((c) => {
          const list = c[g.parentId as number]; if (!list) return c;
          return { ...c, [g.parentId as number]: patchOne(list) };
        });
      }
      if (selected?.id === g.id) setSelected({ ...selected, isFavorite: next });
      ipc.countFavoriteDescendantsPerGroup().then((favs) => {
        const f: Record<number, number> = {}; for (const r of favs) f[r.id] = r.count; setFavCountById(f);
      }).catch(() => { /* non-fatal */ });
    } catch (e) { toastError(`${t("tagDb.favoriteFailed")}: ${String(e)}`); }
  };

  const toggleTagSelection = (tag: TagDto) => {
    if (!selected) return;
    const gid = selected.id;
    setSelectedByGroup((prev) => {
      const next: Record<number, Map<number, string>> = { ...prev };
      const existing = new Map(next[gid] ?? new Map<number, string>());
      if (existing.has(tag.id)) existing.delete(tag.id); else existing.set(tag.id, tag.name);
      if (existing.size === 0) delete next[gid]; else next[gid] = existing;
      return next;
    });
  };

  const toggleLetter = (key: string) => {
    setOpenLetters((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  };

  const displayTags = useMemo(() => (query.trim() ? searchResults : groupTags), [query, searchResults, groupTags]);
  const flatRows = useMemo(() => buildFlatRows(roots, expanded, childrenCache, openLetters), [roots, expanded, childrenCache, openLetters]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl sm:max-w-7xl h-[80vh] flex flex-col">
        <DialogHeader><DialogTitle>{t("tagDb.title")}</DialogTitle></DialogHeader>
        <div className="flex-1 min-h-0 grid grid-cols-[minmax(260px,1fr)_2fr] gap-3">
          <TagGroupTreePane
            flatRows={flatRows} globalQuery={globalQuery} globalResults={globalResults}
            favoritesOnly={favoritesOnly} selectedId={selected?.id ?? null}
            selectedByGroup={selectedByGroup} totalSelectedCount={totalSelectedCount}
            memberCountById={memberCountById} favCountById={favCountById}
            onGlobalQueryChange={setGlobalQuery} onToggleFavoritesOnly={() => setFavoritesOnly((v) => !v)}
            onToggleExpand={toggleExpand} onToggleLetter={toggleLetter}
            onSelect={setSelected} onToggleFavorite={handleToggleFavorite}
            onCreateGroupFromSelection={handleCreateGroupFromSelection}
          />
          <TagContentPane
            selected={selected} displayTags={displayTags} query={query}
            selectedByGroup={selectedByGroup} onQueryChange={setQuery}
            onRename={handleRename} onDelete={handleDelete} onToggleTagSelection={toggleTagSelection}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
