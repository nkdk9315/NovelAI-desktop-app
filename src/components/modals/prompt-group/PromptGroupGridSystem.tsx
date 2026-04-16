import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useTranslation } from "react-i18next";
import { ChevronRight, Minus, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger,
} from "@/components/ui/context-menu";
import HoverSearch from "@/components/shared/HoverSearch";
import type { PromptGroupDto, TagDto } from "@/types";
import type { SystemTreeNode } from "./PromptGroupGrid";
import type { TargetPromptState } from "@/stores/sidebar-prompt-utils";

const SYS_TAGS_PER_CHUNK = 20;

export function leafToPromptGroup(leaf: { id: number; title: string }): PromptGroupDto {
  return {
    id: `tagdb-${leaf.id}`, name: leaf.title, folderId: null, defaultGenreIds: [],
    isSystem: true, usageType: "both", tags: [], createdAt: "", updatedAt: "",
    thumbnailPath: null, isDefault: false, category: null, defaultStrength: 0,
    randomMode: false, randomCount: 1, randomSource: "enabled", wildcardToken: null,
  };
}

export type SysRow =
  | { key: string; kind: "sysBranch"; depth: number; id: number;
      title: string; leafCount: number; leafIdsInSubtree: number[]; isOpen: boolean }
  | { key: string; kind: "sysLeafHeader"; depth: number; leafId: number;
      title: string; group: PromptGroupDto; isAdded: boolean; isOpen: boolean; tagCount: number }
  | { key: string; kind: "sysTagChunk"; depth: number; groupId: string;
      leafTitle: string; tags: TagDto[] };

function collectLeafIds(node: SystemTreeNode, acc: number[]): void {
  if (node.kind === "leaf") { acc.push(node.id); return; }
  for (const c of node.children) collectLeafIds(c, acc);
}

export function buildSysFlatRows(
  systemTree: SystemTreeNode[], expBranches: Set<number>, expGroups: Set<string>,
  tagDbCache: Record<string, TagDto[]>, existingGroupIds: string[],
  leafSearchByGroup: Record<string, string>,
): SysRow[] {
  const out: SysRow[] = [];
  const walk = (nodes: SystemTreeNode[], depth: number): void => {
    for (const n of nodes) {
      if (n.kind === "branch") {
        const isOpen = expBranches.has(n.id);
        const leafIdsInSubtree: number[] = [];
        collectLeafIds(n, leafIdsInSubtree);
        out.push({ key: `sb-${n.id}`, kind: "sysBranch", depth, id: n.id,
          title: n.title, leafCount: n.leafCount, leafIdsInSubtree, isOpen });
        if (isOpen) walk(n.children, depth + 1);
        continue;
      }
      const gr = leafToPromptGroup(n);
      const isAdded = existingGroupIds.includes(gr.id);
      const isOpen = expGroups.has(gr.id);
      const cache = tagDbCache[gr.id] ?? [];
      const q = (leafSearchByGroup[gr.id] ?? "").trim().toLowerCase();
      const filtered = q ? cache.filter((x) => x.name.toLowerCase().includes(q)) : cache;
      out.push({ key: `sl-${n.id}`, kind: "sysLeafHeader", depth, leafId: n.id,
        title: n.title, group: gr, isAdded, isOpen, tagCount: cache.length });
      if (isOpen && filtered.length > 0) {
        for (let i = 0; i < filtered.length; i += SYS_TAGS_PER_CHUNK) {
          out.push({ key: `st-${gr.id}-${i}`, kind: "sysTagChunk", depth: depth + 1,
            groupId: gr.id, leafTitle: n.title, tags: filtered.slice(i, i + SYS_TAGS_PER_CHUNK) });
        }
      }
    }
  };
  walk(systemTree, 0);
  return out;
}

