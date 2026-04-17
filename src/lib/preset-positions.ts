import type { PromptPresetDto, SidebarPresetGroupInstanceDto } from "@/types";

export interface CharacterPosition {
  x: number;
  y: number;
  activatedAt: string;
}

/**
 * Walk all active presets across instances and compute the desired
 * position for each mapped character. When multiple active presets target the
 * same character, the one with the latest `activatedAt` wins.
 *
 * Returns a map keyed by character id. Characters not affected by any active
 * preset are absent from the result (their current position is left alone).
 */
export function computeDesiredCharacterPositions(
  instances: SidebarPresetGroupInstanceDto[],
  presets: PromptPresetDto[],
): Map<string, CharacterPosition> {
  const presetById = new Map(presets.map((p) => [p.id, p]));
  const result = new Map<string, CharacterPosition>();

  for (const inst of instances) {
    for (const active of inst.activePresets) {
      const preset = presetById.get(active.presetId);
      if (!preset) continue;

      for (const slot of preset.slots) {
        let charId: string | null = null;
        if (slot.role === "source") charId = inst.sourceCharacterId;
        else if (slot.role === "target") charId = inst.targetCharacterId;
        if (!charId) continue;

        const next: CharacterPosition = {
          x: slot.positionX,
          y: slot.positionY,
          activatedAt: active.activatedAt,
        };
        const prev = result.get(charId);
        if (!prev || next.activatedAt > prev.activatedAt) {
          result.set(charId, next);
        }
      }
    }
  }

  return result;
}
