import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import PromptTextarea from "@/components/shared/PromptTextarea";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import type { SidebarPromptGroup } from "@/stores/sidebar-prompt-store";
import { assembleFullPrompt } from "@/lib/prompt-assembly";

interface CharacterPromptGroupsProps {
  targetId: string;
  onOpenGroupBrowser: () => void;
}

export default function CharacterPromptGroups({
  targetId,
  onOpenGroupBrowser,
}: CharacterPromptGroupsProps) {
  const { t } = useTranslation();
  const groups = useSidebarPromptStore((s) => s.targets[targetId]?.groups ?? []);
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
      {/* Groups list */}
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

      {/* Add group button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-1 text-xs"
        onClick={onOpenGroupBrowser}
      >
        <Plus className="h-3 w-3" />
        {t("promptGroup.selectGroup")}
      </Button>

      {/* Free text */}
      <PromptTextarea
        value={freeText}
        onChange={(v) => setFreeText(targetId, v)}
        placeholder={t("character.freeTextPlaceholder")}
        rows={2}
      />

      {/* Prompt preview */}
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

// ---- Sub-component for a single group ----

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
          {group.expanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          <span>{group.groupName}</span>
          <Badge variant="secondary" className="ml-1 text-[9px]">
            {enabledCount}/{group.tags.length}
          </Badge>
        </button>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0"
          onClick={onRemove}
        >
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      </div>

      {group.expanded && (
        <div className="mt-2 space-y-1.5">
          {group.tags.map((tag) => (
            <div key={tag.tagId} className="flex items-center gap-2">
              <Switch
                checked={tag.enabled}
                onCheckedChange={() => onToggleTag(tag.tagId)}
                className="h-4 w-7"
              />
              <span className={`flex-1 text-xs ${tag.enabled ? "" : "text-muted-foreground line-through"}`}>
                {tag.tag}
              </span>
              <div className="flex w-24 items-center gap-1">
                <Slider
                  value={[tag.strength]}
                  min={-10}
                  max={10}
                  step={1}
                  onValueChange={([v]) => onSetStrength(tag.tagId, v)}
                  className="flex-1"
                  disabled={!tag.enabled}
                />
                <span className="w-6 text-right text-[10px] text-muted-foreground">
                  {tag.strength}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
