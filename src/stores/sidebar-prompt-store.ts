import { create } from "zustand";
import type { PromptGroupDto } from "@/types";
import * as ipc from "@/lib/ipc";
import {
  type SidebarPromptTag,
  type SidebarPromptGroup,
  type TargetPromptState,
  type SidebarPromptState,
  groupDtoToSidebar,
  updateTarget,
  updateGroupInTarget,
  migrateTargets,
} from "./sidebar-prompt-utils";
import { newTarget, updateTargetSynced } from "./sidebar-prompt-text-sync";
import { newDialogueLine, type DialogueLine } from "@/lib/dialogue";
import { newSfxLine, type SfxLine, type SfxTexture } from "@/lib/sound-effects";

export type { SidebarPromptTag, SidebarPromptGroup, TargetPromptState };

// ---- Store ----

interface SidebarPromptActions {
  initTarget: (targetId: string, defaultGroups?: PromptGroupDto[]) => void;
  removeTarget: (targetId: string) => void;
  addGroupToTarget: (targetId: string, group: PromptGroupDto) => void;
  removeGroupFromTarget: (targetId: string, groupId: string) => void;
  toggleTag: (targetId: string, groupId: string, tagId: string) => void;
  setTagStrength: (targetId: string, groupId: string, tagId: string, strength: number) => void;
  toggleAllTags: (targetId: string, groupId: string, enabled: boolean) => void;
  toggleGroupExpanded: (targetId: string, groupId: string) => void;
  setGroupDefaultStrength: (targetId: string, groupId: string, strength: number) => void;
  toggleGroupEnabled: (targetId: string, groupId: string) => void;
  setGroupRandomMode: (targetId: string, groupId: string, enabled: boolean) => void;
  setGroupRandomCount: (targetId: string, groupId: string, count: number) => void;
  setGroupRandomSource: (targetId: string, groupId: string, source: "all" | "enabled") => void;
  setGroupWildcardToken: (targetId: string, groupId: string, token: string | null) => void;
  addSystemTag: (targetId: string, groupId: string, tag: { name: string; category: number }) => void;
  removeSystemTag: (targetId: string, groupId: string, tagId: string) => void;
  setFreeText: (targetId: string, text: string) => void;
  setPromptOverride: (targetId: string, text: string) => void;
  clearPromptOverride: (targetId: string) => void;
  setNegativeOverride: (targetId: string, text: string) => void;
  clearNegativeOverride: (targetId: string) => void;
  addDialogueLine: (targetId: string) => void;
  updateDialogueLine: (targetId: string, lineId: string, partial: Partial<Omit<DialogueLine, "id">>) => void;
  removeDialogueLine: (targetId: string, lineId: string) => void;
  addSfx: (targetId: string, preset?: { text: string; texture: SfxTexture }) => void;
  updateSfx: (targetId: string, sfxId: string, partial: Partial<Omit<SfxLine, "id">>) => void;
  removeSfx: (targetId: string, sfxId: string) => void;
  toggleEffect: (targetId: string, effectId: string) => void;
  saveSidebarPromptState: (projectId: string) => void;
  loadSidebarPromptState: (projectId: string) => Promise<void>;
  setTargets: (targets: Record<string, TargetPromptState>) => void;
}

