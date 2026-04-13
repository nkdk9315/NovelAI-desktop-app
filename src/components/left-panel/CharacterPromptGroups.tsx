import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, Plus, Trash2, Power, SlidersHorizontal, RotateCcw, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import PromptTextarea from "@/components/shared/PromptTextarea";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import { usePromptStore } from "@/stores/prompt-store";
import type { SidebarPromptGroup, SidebarPromptTag } from "@/stores/sidebar-prompt-store";
import type { PromptGroupDto, TagInput } from "@/types";
import { assembleFullPrompt } from "@/lib/prompt-assembly";
import { toastError } from "@/lib/toast-error";
import * as ipc from "@/lib/ipc";
import PromptGroupEditModal from "@/components/modals/prompt-group/PromptGroupEditModal";
import SidebarEntryEditModal from "./SidebarEntryEditModal";

const EMPTY_GROUPS: SidebarPromptGroup[] = [];

interface CharacterPromptGroupsProps {
  targetId: string;
  onOpenGroupBrowser: () => void;
  textareaRows?: number;
  placeholder?: string;
}

export default function CharacterPromptGroups({
  targetId,
  onOpenGroupBrowser,
  textareaRows = 2,
  placeholder,
}: CharacterPromptGroupsProps) {
  const { t } = useTranslation();
  const groups = useSidebarPromptStore((s) => s.targets[targetId]?.groups ?? EMPTY_GROUPS);
  const promptOverride = useSidebarPromptStore((s) => s.targets[targetId]?.promptOverride ?? null);
  const toggleTag = useSidebarPromptStore((s) => s.toggleTag);
  const setTagStrength = useSidebarPromptStore((s) => s.setTagStrength);
  const toggleGroupExpanded = useSidebarPromptStore((s) => s.toggleGroupExpanded);
  const removeGroupFromTarget = useSidebarPromptStore((s) => s.removeGroupFromTarget);
  const setGroupDefaultStrength = useSidebarPromptStore((s) => s.setGroupDefaultStrength);
  const toggleGroupEnabled = useSidebarPromptStore((s) => s.toggleGroupEnabled);
  const setPromptOverride = useSidebarPromptStore((s) => s.setPromptOverride);
  const clearPromptOverride = useSidebarPromptStore((s) => s.clearPromptOverride);
  const hasTarget = useSidebarPromptStore((s) => targetId in s.targets);
  const genres = usePromptStore((s) => s.genres);
  const loadGenres = usePromptStore((s) => s.loadGenres);
  const updatePromptGroup = usePromptStore((s) => s.updatePromptGroup);
  const deletePromptGroup = usePromptStore((s) => s.deletePromptGroup);
  const loadPromptGroups = usePromptStore((s) => s.loadPromptGroups);

  const [editingGroup, setEditingGroup] = useState<PromptGroupDto | null>(null);
  const [editingEntry, setEditingEntry] = useState<
    { groupId: string; tagId: string; name: string; tag: string } | null
  >(null);

  useEffect(() => {
    if (genres.length === 0) loadGenres();
  }, [genres.length, loadGenres]);

  const openEditGroup = async (groupId: string) => {
    try {
      const dto = await ipc.getPromptGroup(groupId);
      setEditingGroup(dto);
    } catch (e) {
      toastError(String(e));
    }
  };

  const handleSaveGroup = async (data: {
    id: string;
    name: string;
    genreId?: string | null;
    tags: TagInput[];
    isDefault: boolean;
    defaultStrength: number;
  }) => {
    try {
      await updatePromptGroup({
        id: data.id,
        name: data.name,
        genreId: data.genreId,
        tags: data.tags,
        isDefault: data.isDefault,
        defaultStrength: data.defaultStrength,
      });
      await loadPromptGroups();
    } catch (e) {
      toastError(String(e));
    }
  };

  const handleDeleteGroup = async (id: string) => {
    try {
      await deletePromptGroup(id);
      removeGroupFromTarget(targetId, id);
      await loadPromptGroups();
    } catch (e) {
      toastError(String(e));
    }
  };

  const handleSaveEntry = async (name: string, tag: string) => {
    if (!editingEntry) return;
    try {
      const dto = await ipc.getPromptGroup(editingEntry.groupId);
      const tags: TagInput[] = dto.tags.map((t) =>
        t.id === editingEntry.tagId
          ? { name, tag, defaultStrength: t.defaultStrength, thumbnailPath: t.thumbnailPath ?? undefined }
          : { name: t.name || undefined, tag: t.tag, defaultStrength: t.defaultStrength, thumbnailPath: t.thumbnailPath ?? undefined },
      );
      await updatePromptGroup({ id: editingEntry.groupId, tags });
      await loadPromptGroups();
    } catch (e) {
      toastError(String(e));
    }
  };

  const assembled = useMemo(() => assembleFullPrompt("", groups), [groups]);

  if (!hasTarget) return null;

  const displayValue = promptOverride ?? assembled;
  const isDirty = promptOverride != null;

  return (
    <div className="space-y-2">
      <div className="relative">
        <PromptTextarea
          value={displayValue}
          onChange={(v) => setPromptOverride(targetId, v)}
          placeholder={placeholder ?? t("character.freeTextPlaceholder")}
          rows={textareaRows}
        />
        {isDirty && (
          <button
            type="button"
            title={t("prompt.clearOverride")}
            onClick={() => clearPromptOverride(targetId)}
            className="absolute top-1 right-1 rounded p-0.5 text-primary hover:bg-accent"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        )}
      </div>

      {groups.map((group) => (
        <GroupItem
          key={group.groupId}
          targetId={targetId}
          group={group}
          onToggleExpanded={() => toggleGroupExpanded(targetId, group.groupId)}
          onRemove={() => removeGroupFromTarget(targetId, group.groupId)}
          onToggleTag={(tagId) => toggleTag(targetId, group.groupId, tagId)}
          onSetStrength={(tagId, s) => setTagStrength(targetId, group.groupId, tagId, s)}
          onToggleGroupEnabled={() => toggleGroupEnabled(targetId, group.groupId)}
          onSetGroupDefaultStrength={(s) => setGroupDefaultStrength(targetId, group.groupId, s)}
          onEditGroup={() => openEditGroup(group.groupId)}
          onEditEntry={(tag) =>
            setEditingEntry({
              groupId: group.groupId,
              tagId: tag.tagId,
              name: tag.name,
              tag: tag.tag,
            })
          }
        />
      ))}

      <Button
        variant="outline"
        size="sm"
        className="w-full gap-1 text-xs"
        onClick={onOpenGroupBrowser}
      >
        <Plus className="h-3 w-3" />
        {t("promptGroup.selectGroup")}
      </Button>

      <PromptGroupEditModal
        open={editingGroup !== null}
        onOpenChange={(isOpen) => { if (!isOpen) setEditingGroup(null); }}
        group={editingGroup}
        genres={genres}
        onSave={handleSaveGroup}
        onDelete={handleDeleteGroup}
        contentClassName="max-w-md left-[8.5rem]! translate-x-0!"
      />

      <SidebarEntryEditModal
        open={editingEntry !== null}
        onOpenChange={(isOpen) => { if (!isOpen) setEditingEntry(null); }}
        initialName={editingEntry?.name ?? ""}
        initialTag={editingEntry?.tag ?? ""}
        onSave={handleSaveEntry}
      />
    </div>
  );
}

