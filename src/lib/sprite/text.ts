/** Prompt text of spec items from their `sprite:<id>` prompt targets. */
import { rollTargetForGeneration } from "@/lib/prompt-roll";
import { negativeTextOf, positiveTextOf } from "@/stores/sidebar-prompt-text-sync";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import type { TextOf } from "./prompt";
import { spriteTargetId } from "./spec";

/** For generation: random groups are rolled. */
export const rolledTextOf: TextOf = (id, fallback) => {
  const t = useSidebarPromptStore.getState().targets[spriteTargetId(id)];
  return t ? rollTargetForGeneration(t) : fallback;
};

/** For previews / copies: the text as shown in the prompt box. */
export const displayTextOf: TextOf = (id, fallback) => {
  const t = useSidebarPromptStore.getState().targets[spriteTargetId(id)];
  return t ? { positive: positiveTextOf(t), negative: negativeTextOf(t) } : fallback;
};
