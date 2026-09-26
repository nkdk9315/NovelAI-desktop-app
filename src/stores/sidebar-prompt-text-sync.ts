import { assembleFullPrompt, assembleNegativeFromGroups, effectiveWildcardToken, formatTagWithStrength } from "@/lib/prompt-assembly";
import { hasPiece, insertAtFront, removePiece, replacePiece } from "@/lib/prompt-text";
import { updateTarget, type SidebarPromptGroup, type SidebarPromptState, type TargetPromptState } from "./sidebar-prompt-utils";

/**
 * The prompt/negative text boxes are the single source of truth for what is
 * sent. Group state changes are mirrored into that text:
 *
 * - normal group: each enabled tag is an item in the text (new ones go first),
 *   and its negative prompt is an item in the negative text;
 * - random group: its wildcard token is an item in the text instead, and the
 *   picks (plus their negatives) are rolled at generation time.
 *
 * `syncTargetText(prev, next)` diffs what each group contributes before and
 * after a change and edits the text accordingly, so anything the user typed
 * by hand is left alone.
 */

interface Contribution {
  pos: string;
  neg: string;
}

function contributions(groups: SidebarPromptGroup[]): Map<string, Contribution> {
  const out = new Map<string, Contribution>();
  for (const g of groups) {
    if (g.randomMode) {
      out.set(`tok:${g.groupId}`, { pos: effectiveWildcardToken(g), neg: "" });
      continue;
    }
    for (const t of g.tags) {
      if (!t.enabled) continue;
      out.set(`tag:${g.groupId}:${t.tagId}`, {
        pos: formatTagWithStrength(t.tag, t.strength),
        neg: t.negativePrompt.trim(),
      });
    }
  }
  return out;
}

/** Text as shown to the user; legacy targets (null) show the auto-assembled prompt. */
export function positiveTextOf(target: TargetPromptState): string {
  return target.promptOverride ?? assembleFullPrompt("", target.groups);
}

export function negativeTextOf(target: TargetPromptState): string {
  return target.negativeOverride ?? assembleNegativeFromGroups(target.groups);
}

export function syncTargetText(prev: TargetPromptState, next: TargetPromptState): TargetPromptState {
  const before = contributions(prev.groups);
  const after = contributions(next.groups);
  let pos = next.promptOverride ?? positiveTextOf(prev);
  let neg = next.negativeOverride ?? negativeTextOf(prev);

  const stillUsed = (field: keyof Contribution, value: string) =>
    [...after.values()].some((c) => c[field] === value);

  for (const [key, old] of before) {
    const cur = after.get(key);
    if (cur) {
      if (cur.pos !== old.pos) {
        pos = hasPiece(pos, old.pos) ? replacePiece(pos, old.pos, cur.pos) : insertAtFront(pos, cur.pos);
      }
      if (cur.neg !== old.neg) {
        if (old.neg && hasPiece(neg, old.neg) && cur.neg) neg = replacePiece(neg, old.neg, cur.neg);
        else {
          if (old.neg && !stillUsed("neg", old.neg)) neg = removePiece(neg, old.neg);
          neg = insertAtFront(neg, cur.neg);
        }
      }
      continue;
    }
    if (!stillUsed("pos", old.pos)) pos = removePiece(pos, old.pos);
    if (old.neg && !stillUsed("neg", old.neg)) neg = removePiece(neg, old.neg);
  }

  // Insert in reverse so several new items keep their group order at the front.
  const added = [...after].filter(([key]) => !before.has(key)).reverse();
  for (const [, c] of added) {
    pos = insertAtFront(pos, c.pos);
    neg = insertAtFront(neg, c.neg);
  }

  return { ...next, promptOverride: pos, negativeOverride: neg };
}

/** `updateTarget` that mirrors the group change into the prompt texts. */
export function updateTargetSynced(
  state: SidebarPromptState,
  targetId: string,
  updater: (target: TargetPromptState) => TargetPromptState,
): Partial<SidebarPromptState> {
  return updateTarget(state, targetId, (target) => syncTargetText(target, updater(target)));
}

/** A fresh target whose text already contains the given groups' contributions. */
export function newTarget(groups: SidebarPromptGroup[]): TargetPromptState {
  const empty: TargetPromptState = { groups: [], freeText: "", promptOverride: "", negativeOverride: "" };
  return syncTargetText(empty, { ...empty, groups });
}
