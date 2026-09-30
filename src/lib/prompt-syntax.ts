/**
 * Syntax highlighting for NovelAI prompts (the prompt textareas' overlay).
 *
 * Splits a prompt into spans that keep every character (joined, they give
 * the prompt back) and tags each with what it is and the emphasis in effect
 * there: `{}` ×1.05, `[]` ÷1.05 and `1.5::tags::` blocks (negative weights
 * remove), multiplied when nested. Also marks `artist:name`, the items of an
 * `artist#` group (up to its block's close, like `artist-extract.ts`),
 * `source#` / `target#` / `mutual#` prefixes, quoted phrases and `Text:`,
 * after which everything is drawn as text. Unbalanced brackets are errors.
 */

export type SyntaxKind =
  | "plain"
  | "separator"
  | "bracket"
  | "weight"
  | "artistPrefix"
  | "artist"
  | "prefix"
  | "textPrefix"
  | "text"
  | "quote"
  | "error";

export interface SyntaxSpan {
  text: string;
  kind: SyntaxKind;
  /** Emphasis at this span (1 = none). Brackets / weights carry their block's. */
  weight: number;
}

interface Open {
  kind: "{" | "[" | "w";
  factor: number;
  /** Index of the opener's span, to flag it if never closed */
  span: number;
  artistGroup: boolean;
}

const BRACE = 1.05;
const NUM = "(?:-?\\d+(?:\\.\\d+)?|-?\\.\\d+)";
// A weight opens only at the start of an item ("1girl" is not "1::")
const WEIGHT_OPEN = new RegExp(`^${NUM}::`);
const TEXT_START = /^text:/i;
const ARTIST = /^(artist([:#])\s*)([\s\S]*)$/i;
const ACTION_PREFIX = /^((?:source|target|mutual)#\s*)([\s\S]*)$/i;
const CLOSERS: Record<string, "{" | "["> = { "}": "{", "]": "[" };

export function highlightPrompt(prompt: string): SyntaxSpan[] {
  const spans: SyntaxSpan[] = [];
  const stack: Open[] = [];
  const weight = () => stack.reduce((w, o) => w * o.factor, 1);
  const push = (text: string, kind: SyntaxKind, w = weight()) => {
    if (text) spans.push({ text, kind, weight: w });
  };
  const open = (text: string, kind: Open["kind"], factor: number) => {
    stack.push({ kind, factor, span: spans.length, artistGroup: false });
    push(text, kind === "w" ? "weight" : "bracket");
  };

  let item = "";
  // No tag text yet in this item: a weight or `Text:` may start here
  let atItemStart = true;
  const flushItem = () => {
    const lead = item.match(/^\s*/)?.[0] ?? "";
    const body = item.slice(lead.length);
    item = "";
    push(lead, "plain");
    if (!body) return;
    const top = stack[stack.length - 1];
    const artist = body.match(ARTIST);
    if (artist) {
      // `artist#` makes the rest of its weight block artists too
      if (artist[2] === "#" && top) top.artistGroup = true;
      push(artist[1], "artistPrefix");
      push(artist[3], "artist");
      return;
    }
    if (top?.artistGroup) return push(body, "artist");
    const action = body.match(ACTION_PREFIX);
    if (action) {
      push(action[1], "prefix");
      push(action[2], "plain");
      return;
    }
    push(body, "plain");
  };

  let i = 0;
  while (i < prompt.length) {
    const rest = prompt.slice(i);
    const ch = prompt[i];
    if (atItemStart) {
      const text = rest.match(TEXT_START);
      if (text) {
        flushItem();
        push(text[0], "textPrefix");
        push(rest.slice(text[0].length), "text");
        break;
      }
      const w = rest.slice(0, 24).match(WEIGHT_OPEN);
      if (w) {
        flushItem();
        open(w[0], "w", Number(w[0].slice(0, -2)));
        i += w[0].length;
        continue;
      }
    }
    if (rest.startsWith("::")) {
      flushItem();
      closeWeight(stack, spans, push);
      atItemStart = true;
      i += 2;
      continue;
    }
    if (ch === "{" || ch === "[") {
      flushItem();
      open(ch, ch, ch === "{" ? BRACE : 1 / BRACE);
      atItemStart = true;
      i++;
      continue;
    }
    if (ch in CLOSERS) {
      flushItem();
      if (stack[stack.length - 1]?.kind === CLOSERS[ch]) {
        push(ch, "bracket");
        stack.pop();
      } else {
        push(ch, "error");
      }
      atItemStart = true;
      i++;
      continue;
    }
    if (ch === "," || ch === "|" || ch === "\n") {
      flushItem();
      push(ch, ch === "\n" ? "plain" : "separator");
      atItemStart = true;
      i++;
      continue;
    }
    const quoteEnd = ch === '"' ? prompt.indexOf('"', i + 1) : -1;
    if (quoteEnd !== -1) {
      // May hold commas; the words after it ("…" speech bubble) are the same item
      flushItem();
      push(prompt.slice(i, quoteEnd + 1), "quote");
      atItemStart = false;
      i = quoteEnd + 1;
      continue;
    }
    item += ch;
    if (!/\s/.test(ch)) atItemStart = false;
    i++;
  }
  flushItem();
  // Never closed: flag the opener
  for (const o of stack) spans[o.span].kind = "error";
  return spans;
}

/** `::` closes the innermost weight block; brackets left open inside it are errors. */
function closeWeight(stack: Open[], spans: SyntaxSpan[], push: (text: string, kind: SyntaxKind) => void) {
  let at = stack.length - 1;
  while (at >= 0 && stack[at].kind !== "w") at--;
  if (at < 0) return push("::", "error");
  for (const o of stack.splice(at + 1)) spans[o.span].kind = "error";
  push("::", "weight");
  stack.pop();
}

export type EmphasisDirection = "up" | "down" | "negative";

/** How strongly a weight emphasizes: direction and a 1–3 level, or null for none. */
export function emphasisOf(weight: number): { direction: EmphasisDirection; level: 1 | 2 | 3 } | null {
  if (weight <= 0) return { direction: "negative", level: 3 };
  // In brace steps: 1.05 is 1, 1.1025 is 2, 1.5 is ~8
  const steps = Math.abs(Math.log(weight) / Math.log(BRACE));
  if (steps < 0.5) return null;
  const level = steps <= 2.5 ? 1 : steps <= 6.5 ? 2 : 3;
  return { direction: weight > 1 ? "up" : "down", level };
}
