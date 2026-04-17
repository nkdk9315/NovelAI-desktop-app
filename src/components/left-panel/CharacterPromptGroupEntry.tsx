import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, Power, SlidersHorizontal, Dices, Database, Settings, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  ContextMenu, ContextMenuContent, ContextMenuTrigger,
} from "@/components/ui/context-menu";
import HoverSearch from "@/components/shared/HoverSearch";
import type { SidebarPromptGroup, SidebarPromptTag } from "@/stores/sidebar-prompt-utils";
import { defaultWildcardToken } from "@/lib/prompt-assembly";

interface GroupItemProps {
  group: SidebarPromptGroup;
  onToggleExpanded: () => void;
  onRemove: () => void;
  onToggleTag: (tagId: string) => void;
  onSetStrength: (tagId: string, strength: number) => void;
  onToggleGroupEnabled: () => void;
  onSetGroupDefaultStrength: (strength: number) => void;
  onSetRandomMode: (enabled: boolean) => void;
  onSetRandomCount: (count: number) => void;
  onSetRandomSource: (source: "all" | "enabled") => void;
  onSetWildcardToken: (token: string | null) => void;
  onInsertWildcard: (token: string) => void;
  onEditGroup: () => void;
  onOpenSystemSettings: () => void;
  onEditEntry: (tag: SidebarPromptTag) => void;
}

