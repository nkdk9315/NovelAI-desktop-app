import type { TargetPromptState } from "@/stores/sidebar-prompt-utils";
import { effectiveWildcardToken, formatTagWithStrength, pickRandomTags } from "./prompt-assembly";
import { tidyCommas } from "./prompt-text";
import { negativeTextOf, positiveTextOf } from "@/stores/sidebar-prompt-text-sync";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Final positive/negative text of one target for a generation request.
 *
 * The text boxes already contain every normal-group tag, so only wildcard
 * tokens need work: a random group's token is replaced by a fresh pick, and
 * the negatives of exactly those picks are appended to the negative text (one
 * roll feeds both, so they always match). Tokens of groups whose random mode
 * is off are dropped — their tags are already in the text.
 */
export function rollTargetForGeneration(
  target: TargetPromptState,
  random: () => number = Math.random,
): { positive: string; negative: string } {
  let positive = positiveTextOf(target);
  const negParts = [negativeTextOf(target).trim()];

  for (const group of target.groups) {
    const token = effectiveWildcardToken(group);
    if (!positive.includes(token)) continue;
    let value = "";
    if (group.randomMode) {
      const pool = group.randomSource === "all" ? group.tags : group.tags.filter((t) => t.enabled);
      const picks = pickRandomTags(pool, group.randomCount, random);
      value = picks.map((t) => formatTagWithStrength(t.tag, t.strength)).join(", ");
      for (const t of picks) {
        const neg = t.negativePrompt.trim();
        if (neg) negParts.push(neg);
      }
    }
    positive = positive.replace(new RegExp(escapeRegExp(token), "g"), value);
  }

  return {
    positive: tidyCommas(positive),
    negative: negParts.filter((p) => p.length > 0).join(", "),
  };
}
