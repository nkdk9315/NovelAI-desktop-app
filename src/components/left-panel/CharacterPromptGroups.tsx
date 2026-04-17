import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import PromptTextarea from "@/components/shared/PromptTextarea";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import { usePromptStore } from "@/stores/prompt-store";
import type { SidebarPromptGroup } from "@/stores/sidebar-prompt-store";
import type { PromptGroupDto, TagInput } from "@/types";
import { assembleFullPrompt } from "@/lib/prompt-assembly";
import { appendContributions, getPresetContributionsForCharacter } from "@/lib/preset-contributions";
import { useSidebarPresetGroupStore } from "@/stores/sidebar-preset-group-store";
import { usePresetStore } from "@/stores/preset-store";
import { toastError } from "@/lib/toast-error";
import * as ipc from "@/lib/ipc";
import PromptGroupEditModal from "@/components/modals/prompt-group/PromptGroupEditModal";
import SystemGroupSettingsModal from "@/components/modals/prompt-group/SystemGroupSettingsModal";
import SidebarEntryEditModal from "./SidebarEntryEditModal";
import { GroupItem } from "./CharacterPromptGroupEntry";

const EMPTY_GROUPS: SidebarPromptGroup[] = [];

interface CharacterPromptGroupsProps {
  targetId: string;
  onOpenGroupBrowser: () => void;
  textareaRows?: number;
  placeholder?: string;
}

