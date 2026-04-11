import { create } from "zustand";
import type { PromptGroupDto } from "@/types";
import * as ipc from "@/lib/ipc";

// ---- Types ----

export interface SidebarPromptTag {
  tagId: string;
  name: string;
  tag: string;
  enabled: boolean;
  strength: number;
  defaultStrength: number;
  thumbnailPath: string | null;
}

export interface SidebarPromptGroup {
  groupId: string;
  groupName: string;
  isSystem: boolean;
  category: number | null;
  tags: SidebarPromptTag[];
  expanded: boolean;
}

export interface TargetPromptState {
  groups: SidebarPromptGroup[];
  freeText: string;
}

// ---- Store ----

interface SidebarPromptState {
  targets: Record<string, TargetPromptState>;

  initTarget: (targetId: string, defaultGroups?: PromptGroupDto[]) => void;
  removeTarget: (targetId: string) => void;

  addGroupToTarget: (targetId: string, group: PromptGroupDto) => void;
  removeGroupFromTarget: (targetId: string, groupId: string) => void;

  toggleTag: (targetId: string, groupId: string, tagId: string) => void;
  setTagStrength: (targetId: string, groupId: string, tagId: string, strength: number) => void;
  toggleAllTags: (targetId: string, groupId: string, enabled: boolean) => void;
  toggleGroupExpanded: (targetId: string, groupId: string) => void;

  addSystemTag: (targetId: string, groupId: string, tag: { name: string; category: number }) => void;
  removeSystemTag: (targetId: string, groupId: string, tagId: string) => void;

  setFreeText: (targetId: string, text: string) => void;

  saveSidebarPromptState: (projectId: string) => void;
  loadSidebarPromptState: (projectId: string) => Promise<void>;
}

function groupDtoToSidebar(dto: PromptGroupDto): SidebarPromptGroup {
  return {
    groupId: dto.id,
    groupName: dto.name,
    isSystem: dto.isSystem,
    category: dto.category,
    tags: dto.tags.map((t) => ({
      tagId: t.id,
      name: t.name || t.tag,
      tag: t.tag,
      enabled: false,
      strength: t.defaultStrength,
      defaultStrength: t.defaultStrength,
      thumbnailPath: t.thumbnailPath,
    })),
    expanded: false,
  };
}

function updateTarget(
  state: SidebarPromptState,
  targetId: string,
  updater: (target: TargetPromptState) => TargetPromptState,
): Partial<SidebarPromptState> {
  const target = state.targets[targetId];
  if (!target) return {};
  return { targets: { ...state.targets, [targetId]: updater(target) } };
}

function updateGroupInTarget(
  target: TargetPromptState,
  groupId: string,
  updater: (group: SidebarPromptGroup) => SidebarPromptGroup,
): TargetPromptState {
  return {
    ...target,
    groups: target.groups.map((g) => (g.groupId === groupId ? updater(g) : g)),
  };
}

export const useSidebarPromptStore = create<SidebarPromptState>()((set) => ({
  targets: {},

  initTarget: (targetId, defaultGroups) =>
    set((state) => {
      if (state.targets[targetId]) return state;
      const groups = defaultGroups ? defaultGroups.map(groupDtoToSidebar) : [];
      return {
        targets: {
          ...state.targets,
          [targetId]: { groups, freeText: "" },
        },
      };
    }),

  removeTarget: (targetId) =>
    set((state) => {
      const { [targetId]: _, ...rest } = state.targets;
      return { targets: rest };
    }),

  addGroupToTarget: (targetId, group) =>
    set((state) =>
      updateTarget(state, targetId, (target) => {
        if (target.groups.some((g) => g.groupId === group.id)) return target;
        return { ...target, groups: [...target.groups, groupDtoToSidebar(group)] };
      }),
    ),

  removeGroupFromTarget: (targetId, groupId) =>
    set((state) =>
      updateTarget(state, targetId, (target) => ({
        ...target,
        groups: target.groups.filter((g) => g.groupId !== groupId),
      })),
    ),

  toggleTag: (targetId, groupId, tagId) =>
    set((state) =>
      updateTarget(state, targetId, (target) =>
        updateGroupInTarget(target, groupId, (group) => ({
          ...group,
          tags: group.tags.map((t) =>
            t.tagId === tagId ? { ...t, enabled: !t.enabled } : t,
          ),
        })),
      ),
    ),

  setTagStrength: (targetId, groupId, tagId, strength) =>
    set((state) =>
      updateTarget(state, targetId, (target) =>
        updateGroupInTarget(target, groupId, (group) => ({
          ...group,
          tags: group.tags.map((t) =>
            t.tagId === tagId ? { ...t, strength } : t,
          ),
        })),
      ),
    ),

  toggleAllTags: (targetId, groupId, enabled) =>
    set((state) =>
      updateTarget(state, targetId, (target) =>
        updateGroupInTarget(target, groupId, (group) => ({
          ...group,
          tags: group.tags.map((t) => ({ ...t, enabled })),
        })),
      ),
    ),

  toggleGroupExpanded: (targetId, groupId) =>
    set((state) =>
      updateTarget(state, targetId, (target) =>
        updateGroupInTarget(target, groupId, (group) => ({
          ...group,
          expanded: !group.expanded,
        })),
      ),
    ),

  addSystemTag: (targetId, groupId, tag) =>
    set((state) =>
      updateTarget(state, targetId, (target) =>
        updateGroupInTarget(target, groupId, (group) => {
          if (group.tags.some((t) => t.tag === tag.name)) return group;
          const newTag: SidebarPromptTag = {
            tagId: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: tag.name,
            tag: tag.name,
            enabled: true,
            strength: 0,
            defaultStrength: 0,
            thumbnailPath: null,
          };
          return { ...group, tags: [...group.tags, newTag] };
        }),
      ),
    ),

  removeSystemTag: (targetId, groupId, tagId) =>
    set((state) =>
      updateTarget(state, targetId, (target) =>
        updateGroupInTarget(target, groupId, (group) => ({
          ...group,
          tags: group.tags.filter((t) => t.tagId !== tagId),
        })),
      ),
    ),

  setFreeText: (targetId, text) =>
    set((state) =>
      updateTarget(state, targetId, (target) => ({ ...target, freeText: text })),
    ),

  saveSidebarPromptState: (projectId) => {
    const { targets } = useSidebarPromptStore.getState();
    ipc.setSetting(`sidebar_prompts_${projectId}`, JSON.stringify(targets)).catch(() => {});
  },

  loadSidebarPromptState: async (projectId) => {
    try {
      const settings = await ipc.getSettings();
      const raw = settings[`sidebar_prompts_${projectId}`];
      if (raw) {
        const targets: Record<string, TargetPromptState> = JSON.parse(raw);
        set({ targets });
      } else {
        set({ targets: {} });
      }
    } catch {
      set({ targets: {} });
    }
  },
}));
