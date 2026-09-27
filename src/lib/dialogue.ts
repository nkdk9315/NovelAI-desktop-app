import type { TextPart } from "@/lib/in-image-text";
import {
  DEFAULT_BUBBLE_STYLE, resolveBubbleStyle, type BubbleStyleId, type CustomBubbleStyle,
} from "@/lib/bubble-styles";
import { letteringPhrase, type LetteringStyle } from "@/lib/lettering-styles";

/**
 * Dialogue / in-image text (V4.5+, Japanese on V5).
 *
 * Each prompt target (main or a character) can hold dialogue lines; see
 * `in-image-text.ts` for how they end up in the trailing `Text:` block. A line
 * in a character prompt is spoken by that character (verified on V5: the
 * bubble lands next to the right character).
 */

export type TextDirection = "auto" | "vertical" | "horizontal";

export interface DialogueLine {
  id: string;
  text: string;
  style: BubbleStyleId;
  /** Writing direction of this line (missing = auto: the model picks, vertical for Japanese bubbles) */
  direction?: TextDirection;
  /** Font look of the letters (missing = auto) */
  lettering?: LetteringStyle;
}

export const TEXT_DIRECTIONS: readonly TextDirection[] = ["auto", "vertical", "horizontal"];

const DIRECTION_TAG: Record<TextDirection, string | null> = {
  auto: null,
  vertical: "vertical text",
  horizontal: "horizontal text",
};

const DIRECTION_PHRASE: Record<TextDirection, string> = {
  auto: "",
  vertical: ", written vertically",
  horizontal: ", written horizontally",
};

export function newDialogueLine(style: BubbleStyleId = DEFAULT_BUBBLE_STYLE): DialogueLine {
  return { id: crypto.randomUUID(), text: "", style, direction: "auto" };
}

/**
 * A blank line separates two strings inside `Text:`, so a line's own line
 * breaks are kept single and surrounding whitespace is dropped.
 */
export function cleanDialogueText(text: string): string {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
}

/** Lines that will actually be sent (non-empty after cleaning). */
export function activeDialogue(lines: readonly DialogueLine[] | undefined): DialogueLine[] {
  return (lines ?? [])
    .map((l) => ({ ...l, text: cleanDialogueText(l.text) }))
    .filter((l) => l.text);
}

/** One part per line: the kind's and direction's tags, and `<kind phrase>[, <lettering>][, written vertically]`. */
export function dialogueParts(lines: readonly DialogueLine[] | undefined, customs: readonly CustomBubbleStyle[]): TextPart[] {
  return activeDialogue(lines).map((line) => {
    const { tags, phrase } = resolveBubbleStyle(line.style, customs);
    const direction = line.direction ?? "auto";
    const directionTag = DIRECTION_TAG[direction];
    return {
      text: line.text,
      tags: directionTag ? [...tags, directionTag] : [...tags],
      phrase: [phrase, letteringPhrase(line.lettering)].filter(Boolean).join(", ") + DIRECTION_PHRASE[direction],
    };
  });
}
