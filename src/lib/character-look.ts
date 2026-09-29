import type { Character } from "@/stores/generation-params-store";
import type { TargetPromptState } from "@/stores/sidebar-prompt-utils";
import { negativeTextOf, positiveTextOf } from "@/stores/sidebar-prompt-text-sync";
import { rollTargetForGeneration } from "@/lib/prompt-roll";
import { outfitTargetId } from "@/lib/outfits";

export interface PromptText { positive: string; negative: string }

/** A prompt target's text: rolled for a real generation, as typed for previews / token counts. */
export function targetText(t: TargetPromptState | undefined, roll: boolean): PromptText | undefined {
  if (!t) return undefined;
  return roll ? rollTargetForGeneration(t) : { positive: positiveTextOf(t), negative: negativeTextOf(t) };
}

/** Every outfit of a character with its text. */
export function outfitTexts(
  c: Character, targets: Record<string, TargetPromptState>, roll: boolean,
): Array<{ id: string } & PromptText> {
  return (c.outfits ?? []).map((o) => ({
    id: o.id, ...(targetText(targets[outfitTargetId(o.id)], roll) ?? { positive: "", negative: "" }),
  }));
}

/** Text of the outfit the character is wearing now (normal mode), if any. */
export function currentOutfitText(
  c: Character, targets: Record<string, TargetPromptState>, roll: boolean,
): PromptText | undefined {
  if (!c.outfitId || !(c.outfits ?? []).some((o) => o.id === c.outfitId)) return undefined;
  return targetText(targets[outfitTargetId(c.outfitId)], roll);
}
