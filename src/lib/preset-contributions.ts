import type { PromptPresetDto, SidebarPresetGroupInstanceDto } from "@/types";

export interface PresetContributions {
  positive: string[];
  negative: string[];
}

/**
 * Wrap `text` with NovelAI strength syntax `{strength}::text::` unless strength
 * is neutral (1.0), in which case the text is returned verbatim.
 */
export function wrapWithStrength(text: string, strength: number): string {
  if (!text.trim()) return text;
  if (strength === 1) return text;
  // Trim trailing zeros from decimals (e.g. 2.0 → 2)
  const s = Number.isInteger(strength) ? strength.toString() : strength.toString();
  return `${s}::${text}::`;
}

/**
 * Walk all sidebar preset group instances and collect the positive/negative
 * contributions that land on the given character, each wrapped in its effective
 * strength (per-preset override, falling back to the instance default).
 *
 * - Source character receives slots with role === "source".
 * - Target character receives slots with role === "target".
 * - Duplicates across instances are intentionally preserved.
 */
export function getPresetContributionsForCharacter(
  characterId: string,
  instances: SidebarPresetGroupInstanceDto[],
  presets: PromptPresetDto[],
): PresetContributions {
  const positive: string[] = [];
  const negative: string[] = [];

  const presetById = new Map(presets.map((p) => [p.id, p]));

  for (const inst of instances) {
    let role: "source" | "target" | null = null;
    if (inst.sourceCharacterId === characterId) role = "source";
    else if (inst.targetCharacterId === characterId) role = "target";
    if (!role) continue;

    for (const active of inst.activePresets) {
      const preset = presetById.get(active.presetId);
      if (!preset) continue;
      const posStrength = active.positiveStrength ?? inst.defaultPositiveStrength;
      const negStrength = active.negativeStrength ?? inst.defaultNegativeStrength;
      for (const slot of preset.slots) {
        if (slot.role !== role) continue;
        const pos = slot.positivePrompt.trim();
        if (pos) positive.push(wrapWithStrength(pos, posStrength));
        const neg = slot.negativePrompt.trim();
        if (neg) negative.push(wrapWithStrength(neg, negStrength));
      }
    }
  }

  return { positive, negative };
}

export function appendContributions(base: string, parts: string[]): string {
  const nonEmpty = parts.filter((p) => p.length > 0);
  if (nonEmpty.length === 0) return base;
  const trimmed = base.trim();
  const tail = nonEmpty.join(", ");
  if (!trimmed) return tail;
  return `${trimmed}, ${tail}`;
}