interface GroupItemProps {
  targetId: string;
  group: SidebarPromptGroup;
  onToggleExpanded: () => void;
  onRemove: () => void;
  onToggleTag: (tagId: string) => void;
  onSetStrength: (tagId: string, strength: number) => void;
  onToggleGroupEnabled: () => void;
  onSetGroupDefaultStrength: (strength: number) => void;
  onEditGroup: () => void;
  onEditEntry: (tag: SidebarPromptTag) => void;
}

function GroupItem({
  group,
  onToggleExpanded,
  onRemove,
  onToggleTag,
  onSetStrength,
  onToggleGroupEnabled,
  onSetGroupDefaultStrength,
  onEditGroup,
  onEditEntry,
}: GroupItemProps) {
  const enabledCount = group.tags.filter((t) => t.enabled).length;
  const anyEnabled = enabledCount > 0;
  const [showStrength, setShowStrength] = useState(false);

  return (
    <div className="rounded-md border border-border p-2">
      <div className="flex items-center justify-between gap-1">
        <button
          type="button"
          className="flex items-center gap-1 text-xs font-medium flex-1 min-w-0"
          onClick={onToggleExpanded}
        >
          {group.expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <span className="truncate">{group.groupName}</span>
          <span className="text-[9px] text-muted-foreground shrink-0">{enabledCount}/{group.tags.length}</span>
        </button>
        <button
          type="button"
          title="ON/OFF"
          className={`shrink-0 rounded p-0.5 transition-colors ${anyEnabled ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-accent"}`}
          onClick={onToggleGroupEnabled}
        >
          <Power className="h-3 w-3" />
        </button>
        <button
          type="button"
          title="Default Strength"
          className={`shrink-0 rounded p-0.5 transition-colors ${showStrength ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-accent"}`}
          onClick={() => setShowStrength((v) => !v)}
        >
          <SlidersHorizontal className="h-3 w-3" />
        </button>
        <button
          type="button"
          title="Edit Group"
          className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-accent transition-colors"
          onClick={onEditGroup}
        >
          <Pencil className="h-3 w-3" />
        </button>
        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={onRemove}>
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      </div>

      {showStrength && (
        <div className="mt-1.5 flex items-center gap-2">
          <Slider
            min={-10} max={10} step={0.1}
            value={[group.defaultStrength]}
            onValueChange={([v]) => onSetGroupDefaultStrength(Math.round(v * 10) / 10)}
            className="flex-1 [&_[data-slot=slider-track]]:h-0.5 [&_[data-slot=slider-range]]:h-0.5 [&_[data-slot=slider-thumb]]:h-2.5 [&_[data-slot=slider-thumb]]:w-2.5 [&_[data-slot=slider-thumb]]:border"
          />
          <span className="w-10 text-center text-[10px] font-mono bg-muted rounded px-1 py-0.5 shrink-0">
            {group.defaultStrength > 0 ? "+" : ""}{group.defaultStrength.toFixed(1)}
          </span>
        </div>
      )}

      {group.expanded && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {group.tags.map((tag) => (
            <TagBadge
              key={tag.tagId}
              tag={tag}
              onToggle={() => onToggleTag(tag.tagId)}
              onSetStrength={(s) => onSetStrength(tag.tagId, s)}
              onEdit={() => onEditEntry(tag)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TagBadge({
  tag,
  onToggle,
  onSetStrength,
  onEdit,
}: {
  tag: SidebarPromptTag;
  onToggle: () => void;
  onSetStrength: (s: number) => void;
  onEdit: () => void;
}) {
  const [strength, setLocalStrength] = useState(tag.strength);

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Badge
          variant={tag.enabled ? "default" : "outline"}
          className="cursor-pointer text-[11px] select-none transition-colors"
          onClick={onToggle}
        >
          {tag.name || tag.tag}
          {tag.strength !== 0 && (
            <span className="ml-0.5 text-[9px] opacity-70">
              {tag.strength > 0 ? "+" : ""}{tag.strength.toFixed(1)}
            </span>
          )}
        </Badge>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52 p-2 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium truncate flex-1">{tag.name || tag.tag}</p>
          <button
            type="button"
            title="Edit Entry"
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={onEdit}
          >
            <Pencil className="h-3 w-3" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground w-4">-10</span>
          <Slider
            min={-10} max={10} step={0.1}
            value={[strength]}
            onValueChange={([v]) => {
              const rounded = Math.round(v * 10) / 10;
              setLocalStrength(rounded);
              onSetStrength(rounded);
            }}
            className="flex-1"
          />
          <span className="text-[10px] text-muted-foreground w-4 text-right">10</span>
          <span className="w-9 text-center text-xs font-mono bg-muted rounded px-1 py-0.5">
            {strength.toFixed(1)}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            className="flex-1 rounded bg-muted px-2 py-1 text-[10px] text-muted-foreground hover:bg-accent"
            onClick={() => { setLocalStrength(0); onSetStrength(0); }}
          >
            Reset
          </button>
          <button
            type="button"
            className={`flex-1 rounded px-2 py-1 text-[10px] ${
              tag.enabled
                ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                : "bg-primary/10 text-primary hover:bg-primary/20"
            }`}
            onClick={onToggle}
          >
            {tag.enabled ? "OFF" : "ON"}
          </button>
        </div>
      </ContextMenuContent>
    </ContextMenu>
  );
}
