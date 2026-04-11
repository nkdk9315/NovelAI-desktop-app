import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import PromptTextarea from "@/components/shared/PromptTextarea";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import type { SidebarPromptGroup, SidebarPromptTag } from "@/stores/sidebar-prompt-store";
import { assembleFullPrompt } from "@/lib/prompt-assembly";

const EMPTY_GROUPS: SidebarPromptGroup[] = [];

interface CharacterPromptGroupsProps {
  targetId: string;
  onOpenGroupBrowser: () => void;
}

export default function CharacterPromptGroups({
  targetId,
  onOpenGroupBrowser,
}: CharacterPromptGroupsProps) {
  const { t } = useTranslation();
  const groups = useSidebarPromptStore((s) => s.targets[targetId]?.groups ?? EMPTY_GROUPS);
  const freeText = useSidebarPromptStore((s) => s.targets[targetId]?.freeText ?? "");
  const toggleTag = useSidebarPromptStore((s) => s.toggleTag);
  const setTagStrength = useSidebarPromptStore((s) => s.setTagStrength);
  const toggleGroupExpanded = useSidebarPromptStore((s) => s.toggleGroupExpanded);
  const removeGroupFromTarget = useSidebarPromptStore((s) => s.removeGroupFromTarget);
  const setFreeText = useSidebarPromptStore((s) => s.setFreeText);
  const hasTarget = useSidebarPromptStore((s) => targetId in s.targets);
  const [showPreview, setShowPreview] = useState(false);

  if (!hasTarget) return null;

  const preview = assembleFullPrompt(freeText, groups);

  return (
    <div className="space-y-2">
      {groups.map((group) => (
        <GroupItem
          key={group.groupId}
          targetId={targetId}
          group={group}
          onToggleExpanded={() => toggleGroupExpanded(targetId, group.groupId)}
          onRemove={() => removeGroupFromTarget(targetId, group.groupId)}
          onToggleTag={(tagId) => toggleTag(targetId, group.groupId, tagId)}
          onSetStrength={(tagId, s) => setTagStrength(targetId, group.groupId, tagId, s)}
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

      <PromptTextarea
        value={freeText}
        onChange={(v) => setFreeText(targetId, v)}
        placeholder={t("character.freeTextPlaceholder")}
        rows={2}
      />

      <button
        type="button"
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setShowPreview(!showPreview)}
      >
        {showPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        {t("character.promptPreview")}
      </button>
      {showPreview && (
        <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground break-all">
          {preview || "—"}
        </div>
      )}
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
}

function GroupItem({
  group,
  onToggleExpanded,
  onRemove,
  onToggleTag,
  onSetStrength,
}: GroupItemProps) {
  const enabledCount = group.tags.filter((t) => t.enabled).length;

  return (
    <div className="rounded-md border border-border p-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="flex items-center gap-1 text-xs font-medium"
          onClick={onToggleExpanded}
        >
          {group.expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <span>{group.groupName}</span>
          <span className="text-[9px] text-muted-foreground">{enabledCount}/{group.tags.length}</span>
        </button>
        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={onRemove}>
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      </div>

      {group.expanded && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {group.tags.map((tag) => (
            <TagBadge
              key={tag.tagId}
              tag={tag}
              onToggle={() => onToggleTag(tag.tagId)}
              onSetStrength={(s) => onSetStrength(tag.tagId, s)}
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
}: {
  tag: SidebarPromptTag;
  onToggle: () => void;
  onSetStrength: (s: number) => void;
}) {
  const [strength, setLocalStrength] = useState(tag.strength);

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Badge
          variant={tag.enabled ? "secondary" : "outline"}
          className={`cursor-pointer text-[11px] select-none ${
            tag.enabled ? "" : "opacity-40 line-through"
          }`}
          onClick={onToggle}
        >
          {tag.name || tag.tag}
          {tag.strength !== 0 && (
            <span className="ml-0.5 text-[9px] text-muted-foreground">
              {tag.strength > 0 ? "+" : ""}{tag.strength.toFixed(1)}
            </span>
          )}
        </Badge>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuLabel className="text-[10px]">{tag.name || tag.tag}</ContextMenuLabel>
        <div className="px-2 py-1.5 flex items-center gap-2">
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
          <span className="w-7 text-right text-[10px] text-muted-foreground">
            {strength.toFixed(1)}
          </span>
        </div>
        <ContextMenuItem onClick={onToggle}>
          {tag.enabled ? "OFF" : "ON"}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
