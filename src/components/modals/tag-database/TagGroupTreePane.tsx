import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, Plus, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { TagGroupDto, TagWithGroupsDto } from "@/types";
import type { FlatRow } from "./tag-db-utils";

export interface TagGroupTreePaneProps {
  flatRows: FlatRow[];
  globalQuery: string;
  globalResults: TagWithGroupsDto[];
  favoritesOnly: boolean;
  selectedId: number | null;
  selectedByGroup: Record<number, Map<number, string>>;
  totalSelectedCount: number;
  memberCountById: Record<number, number>;
  favCountById: Record<number, number>;
  onGlobalQueryChange: (q: string) => void;
  onToggleFavoritesOnly: () => void;
  onToggleExpand: (g: TagGroupDto) => void;
  onToggleLetter: (key: string) => void;
  onSelect: (g: TagGroupDto) => void;
  onToggleFavorite: (g: TagGroupDto) => void;
  onCreateGroupFromSelection: () => void;
}

export default function TagGroupTreePane(props: TagGroupTreePaneProps) {
  const { t } = useTranslation();
  const {
    flatRows, globalQuery, globalResults, favoritesOnly,
    selectedId, selectedByGroup, totalSelectedCount,
    memberCountById, favCountById,
    onGlobalQueryChange, onToggleFavoritesOnly, onToggleExpand,
    onToggleLetter, onSelect, onToggleFavorite, onCreateGroupFromSelection,
  } = props;

  const scrollParentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => 24,
    overscan: 12,
    getItemKey: (i) => flatRows[i].key,
  });

  return (
    <div className="flex flex-col min-h-0 border rounded-md overflow-hidden">
      <div className="shrink-0 p-2 border-b space-y-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            className="pl-7 h-7 text-xs"
            placeholder={t("tagDb.globalSearchPlaceholder")}
            value={globalQuery}
            onChange={(e) => onGlobalQueryChange(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-muted-foreground shrink-0">{t("tagDb.groups")}</span>
            <Button
              size="sm"
              variant={favoritesOnly ? "default" : "ghost"}
              onClick={onToggleFavoritesOnly}
              title={t("tagDb.favoritesOnly")}
              className="h-6 px-2 gap-1"
            >
              <Star className={`h-3 w-3 ${favoritesOnly ? "fill-primary-foreground" : "text-muted-foreground"}`} />
              <span className="text-[10px]">{t("tagDb.favoritesOnly")}</span>
            </Button>
          </div>
          <Button
            size="sm" variant="default"
            onClick={onCreateGroupFromSelection}
            disabled={totalSelectedCount === 0}
            title={t("tagDb.createGroupFromSelection")}
            className="h-7 gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="text-xs">{t("tagDb.createGroupFromSelection")}</span>
            {totalSelectedCount > 0 && (
              <span className="ml-1 rounded bg-primary-foreground/20 px-1 text-[10px] font-semibold">{totalSelectedCount}</span>
            )}
          </Button>
        </div>
      </div>

      {globalQuery.trim() ? (
        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
          {globalResults.length === 0 && (
            <span className="text-xs text-muted-foreground">{t("tagDb.noResults")}</span>
          )}
          {globalResults.map((r) => (
            <div key={`gres-${r.tag.id}`} className="space-y-0.5">
              <div className="text-xs font-semibold truncate">{r.tag.name}</div>
              {r.groups.length === 0 ? (
                <div className="text-[10px] text-muted-foreground/70 pl-3">{t("tagDb.noParentGroup")}</div>
              ) : r.groups.map((g) => (
                <button
                  key={`gres-${r.tag.id}-${g.id}`} type="button"
                  onClick={() => { onSelect(g); onGlobalQueryChange(""); }}
                  className="block w-full text-left text-[10px] pl-3 py-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground truncate"
                >
                  ↳ {g.title}
                  {g.isFavorite && <Star className="inline-block h-2.5 w-2.5 ml-1 fill-yellow-400 text-yellow-400" />}
                </button>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div ref={scrollParentRef} className="flex-1 min-h-0 overflow-y-auto p-1">
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative", width: "100%" }}>
            {rowVirtualizer.getVirtualItems().map((vi) => {
              const row = flatRows[vi.index];
              return (
                <div
                  key={row.key} data-index={vi.index} ref={rowVirtualizer.measureElement}
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${vi.start}px)` }}
                >
                  {row.kind === "branch" ? (
                    <BranchRow
                      row={row} selectedId={selectedId} selectedByGroup={selectedByGroup}
                      memberCountById={memberCountById} favCountById={favCountById}
                      onToggleExpand={onToggleExpand} onSelect={onSelect} onToggleFavorite={onToggleFavorite}
                    />
                  ) : (
                    <div
                      role="button" tabIndex={0}
                      className="flex items-center gap-1 px-1 py-1 leading-4 rounded text-xs cursor-pointer hover:bg-accent text-muted-foreground"
                      style={{ paddingLeft: `${row.depth * 10 + 4}px` }}
                      onClick={() => onToggleLetter(row.letterKey)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggleLetter(row.letterKey); } }}
                    >
                      {row.isOpen ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                      <span className="font-semibold">{row.letter}</span>
                      <span className="text-[9px] text-muted-foreground">{row.count}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Branch row sub-component ----

function BranchRow({ row, selectedId, selectedByGroup, memberCountById, favCountById, onToggleExpand, onSelect, onToggleFavorite }: {
  row: Extract<FlatRow, { kind: "branch" }>;
  selectedId: number | null;
  selectedByGroup: Record<number, Map<number, string>>;
  memberCountById: Record<number, number>;
  favCountById: Record<number, number>;
  onToggleExpand: (g: TagGroupDto) => void;
  onSelect: (g: TagGroupDto) => void;
  onToggleFavorite: (g: TagGroupDto) => void;
}) {
  const { t } = useTranslation();
  const g = row.group;
  const selCount = selectedByGroup[g.id]?.size ?? 0;
  return (
    <div
      role="button" tabIndex={0}
      className={`flex items-center gap-1 px-1 py-1 leading-4 rounded text-xs cursor-pointer hover:bg-accent ${selectedId === g.id ? "bg-accent" : ""}`}
      style={{ paddingLeft: `${row.depth * 10 + 4}px` }}
      onClick={() => { if (row.hasChildren) onToggleExpand(g); else onSelect(g); }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (row.hasChildren) onToggleExpand(g); else onSelect(g); } }}
    >
      <button type="button" className="shrink-0 w-4 h-4 flex items-center justify-center"
        onClick={(e) => { e.stopPropagation(); if (row.hasChildren) onToggleExpand(g); }}>
        {row.hasChildren ? (row.isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />) : null}
      </button>
      <span className="truncate min-w-0">{g.title}</span>
      {row.hasChildren && <span className="shrink-0 text-[9px] text-muted-foreground tabular-nums">{g.childCount}</span>}
      {row.hasChildren && (favCountById[g.id] ?? 0) > 0 && (
        <span className="shrink-0 text-[9px] text-yellow-500/80 flex items-center gap-0.5 tabular-nums">
          <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />{favCountById[g.id]}
        </span>
      )}
      {!row.hasChildren && g.id >= 0 && (memberCountById[g.id] ?? 0) > 0 && (
        <span className="shrink-0 text-[9px] text-muted-foreground tabular-nums">{memberCountById[g.id]}</span>
      )}
      {selCount > 0 && <Badge variant="default" className="text-[8px] px-1 py-0 shrink-0 h-3.5">{selCount}</Badge>}
      <span className="flex-1" />
      {g.source === "user" && <span className="shrink-0 text-[9px] text-muted-foreground">user</span>}
      {!row.hasChildren && g.id >= 0 && (
        <button type="button" className="shrink-0 rounded p-0.5 hover:bg-accent-foreground/10"
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(g); }} title={t("tagDb.favorite")}>
          <Star className={`h-3 w-3 ${g.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40"}`} />
        </button>
      )}
    </div>
  );
}
