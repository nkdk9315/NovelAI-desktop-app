import type { SidebarPromptGroup, SidebarPromptTag } from "@/stores/sidebar-prompt-store";

export type AssembleMode = "preview" | "generate";

export function defaultWildcardToken(groupName: string): string {
  const slug = groupName.trim().replace(/\s+/g, "_");
  return `__${slug}__`;
}

export interface AssembleOptions {
  mode?: AssembleMode;
  random?: () => number;
}

/**
 * Format a tag with NovelAI colon syntax strength.
 * strength 3 → "3::smile::", strength -2 → "-2::smile::", strength 0 → "smile"
 */
export function formatTagWithStrength(tag: string, strength: number): string {
  if (strength === 0) return tag;
  return `${strength}::${tag}::`;
}

function pickRandomTags(
  pool: SidebarPromptTag[],
  count: number,
  rng: () => number,
): SidebarPromptTag[] {
  const n = Math.min(Math.max(count, 0), pool.length);
  if (n === 0) return [];
  const arr = pool.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}

/**
 * Assemble the tag list for a single group, honoring random/wildcard configuration.
 * Returns the comma-joined string of formatted tags (may be empty).
 */
export function assembleGroupTags(
  group: SidebarPromptGroup,
  opts: AssembleOptions = {},
): string {
  const mode = opts.mode ?? "preview";
  const rng = opts.random ?? Math.random;

  let selected: SidebarPromptTag[];
  if (mode === "generate" && group.randomMode) {
    const pool =
      group.randomSource === "all" ? group.tags : group.tags.filter((t) => t.enabled);
    selected = pickRandomTags(pool, group.randomCount, rng);
  } else {
    selected = group.tags.filter((t) => t.enabled);
  }

  return selected.map((t) => formatTagWithStrength(t.tag, t.strength)).join(", ");
}

/**
 * @deprecated Use assembleFullPrompt which handles wildcards.
 * Kept for callers that only want the trailing comma-joined tag list.
 */
export function assemblePrompt(
  groups: SidebarPromptGroup[],
  opts: AssembleOptions = {},
): string {
  return groups
    .map((g) => assembleGroupTags(g, opts))
    .filter((s) => s.length > 0)
    .join(", ");
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Combine free text and group-selected tags into a final prompt string.
 * - Groups with a wildcardToken are substituted into the free text at the token's position.
 *   (In preview mode the token is left as-is so the user can see it.)
 * - Groups without a wildcardToken are appended to the end, joined with ", ".
 */
export function assembleFullPrompt(
  freeText: string,
  groups: SidebarPromptGroup[],
  opts: AssembleOptions = {},
): string {
  const mode = opts.mode ?? "preview";
  const text = freeText;
  const trailingParts: string[] = [];
  const substitutions: { token: string; value: string }[] = [];

  for (const group of groups) {
    const assembled = assembleGroupTags(group, opts);
    const token = group.wildcardToken ?? "";
    if (token.length > 0) {
      substitutions.push({ token, value: assembled });
      // The token is only substituted where the user placed it. If it's not in the
      // text, the group contributes nothing unless the user inserts it explicitly.
    } else if (assembled.length > 0) {
      trailingParts.push(assembled);
    }
  }

  const trimmed = text.trim();
  const tail = trailingParts.join(", ");
  let combined: string;
  if (!trimmed && !tail) combined = "";
  else if (!trimmed) combined = tail;
  else if (!tail) combined = trimmed;
  else combined = `${trimmed}, ${tail}`;

  if (mode === "generate") {
    for (const { token, value } of substitutions) {
      combined = combined.replace(new RegExp(escapeRegExp(token), "g"), value);
    }
  }

  return combined;
}

/**
 * Substitute wildcard tokens in `text` with group tag picks (random roll when configured).
 * Unlike assembleFullPrompt, groups without a wildcard token are ignored — the caller is
 * treating `text` as authoritative (e.g. a user-edited promptOverride).
 */
export function substituteWildcards(
  text: string,
  groups: SidebarPromptGroup[],
  random: () => number = Math.random,
): string {
  let out = text;
  for (const group of groups) {
    const token = group.wildcardToken ?? "";
    if (token.length === 0) continue;
    const assembled = assembleGroupTags(group, { mode: "generate", random });
    out = out.replace(new RegExp(escapeRegExp(token), "g"), assembled);
  }
  return out;
}

/**
 * Convenience for generation-time prompt assembly (random roll + wildcard substitution).
 */
export function rollPromptForGeneration(
  freeText: string,
  groups: SidebarPromptGroup[],
  random: () => number = Math.random,
): string {
  return assembleFullPrompt(freeText, groups, { mode: "generate", random });
}
