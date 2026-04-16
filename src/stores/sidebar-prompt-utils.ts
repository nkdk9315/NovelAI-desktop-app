import type { PromptGroupDto } from "@/types";

// ---- Types ----

export interface SidebarPromptTag {
  tagId: string;
  name: string;
  tag: string;
  negativePrompt: string;
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
  defaultStrength: number;
  savedEnabledTags: { tagId: string; strength: number }[] | null;
  randomMode: boolean;
  randomCount: number;
  randomSource: "all" | "enabled";
  wildcardToken: string | null;
}

export interface TargetPromptState {
  groups: SidebarPromptGroup[];
  freeText: string;
  promptOverride: string | null;
  negativeOverride: string | null;
}

// ---- Pure helpers ----

export function groupDtoToSidebar(dto: PromptGroupDto): SidebarPromptGroup {
  return {
    groupId: dto.id,
    groupName: dto.name,
    isSystem: dto.isSystem,
    category: dto.category,
    tags: dto.tags.map((t) => ({
      tagId: t.id,
      name: t.name || t.tag,
      tag: t.tag,
      negativePrompt: t.negativePrompt,
      enabled: false,
      strength: dto.defaultStrength,
      defaultStrength: dto.defaultStrength,
      thumbnailPath: t.thumbnailPath,
    })),
    expanded: false,
    defaultStrength: dto.defaultStrength,
    savedEnabledTags: null,
    randomMode: dto.randomMode,
    randomCount: dto.randomCount,
    randomSource: dto.randomSource,
    wildcardToken: dto.wildcardToken,
  };
}

export interface SidebarPromptState {
  targets: Record<string, TargetPromptState>;
}

export function updateTarget(
  state: SidebarPromptState,
  targetId: string,
  updater: (target: TargetPromptState) => TargetPromptState,
): Partial<SidebarPromptState> {
  const target = state.targets[targetId];
  if (!target) return {};
  return { targets: { ...state.targets, [targetId]: updater(target) } };
}

export function updateGroupInTarget(
  target: TargetPromptState,
  groupId: string,
  updater: (group: SidebarPromptGroup) => SidebarPromptGroup,
): TargetPromptState {
  return {
    ...target,
    groups: target.groups.map((g) => (g.groupId === groupId ? updater(g) : g)),
  };
}

export function migrateTargets(
  parsed: Record<string, TargetPromptState>,
): Record<string, TargetPromptState> {
  const migrated: Record<string, TargetPromptState> = {};
  for (const [id, t] of Object.entries(parsed)) {
    migrated[id] = {
      groups: (t.groups ?? []).map((g) => ({
        ...g,
        randomMode: g.randomMode ?? false,
        randomCount: g.randomCount ?? 1,
        randomSource: g.randomSource ?? "enabled",
        wildcardToken: g.wildcardToken ?? null,
        tags: (g.tags ?? []).map((tag) => ({
          ...tag,
          negativePrompt: tag.negativePrompt ?? "",
        })),
      })),
      freeText: t.freeText ?? "",
      promptOverride: t.promptOverride ?? null,
      negativeOverride: t.negativeOverride ?? null,
    };
  }
  return migrated;
}