export const useSidebarPromptStore = create<SidebarPromptState & SidebarPromptActions>()((set) => ({
  targets: {},

  initTarget: (targetId, defaultGroups) =>
    set((state) => {
      if (state.targets[targetId]) return state;
      const groups = defaultGroups ? defaultGroups.map(groupDtoToSidebar) : [];
      return { targets: { ...state.targets, [targetId]: newTarget(groups) } };
    }),

  removeTarget: (targetId) =>
    set((state) => {
      const next = { ...state.targets };
      delete next[targetId];
      return { targets: next };
    }),

  addGroupToTarget: (targetId, group) =>
    set((state) =>
      updateTargetSynced(state, targetId, (target) => {
        if (target.groups.some((g) => g.groupId === group.id)) return target;
        return { ...target, groups: [...target.groups, groupDtoToSidebar(group)] };
      }),
    ),

  removeGroupFromTarget: (targetId, groupId) =>
    set((state) =>
      updateTargetSynced(state, targetId, (target) => ({
        ...target, groups: target.groups.filter((g) => g.groupId !== groupId),
      })),
    ),

  toggleTag: (targetId, groupId, tagId) =>
    set((state) =>
      updateTargetSynced(state, targetId, (target) =>
        updateGroupInTarget(target, groupId, (group) => ({
          ...group,
          tags: group.tags.map((t) => {
            if (t.tagId !== tagId) return t;
            const nextEnabled = !t.enabled;
            return nextEnabled ? { ...t, enabled: true, strength: group.defaultStrength } : { ...t, enabled: false };
          }),
        })),
      ),
    ),

  setTagStrength: (targetId, groupId, tagId, strength) =>
    set((state) =>
      updateTargetSynced(state, targetId, (target) =>
        updateGroupInTarget(target, groupId, (group) => ({
          ...group,
          tags: group.tags.map((t) => (t.tagId === tagId ? { ...t, strength } : t)),
        })),
      ),
    ),

  toggleAllTags: (targetId, groupId, enabled) =>
    set((state) =>
      updateTargetSynced(state, targetId, (target) =>
        updateGroupInTarget(target, groupId, (group) => ({
          ...group, tags: group.tags.map((t) => ({ ...t, enabled })),
        })),
      ),
    ),

  toggleGroupExpanded: (targetId, groupId) =>
    set((state) =>
      updateTargetSynced(state, targetId, (target) =>
        updateGroupInTarget(target, groupId, (group) => ({ ...group, expanded: !group.expanded })),
      ),
    ),

  setGroupDefaultStrength: (targetId, groupId, strength) =>
    set((state) =>
      updateTargetSynced(state, targetId, (target) =>
        updateGroupInTarget(target, groupId, (group) => ({ ...group, defaultStrength: strength })),
      ),
    ),

  toggleGroupEnabled: (targetId, groupId) =>
    set((state) =>
      updateTargetSynced(state, targetId, (target) =>
        updateGroupInTarget(target, groupId, (group) => {
          const anyEnabled = group.tags.some((t) => t.enabled);
          if (anyEnabled) {
            const saved = group.tags.filter((t) => t.enabled).map((t) => ({ tagId: t.tagId, strength: t.strength }));
            return { ...group, savedEnabledTags: saved, tags: group.tags.map((t) => ({ ...t, enabled: false })) };
          }
          if (!group.savedEnabledTags || group.savedEnabledTags.length === 0) return group;
          const savedMap = new Map(group.savedEnabledTags.map((s) => [s.tagId, s.strength]));
          return {
            ...group, savedEnabledTags: null,
            tags: group.tags.map((t) => savedMap.has(t.tagId) ? { ...t, enabled: true, strength: savedMap.get(t.tagId)! } : t),
          };
        }),
      ),
    ),

  setGroupRandomMode: (targetId, groupId, enabled) => {
    set((state) => updateTargetSynced(state, targetId, (target) => updateGroupInTarget(target, groupId, (group) => ({ ...group, randomMode: enabled }))));
    ipc.updatePromptGroup({ id: groupId, randomMode: enabled }).catch(() => {});
  },

  setGroupRandomCount: (targetId, groupId, count) => {
    const next = Math.max(1, Math.floor(count));
    set((state) => updateTargetSynced(state, targetId, (target) => updateGroupInTarget(target, groupId, (group) => ({ ...group, randomCount: next }))));
    ipc.updatePromptGroup({ id: groupId, randomCount: next }).catch(() => {});
  },

  setGroupRandomSource: (targetId, groupId, source) => {
    set((state) => updateTargetSynced(state, targetId, (target) => updateGroupInTarget(target, groupId, (group) => ({ ...group, randomSource: source }))));
    ipc.updatePromptGroup({ id: groupId, randomSource: source }).catch(() => {});
  },

  setGroupWildcardToken: (targetId, groupId, token) => {
    const normalized = token && token.trim().length > 0 ? token.trim() : null;
    set((state) => updateTargetSynced(state, targetId, (target) => updateGroupInTarget(target, groupId, (group) => ({ ...group, wildcardToken: normalized }))));
    ipc.updatePromptGroup({ id: groupId, wildcardToken: normalized }).catch(() => {});
  },

  addSystemTag: (targetId, groupId, tag) =>
    set((state) =>
      updateTargetSynced(state, targetId, (target) =>
        updateGroupInTarget(target, groupId, (group) => {
          if (group.tags.some((t) => t.tag === tag.name)) return group;
          const newTag: SidebarPromptTag = {
            tagId: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: tag.name, tag: tag.name, negativePrompt: "", enabled: true,
            strength: group.defaultStrength, defaultStrength: group.defaultStrength, thumbnailPath: null,
          };
          return { ...group, tags: [...group.tags, newTag] };
        }),
      ),
    ),

  removeSystemTag: (targetId, groupId, tagId) =>
    set((state) =>
      updateTargetSynced(state, targetId, (target) =>
        updateGroupInTarget(target, groupId, (group) => ({ ...group, tags: group.tags.filter((t) => t.tagId !== tagId) })),
      ),
    ),

  setFreeText: (targetId, text) =>
    set((state) => updateTarget(state, targetId, (target) => ({ ...target, freeText: text }))),

  setPromptOverride: (targetId, text) =>
    set((state) => updateTarget(state, targetId, (target) => ({ ...target, promptOverride: text }))),

  clearPromptOverride: (targetId) =>
    set((state) => updateTarget(state, targetId, (target) => ({ ...target, promptOverride: null }))),

  setNegativeOverride: (targetId, text) =>
    set((state) => updateTarget(state, targetId, (target) => ({ ...target, negativeOverride: text }))),

  clearNegativeOverride: (targetId) =>
    set((state) => updateTarget(state, targetId, (target) => ({ ...target, negativeOverride: null }))),

  addDialogueLine: (targetId) =>
    set((state) => updateTarget(state, targetId, (target) => ({
      ...target, dialogue: [...(target.dialogue ?? []), newDialogueLine()],
    }))),

  updateDialogueLine: (targetId, lineId, partial) =>
    set((state) => updateTarget(state, targetId, (target) => ({
      ...target, dialogue: (target.dialogue ?? []).map((l) => (l.id === lineId ? { ...l, ...partial } : l)),
    }))),

  removeDialogueLine: (targetId, lineId) =>
    set((state) => updateTarget(state, targetId, (target) => ({
      ...target, dialogue: (target.dialogue ?? []).filter((l) => l.id !== lineId),
    }))),

  addSfx: (targetId, preset) =>
    set((state) => updateTarget(state, targetId, (target) => ({
      ...target, sfx: [...(target.sfx ?? []), newSfxLine(preset?.text, preset?.texture)],
    }))),

  updateSfx: (targetId, sfxId, partial) =>
    set((state) => updateTarget(state, targetId, (target) => ({
      ...target, sfx: (target.sfx ?? []).map((l) => (l.id === sfxId ? { ...l, ...partial } : l)),
    }))),

  removeSfx: (targetId, sfxId) =>
    set((state) => updateTarget(state, targetId, (target) => ({
      ...target, sfx: (target.sfx ?? []).filter((l) => l.id !== sfxId),
    }))),

  toggleEffect: (targetId, effectId) =>
    set((state) => updateTarget(state, targetId, (target) => {
      const on = target.effects ?? [];
      return { ...target, effects: on.includes(effectId) ? on.filter((e) => e !== effectId) : [...on, effectId] };
    })),

  saveSidebarPromptState: (projectId) => {
    const { targets } = useSidebarPromptStore.getState();
    ipc.setSetting(`sidebar_prompts_${projectId}`, JSON.stringify(targets)).catch(() => {});
  },

  setTargets: (targets) => set({ targets: migrateTargets(targets) }),

  loadSidebarPromptState: async (projectId) => {
    try {
      const settings = await ipc.getSettings();
      const raw = settings[`sidebar_prompts_${projectId}`];
      if (raw) {
        const parsed: Record<string, TargetPromptState> = JSON.parse(raw);
        set({ targets: migrateTargets(parsed) });
      } else {
        set({ targets: {} });
      }
    } catch {
      set({ targets: {} });
    }
  },
}));