export default function CharacterPromptGroups({
  targetId, onOpenGroupBrowser, textareaRows = 2, placeholder,
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
  const setGroupRandomMode = useSidebarPromptStore((s) => s.setGroupRandomMode);
  const setGroupRandomCount = useSidebarPromptStore((s) => s.setGroupRandomCount);
  const setGroupRandomSource = useSidebarPromptStore((s) => s.setGroupRandomSource);
  const setGroupWildcardToken = useSidebarPromptStore((s) => s.setGroupWildcardToken);
  const setPromptOverride = useSidebarPromptStore((s) => s.setPromptOverride);
  const clearPromptOverride = useSidebarPromptStore((s) => s.clearPromptOverride);
  const hasTarget = useSidebarPromptStore((s) => targetId in s.targets);
  const genres = usePromptStore((s) => s.genres);
  const loadGenres = usePromptStore((s) => s.loadGenres);
  const promptGroupFolders = usePromptStore((s) => s.promptGroupFolders);
  const loadPromptGroupFolders = usePromptStore((s) => s.loadPromptGroupFolders);
  const createPromptGroupFolder = usePromptStore((s) => s.createPromptGroupFolder);
  const updatePromptGroup = usePromptStore((s) => s.updatePromptGroup);
  const deletePromptGroup = usePromptStore((s) => s.deletePromptGroup);
  const loadPromptGroups = usePromptStore((s) => s.loadPromptGroups);

  const [editingGroup, setEditingGroup] = useState<PromptGroupDto | null>(null);
  const [editingSystemGroup, setEditingSystemGroup] = useState<{ id: string; name: string } | null>(null);
  const [editingEntry, setEditingEntry] = useState<{ groupId: string; tagId: string; name: string; tag: string; negativePrompt: string } | null>(null);

  useEffect(() => { if (genres.length === 0) loadGenres(); }, [genres.length, loadGenres]);
  useEffect(() => { loadPromptGroupFolders().catch(() => {}); }, [loadPromptGroupFolders]);

  const openEditGroup = async (groupId: string) => {
    try { const dto = await ipc.getPromptGroup(groupId); setEditingGroup(dto); } catch (e) { toastError(String(e)); }
  };

  const handleSaveGroup = async (data: { id: string; name: string; folderId: number | null; defaultGenreIds: string[]; tags: TagInput[]; isDefault: boolean; defaultStrength: number }) => {
    try { await updatePromptGroup({ id: data.id, name: data.name, folderId: data.folderId, defaultGenreIds: data.defaultGenreIds, tags: data.tags, isDefault: data.isDefault, defaultStrength: data.defaultStrength }); await loadPromptGroups(); } catch (e) { toastError(String(e)); }
  };

  const handleDeleteGroup = async (id: string) => {
    try { await deletePromptGroup(id); removeGroupFromTarget(targetId, id); await loadPromptGroups(); } catch (e) { toastError(String(e)); }
  };

  const handleSaveEntry = async (name: string, tag: string, negativePrompt: string) => {
    if (!editingEntry) return;
    try {
      const dto = await ipc.getPromptGroup(editingEntry.groupId);
      const tags: TagInput[] = dto.tags.map((tg) => tg.id === editingEntry.tagId ? { name, tag, negativePrompt, defaultStrength: tg.defaultStrength, thumbnailPath: tg.thumbnailPath ?? undefined } : { name: tg.name || undefined, tag: tg.tag, negativePrompt: tg.negativePrompt || undefined, defaultStrength: tg.defaultStrength, thumbnailPath: tg.thumbnailPath ?? undefined });
      await updatePromptGroup({ id: editingEntry.groupId, tags }); await loadPromptGroups();
    } catch (e) { toastError(String(e)); }
  };

  const presetInstances = useSidebarPresetGroupStore((s) => s.instances);
  const allPresets = usePresetStore((s) => s.presets);
  const assembled = useMemo(() => {
    const base = assembleFullPrompt("", groups);
    const contrib = getPresetContributionsForCharacter(targetId, presetInstances, allPresets);
    return appendContributions(base, contrib.positive);
  }, [groups, targetId, presetInstances, allPresets]);
  const highlightTokens = useMemo(() => groups.map((g) => g.wildcardToken).filter((tok): tok is string => !!tok && tok.length > 0), [groups]);

  if (!hasTarget) return null;

  const displayValue = promptOverride ?? assembled;
  const isDirty = promptOverride != null;
  const insertWildcardToken = (token: string) => {
    const current = promptOverride ?? assembled;
    if (current.includes(token)) return;
    setPromptOverride(targetId, current + token);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <PromptTextarea value={displayValue} onChange={(v) => setPromptOverride(targetId, v)} placeholder={placeholder ?? t("character.freeTextPlaceholder")} rows={textareaRows} highlightTokens={highlightTokens} />
        {isDirty && (
          <button type="button" title={t("prompt.clearOverride")} onClick={() => clearPromptOverride(targetId)} className="absolute top-1 right-1 rounded p-0.5 text-primary hover:bg-accent"><RotateCcw className="h-3 w-3" /></button>
        )}
      </div>

      {groups.map((group) => (
        <GroupItem key={group.groupId} group={group}
          onToggleExpanded={() => toggleGroupExpanded(targetId, group.groupId)}
          onRemove={() => removeGroupFromTarget(targetId, group.groupId)}
          onToggleTag={(tagId) => toggleTag(targetId, group.groupId, tagId)}
          onSetStrength={(tagId, s) => setTagStrength(targetId, group.groupId, tagId, s)}
          onToggleGroupEnabled={() => toggleGroupEnabled(targetId, group.groupId)}
          onSetGroupDefaultStrength={(s) => setGroupDefaultStrength(targetId, group.groupId, s)}
          onSetRandomMode={(v) => setGroupRandomMode(targetId, group.groupId, v)}
          onSetRandomCount={(n) => setGroupRandomCount(targetId, group.groupId, n)}
          onSetRandomSource={(src) => setGroupRandomSource(targetId, group.groupId, src)}
          onSetWildcardToken={(tok) => setGroupWildcardToken(targetId, group.groupId, tok)}
          onInsertWildcard={insertWildcardToken}
          onEditGroup={() => openEditGroup(group.groupId)}
          onOpenSystemSettings={() => setEditingSystemGroup({ id: group.groupId, name: group.groupName })}
          onEditEntry={(tag) => setEditingEntry({ groupId: group.groupId, tagId: tag.tagId, name: tag.name, tag: tag.tag, negativePrompt: tag.negativePrompt || "" })} />
      ))}

      <Button variant="outline" size="sm" className="w-full gap-1 text-xs" onClick={onOpenGroupBrowser}><Plus className="h-3 w-3" />{t("promptGroup.selectGroup")}</Button>

      <PromptGroupEditModal open={editingGroup !== null} onOpenChange={(o) => { if (!o) setEditingGroup(null); }} group={editingGroup} genres={genres}
        folders={promptGroupFolders} createFolder={createPromptGroupFolder} onSave={handleSaveGroup} onDelete={handleDeleteGroup} contentClassName="max-w-md left-[8.5rem]! translate-x-0!" />
      <SystemGroupSettingsModal open={editingSystemGroup !== null} onOpenChange={(o) => { if (!o) setEditingSystemGroup(null); }}
        systemGroupId={editingSystemGroup?.id ?? null} systemGroupName={editingSystemGroup?.name ?? ""} genres={genres} contentClassName="max-w-md left-[8.5rem]! translate-x-0!" />
      <SidebarEntryEditModal open={editingEntry !== null} onOpenChange={(o) => { if (!o) setEditingEntry(null); }} initialName={editingEntry?.name ?? ""} initialTag={editingEntry?.tag ?? ""} initialNegative={editingEntry?.negativePrompt ?? ""} onSave={handleSaveEntry} />
    </div>
  );
}