export function GroupItem({
  group, onToggleExpanded, onRemove, onToggleTag, onSetStrength,
  onToggleGroupEnabled, onSetGroupDefaultStrength,
  onSetRandomMode, onSetRandomCount, onSetRandomSource,
  onSetWildcardToken, onInsertWildcard, onEditGroup, onOpenSystemSettings, onEditEntry,
}: GroupItemProps) {
  const { t } = useTranslation();
  const isSystemGroup = group.groupId.startsWith("system-group-cat-") || group.groupId.startsWith("tagdb-");
  const enabledCount = group.tags.filter((tg) => tg.enabled).length;
  const anyEnabled = enabledCount > 0;
  const [showStrength, setShowStrength] = useState(false);
  const [showRandom, setShowRandom] = useState(false);
  const defaultToken = defaultWildcardToken(group.groupName);
  const [wildcardDraft, setWildcardDraft] = useState(group.wildcardToken ?? "");
  useEffect(() => { setWildcardDraft(group.wildcardToken ?? ""); }, [group.wildcardToken]);
  const effectiveToken = (wildcardDraft.trim() || defaultToken);
  const [tagQuery, setTagQuery] = useState("");
  useEffect(() => { if (!group.expanded) setTagQuery(""); }, [group.expanded]);
  const filteredTags = useMemo(() => {
    const q = tagQuery.trim().toLowerCase();
    if (!q) return group.tags;
    return group.tags.filter((tg) => (tg.name || "").toLowerCase().includes(q) || tg.tag.toLowerCase().includes(q));
  }, [group.tags, tagQuery]);

  return (
    <div className="rounded-md border border-border p-2">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <button type="button" className="flex items-center gap-1 text-xs font-medium flex-1 min-w-0" onClick={onToggleExpanded}>
          {group.expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {group.groupId.startsWith("tagdb-") && <Database className="h-3 w-3 shrink-0 text-muted-foreground/60" aria-label="Tag DB" />}
          <span className="truncate">{group.groupName}</span>
          <span className="text-[9px] text-muted-foreground shrink-0">{enabledCount}/{group.tags.length}</span>
        </button>
        <button type="button" title="ON/OFF" className={`shrink-0 rounded p-0.5 transition-colors ${anyEnabled ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-accent"}`} onClick={onToggleGroupEnabled}><Power className="h-3 w-3" /></button>
        <button type="button" title="Default Strength" className={`shrink-0 rounded p-0.5 transition-colors ${showStrength ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-accent"}`} onClick={() => setShowStrength((v) => !v)}><SlidersHorizontal className="h-3 w-3" /></button>
        <button type="button" title={t("promptGroup.random.title")} className={`shrink-0 rounded p-0.5 transition-colors ${group.randomMode ? "text-primary bg-primary/10" : showRandom ? "text-primary bg-primary/5" : "text-muted-foreground hover:bg-accent"}`} onClick={() => setShowRandom((v) => !v)}><Dices className="h-3 w-3" /></button>
        {isSystemGroup && <button type="button" title="Settings" className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-accent transition-colors" onClick={onOpenSystemSettings}><Settings className="h-3 w-3" /></button>}
        {!isSystemGroup && <button type="button" title="Edit Group" className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-accent transition-colors" onClick={onEditGroup}><Pencil className="h-3 w-3" /></button>}
        {group.expanded && <HoverSearch value={tagQuery} onChange={setTagQuery} className="shrink-0" />}
        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={onRemove}><Trash2 className="h-3 w-3 text-destructive" /></Button>
      </div>
      {showStrength && (
        <div className="mt-1.5 flex items-center gap-2">
          <Slider min={-10} max={10} step={0.1} value={[group.defaultStrength]} onValueChange={([v]) => onSetGroupDefaultStrength(Math.round(v * 10) / 10)}
            className="flex-1 [&_[data-slot=slider-track]]:h-0.5 [&_[data-slot=slider-range]]:h-0.5 [&_[data-slot=slider-thumb]]:h-2.5 [&_[data-slot=slider-thumb]]:w-2.5 [&_[data-slot=slider-thumb]]:border" />
          <span className="w-10 text-center text-[10px] font-mono bg-muted rounded px-1 py-0.5 shrink-0">{group.defaultStrength > 0 ? "+" : ""}{group.defaultStrength.toFixed(1)}</span>
        </div>
      )}
      {showRandom && (
        <div className="mt-1.5 space-y-1.5 rounded border border-border/60 bg-muted/30 p-1.5">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[10px] text-foreground">{t("promptGroup.random.enable")}</label>
            <button type="button" role="switch" aria-checked={group.randomMode} onClick={() => onSetRandomMode(!group.randomMode)}
              className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${group.randomMode ? "bg-primary" : "bg-muted-foreground/30"}`}>
              <span className="absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-[left]" style={{ left: group.randomMode ? "14px" : "2px" }} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-muted-foreground w-12 shrink-0">{t("promptGroup.random.count")}</label>
            <input type="number" min={1} max={Math.max(group.tags.length, 1)} value={group.randomCount} disabled={!group.randomMode}
              onChange={(e) => { const n = parseInt(e.target.value, 10); if (!Number.isNaN(n)) onSetRandomCount(n); }}
              className="h-5 w-12 rounded border border-border bg-background px-1 text-[10px] disabled:opacity-50" />
            <select value={group.randomSource} disabled={!group.randomMode} onChange={(e) => onSetRandomSource(e.target.value as "all" | "enabled")}
              className="h-5 flex-1 rounded border border-border bg-background px-1 text-[10px] disabled:opacity-50">
              <option value="enabled">{t("promptGroup.random.sourceEnabled")}</option>
              <option value="all">{t("promptGroup.random.sourceAll")}</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] text-muted-foreground">{t("promptGroup.wildcard.token")}</label>
            <div className="flex items-center gap-1.5">
              <input type="text" value={wildcardDraft} placeholder={defaultToken} onChange={(e) => setWildcardDraft(e.target.value)}
                onBlur={() => { const next = wildcardDraft.trim(); if ((group.wildcardToken ?? "") !== next) onSetWildcardToken(next.length > 0 ? next : null); }}
                className="h-5 min-w-0 flex-1 rounded border border-border bg-background px-1 text-[10px]" />
              <button type="button" title={t("promptGroup.wildcard.insert")}
                onClick={() => { if ((group.wildcardToken ?? "") !== effectiveToken) { onSetWildcardToken(effectiveToken); setWildcardDraft(effectiveToken); } onInsertWildcard(effectiveToken); }}
                className="h-5 shrink-0 rounded bg-primary px-1.5 text-[10px] font-medium text-primary-foreground hover:bg-primary/90">{t("promptGroup.wildcard.insert")}</button>
            </div>
          </div>
          <p className="text-[9px] text-muted-foreground leading-tight">{t("promptGroup.wildcard.hint")}</p>
        </div>
      )}
      {group.expanded && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {filteredTags.map((tag) => (
            <TagBadge key={tag.tagId} tag={tag} onToggle={() => onToggleTag(tag.tagId)} onSetStrength={(s) => onSetStrength(tag.tagId, s)} onEdit={() => onEditEntry(tag)} />
          ))}
        </div>
      )}
    </div>
  );
}

function TagBadge({ tag, onToggle, onSetStrength, onEdit }: {
  tag: SidebarPromptTag; onToggle: () => void; onSetStrength: (s: number) => void; onEdit: () => void;
}) {
  const [strength, setLocalStrength] = useState(tag.strength);
  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Badge variant={tag.enabled ? "default" : "outline"} className="cursor-pointer text-[11px] select-none transition-colors" onClick={onToggle}>
          {tag.name || tag.tag}
          {tag.strength !== 0 && <span className="ml-0.5 text-[9px] opacity-70">{tag.strength > 0 ? "+" : ""}{tag.strength.toFixed(1)}</span>}
        </Badge>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52 p-2 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium truncate flex-1">{tag.name || tag.tag}</p>
          <button type="button" title="Edit Entry" className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground" onClick={onEdit}><Pencil className="h-3 w-3" /></button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground w-4">-10</span>
          <Slider min={-10} max={10} step={0.1} value={[strength]}
            onValueChange={([v]) => { const rounded = Math.round(v * 10) / 10; setLocalStrength(rounded); onSetStrength(rounded); }} className="flex-1" />
          <span className="text-[10px] text-muted-foreground w-4 text-right">10</span>
          <span className="w-9 text-center text-xs font-mono bg-muted rounded px-1 py-0.5">{strength.toFixed(1)}</span>
        </div>
        <div className="flex gap-1">
          <button type="button" className="flex-1 rounded bg-muted px-2 py-1 text-[10px] text-muted-foreground hover:bg-accent" onClick={() => { setLocalStrength(0); onSetStrength(0); }}>Reset</button>
          <button type="button" className={`flex-1 rounded px-2 py-1 text-[10px] ${tag.enabled ? "bg-destructive/10 text-destructive hover:bg-destructive/20" : "bg-primary/10 text-primary hover:bg-primary/20"}`} onClick={onToggle}>{tag.enabled ? "OFF" : "ON"}</button>
        </div>
      </ContextMenuContent>
    </ContextMenu>
  );
}
