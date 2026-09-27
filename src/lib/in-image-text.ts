import { isV5Model } from "@/lib/constants";
import { hasTextMarker } from "@/lib/prompt-decoration";
import { activeDialogue, dialogueParts, type DialogueLine } from "@/lib/dialogue";
import { SFX_TAG, activeSfx, sfxParts, type SfxLine } from "@/lib/sound-effects";
import { effectTags } from "@/lib/manga-effects";
import type { CustomBubbleStyle } from "@/lib/bubble-styles";

/**
 * Everything a prompt target adds on top of its own text: manga effect tags,
 * then its dialogue and sound effects as one trailing `Text:` block.
 * Everything after `Text:` is drawn as text, so the block always comes last.
 */

/** One string drawn in the image: its tags, and a phrase tying the quoted text to its look. */
export interface TextPart {
  text: string;
  tags: string[];
  phrase: string;
}

export interface TargetExtras {
  dialogue?: DialogueLine[];
  sfx?: SfxLine[];
  effects?: string[];
}

function quote(text: string): string {
  return `"${text.replace(/\n/g, " ").replace(/"/g, "'")}"`;
}

/** Append tags, `"text" phrase` for each part and the `Text:` block (texts separated by a blank line). */
export function appendTextParts(prompt: string, parts: readonly TextPart[], extraTags: readonly string[] = []): string {
  const tags = [...new Set([...extraTags, ...parts.flatMap((p) => p.tags)])];
  const phrases = parts.map((p) => (p.phrase ? `${quote(p.text)} ${p.phrase}` : quote(p.text)));
  const head = [prompt.trim().replace(/,\s*$/, ""), ...tags, ...phrases].filter(Boolean).join(", ");
  if (parts.length === 0) return head;
  return `${head}, Text: ${parts.map((p) => p.text).join("\n\n")}`;
}

export function textParts(target: TargetExtras | undefined, customs: readonly CustomBubbleStyle[]): TextPart[] {
  return [...dialogueParts(target?.dialogue, customs), ...sfxParts(target?.sfx)];
}

/**
 * The target's prompt with its effects, dialogue and sound effects.
 * `autoSfx` (main prompt) adds `sound effects` so the model draws fitting ones itself.
 */
export function appendTargetExtras(
  prompt: string, target: TargetExtras | undefined, customs: readonly CustomBubbleStyle[] = [], autoSfx = false,
): string {
  const tags = [...effectTags(target?.effects), ...(autoSfx ? [SFX_TAG] : [])];
  const parts = textParts(target, customs);
  if (tags.length === 0 && parts.length === 0) return prompt;
  return appendTextParts(prompt, parts, tags);
}

export function hasTextContent(target: TargetExtras | undefined): boolean {
  return activeDialogue(target?.dialogue).length > 0 || activeSfx(target?.sfx).length > 0;
}

export function hasSfx(target: TargetExtras | undefined): boolean {
  return activeSfx(target?.sfx).length > 0;
}

/** Official per-model limit on the text length (spaces and line breaks included). */
export function textCharLimit(model: string): number {
  if (model === "nai-diffusion-5-full") return 750;
  if (isV5Model(model)) return 374;
  return 118;
}

/** Length of the target's `Text:` body in characters (not UTF-16 units), blank-line separators included. */
export function textCharCount(target: TargetExtras | undefined): number {
  return [...textParts(target, []).map((p) => p.text).join("\n\n")].length;
}

export type TextIssue =
  | { kind: "tooLong"; count: number; limit: number }
  | { kind: "needsV5" }
  | { kind: "manualText" };

/** Warnings for one target's in-image text (nothing blocks generation). */
export function textIssues(model: string, target: TargetExtras | undefined, promptText: string): TextIssue[] {
  const parts = textParts(target, []);
  if (parts.length === 0) return [];
  const issues: TextIssue[] = [];
  const count = textCharCount(target);
  const limit = textCharLimit(model);
  if (count > limit) issues.push({ kind: "tooLong", count, limit });
  // Before V5 only English text can be drawn
  if (!isV5Model(model) && parts.some((p) => /[^\x20-\x7e\n]/.test(p.text))) issues.push({ kind: "needsV5" });
  if (hasTextMarker(promptText)) issues.push({ kind: "manualText" });
  return issues;
}