interface SystemTreeViewProps {
  sysFlatRows: SysRow[];
  tagDbCache: Record<string, TagDto[]>;
  sidebarTargets: TargetPromptState | undefined;
  leafSearchByGroup: Record<string, string>;
  setLeafSearch: (groupId: string, q: string) => void;
  onToggleBranch: (id: number) => void;
  onExpandGroup: (gr: PromptGroupDto) => void;
  onToggleSidebar: (g: PromptGroupDto) => void;
  onToggleTag: (targetId: string, groupId: string, tagId: string) => void;
  onAddGroupToTarget: (targetId: string, gr: PromptGroupDto) => void;
  targetId: string;
  onCreateFromTagDb: (title: string, tagNames: string[]) => void;
  onRemoveFromFavorites?: (leafIds: number[]) => void;
  onEditSystemGroupSettings?: (id: string, name: string) => void;
}

export function SystemTreeView(props: SystemTreeViewProps) {
  const { sysFlatRows, tagDbCache, sidebarTargets, leafSearchByGroup, setLeafSearch,
    onToggleBranch, onExpandGroup, onToggleSidebar, onToggleTag, onAddGroupToTarget,
    targetId, onCreateFromTagDb, onRemoveFromFavorites, onEditSystemGroupSettings } = props;
  const { t } = useTranslation();
  const sysScrollRef = useRef<HTMLDivElement>(null);
  const sysVirt = useVirtualizer({
    count: sysFlatRows.length, getScrollElement: () => sysScrollRef.current,
    estimateSize: () => 24, overscan: 10, getItemKey: (i) => sysFlatRows[i].key,
  });

  const isEnabled = (gid: string, tid: string) =>
    sidebarTargets?.groups.find((g) => g.groupId === gid)?.tags.find((tt) => tt.tagId === tid)?.enabled ?? false;

  const clickSysLeafTag = (leaf: PromptGroupDto, tag: TagDto) => {
    const sidebarTagId = `tagdb-tag-${tag.id}`;
    const existingIds = sidebarTargets?.groups.map((g) => g.groupId) ?? [];
    if (!existingIds.includes(leaf.id)) {
      const cache = tagDbCache[leaf.id] ?? [];
      const hydrated: PromptGroupDto = { ...leaf, tags: cache.map((td, i) => ({
        id: `tagdb-tag-${td.id}`, name: td.name, tag: td.name, sortOrder: i, defaultStrength: 0, thumbnailPath: null,
      })) };
      onAddGroupToTarget(targetId, hydrated);
      setTimeout(() => onToggleTag(targetId, leaf.id, sidebarTagId), 0);
    } else {
      onToggleTag(targetId, leaf.id, sidebarTagId);
    }
  };

  const renderRow = (row: SysRow) => {
    if (row.kind === "sysBranch") return (
      <ContextMenu>
        <ContextMenuTrigger>
          <div role="button" tabIndex={0} className="flex items-center gap-1 py-1 leading-4 font-medium text-muted-foreground hover:text-foreground cursor-pointer"
            style={{ paddingLeft: `${row.depth * 10 + 4}px` }} onClick={() => onToggleBranch(row.id)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggleBranch(row.id); } }}>
            <ChevronRight className={`h-3 w-3 transition-transform ${row.isOpen ? "rotate-90" : ""}`} />
            <span className="truncate">{row.title}</span>
            <span className="text-[10px] text-muted-foreground/60">{row.leafCount}</span>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="min-w-[7rem] p-0.5 text-[11px]">
          {onRemoveFromFavorites && row.leafIdsInSubtree.length > 0 && (
            <ContextMenuItem className="text-[11px] py-1 px-2 text-destructive"
              onClick={() => onRemoveFromFavorites(row.leafIdsInSubtree)}>
              {t("tagDb.removeAllFavoritesUnder", { count: row.leafIdsInSubtree.length })}
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>
    );
    if (row.kind === "sysLeafHeader") {
      const { group: gr, leafId, title, isAdded, isOpen: leafOpen, tagCount, depth } = row;
      const cache = tagDbCache[gr.id] ?? [];
      const enabledNames: string[] = sidebarTargets?.groups.find((g) => g.groupId === gr.id)
        ?.tags.filter((tt) => tt.enabled).map((tt) => tt.tag) ?? [];
      return (
        <ContextMenu>
          <ContextMenuTrigger>
            <div className="flex items-center py-1 gap-0.5" style={{ paddingLeft: `${depth * 10 + 4}px` }}>
              <button type="button" className="shrink-0 w-4 h-4 flex items-center justify-center" onClick={() => onExpandGroup(gr)}>
                <ChevronRight className={`h-2.5 w-2.5 transition-transform ${leafOpen ? "rotate-90" : ""}`} />
              </button>
              <button type="button" className="flex items-center min-w-0 hover:text-foreground" onClick={() => onExpandGroup(gr)}>
                <span className="truncate">{title}</span>
              </button>
              <span className="ml-1 shrink-0 text-[9px] text-muted-foreground/60 tabular-nums">{tagCount || ""}</span>
              <button type="button" className={`ml-0.5 shrink-0 rounded p-0.5 transition-colors ${isAdded ? "text-primary hover:bg-destructive/10 hover:text-destructive" : "text-muted-foreground hover:bg-primary/10 hover:text-primary"}`}
                onClick={() => onToggleSidebar(gr)}>
                {isAdded ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
              </button>
              {leafOpen && <HoverSearch value={leafSearchByGroup[gr.id] ?? ""} onChange={(q) => setLeafSearch(gr.id, q)} className="shrink-0 ml-0.5" />}
              <span className="flex-1" />
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="min-w-[7rem] p-0.5 text-[11px]">
            <ContextMenuItem className="text-[11px] py-1 px-2" disabled={cache.length === 0}
              onClick={() => { if (cache.length > 0) onCreateFromTagDb(title, cache.map((x) => x.name)); }}>
              {t("promptGroup.createFromAll", { count: cache.length })}
            </ContextMenuItem>
            {enabledNames.length > 0 && (
              <ContextMenuItem className="text-[11px] py-1 px-2" onClick={() => onCreateFromTagDb(title, enabledNames)}>
                {t("promptGroup.createFromSelected", { count: enabledNames.length })}
              </ContextMenuItem>
            )}
            {onEditSystemGroupSettings && (
              <ContextMenuItem className="text-[11px] py-1 px-2" onClick={() => onEditSystemGroupSettings(gr.id, title)}>{t("common.edit")}</ContextMenuItem>
            )}
            {onRemoveFromFavorites && (
              <ContextMenuItem className="text-[11px] py-1 px-2 text-destructive" onClick={() => onRemoveFromFavorites([leafId])}>{t("tagDb.removeFavorite")}</ContextMenuItem>
            )}
          </ContextMenuContent>
        </ContextMenu>
      );
    }
    // sysTagChunk
    const leafGroup: PromptGroupDto = {
      id: row.groupId, name: row.leafTitle, folderId: null, defaultGenreIds: [],
      isSystem: true, usageType: "both", tags: [], createdAt: "", updatedAt: "",
      thumbnailPath: null, isDefault: false, category: null, defaultStrength: 0,
      randomMode: false, randomCount: 1, randomSource: "enabled", wildcardToken: null,
    };
    return (
      <div className="flex flex-wrap gap-0.5 items-center border-l border-border pl-2 py-0.5"
        style={{ marginLeft: `${row.depth * 10 + 10}px` }}>
        {row.tags.map((tag) => {
          const en = isEnabled(leafGroup.id, `tagdb-tag-${tag.id}`);
          return (
            <Badge key={`sysleaftag-${row.groupId}-${tag.id}`} variant={en ? "default" : "outline"}
              className="cursor-pointer text-[9px] px-1 py-0 select-none transition-colors"
              onClick={() => clickSysLeafTag(leafGroup, tag)}>
              {tag.name}
            </Badge>
          );
        })}
      </div>
    );
  };

  return (
    <div ref={sysScrollRef} className={`${sysFlatRows.length > 0 ? "h-72" : "h-auto"} overflow-y-auto pr-3 text-xs`}>
      <div style={{ height: `${sysVirt.getTotalSize()}px`, position: "relative", width: "100%" }}>
        {sysVirt.getVirtualItems().map((vi) => {
          const row = sysFlatRows[vi.index];
          return (
            <div key={row.key} data-index={vi.index} ref={sysVirt.measureElement}
              style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${vi.start}px)` }}>
              {renderRow(row)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
