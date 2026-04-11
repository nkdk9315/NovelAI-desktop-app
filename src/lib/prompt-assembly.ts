import type { SidebarPromptGroup } from "@/stores/sidebar-prompt-store";

/**
 * Format a tag with NovelAI colon syntax strength.
 * strength 3 → "3::smile::", strength -2 → "-2::smile::", strength 0 → "smile"
 */
export function formatTagWithStrength(tag: string, strength: number): string {
  if (strength === 0) return tag;
  return `${strength}::${tag}::`;
}

/**
 * Assemble enabled tags from all groups into a comma-separated prompt string.
 */
export function assemblePrompt(groups: SidebarPromptGroup[]): string {
  const parts: string[] = [];
  for (const group of groups) {
    for (const t of group.tags) {
      if (t.enabled) {
        parts.push(formatTagWithStrength(t.tag, t.strength));
      }
    }
  }
  return parts.join(", ");
}

/**
 * Combine free text and group-selected tags into a final prompt string.
 * If both are non-empty, they are joined with ", ".
 */
export function assembleFullPrompt(
  freeText: string,
  groups: SidebarPromptGroup[],
): string {
  const groupPrompt = assemblePrompt(groups);
  const trimmed = freeText.trim();
  if (!trimmed && !groupPrompt) return "";
  if (!trimmed) return groupPrompt;
  if (!groupPrompt) return trimmed;
  return `${trimmed}, ${groupPrompt}`;
}
