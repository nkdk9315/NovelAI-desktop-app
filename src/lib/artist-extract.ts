import type { ArtistTag } from "@/types";

/**
 * Find artist tags anywhere in a NovelAI prompt and optionally take them out.
 *
 * Understands the weight syntax: `1.2::a, b::` blocks (also nested and
 * without spaces, e.g. `0.3::artist:sincos::`), `{}` (×1.05) and `[]`
 * (÷1.05). An artist's strength is the product of the weights around it.
 * `artist:name` marks one item. `artist#` inside a weight block starts an
 * artist group: every following item up to the block's close is an artist
 * too (`0.8::artist#ei (eiei e1), 2equal8, ::` = two artists at 0.8).
 */

type Tok =
  | { k: "open"; w: number; raw: string }
  | { k: "close"; raw: string }
  | { k: "lb"; raw: "{" | "[" }
  | { k: "rb"; raw: "}" | "]" }
  | { k: "sep"; raw: string }
  | { k: "text"; raw: string };

const NUM = "(?:-?\\d+(?:\\.\\d+)?|-?\\.\\d+)";
const OPEN_AT_START = new RegExp(`^${NUM}::`);
const ARTIST = /^artist([:#])\s*(.+?)\s*$/i;
const BRACE = 1.05;

function tokenize(s: string): Tok[] {
  const out: Tok[] = [];
  let text = "";
  const flush = () => { if (text) out.push({ k: "text", raw: text }); text = ""; };
  let i = 0;
  while (i < s.length) {
    // A weight opens only at the start of an item ("1girl" is not "1::")
    if (text.trim() === "") {
      const m = s.slice(i, i + 24).match(OPEN_AT_START);
      if (m) {
        flush();
        out.push({ k: "open", w: Number(m[0].slice(0, -2)), raw: m[0] });
        i += m[0].length;
        continue;
      }
    }
    const ch = s[i];
    if (s.startsWith("::", i)) { flush(); out.push({ k: "close", raw: "::" }); i += 2; continue; }
    if (ch === "{" || ch === "[") { flush(); out.push({ k: "lb", raw: ch }); i++; continue; }
    if (ch === "}" || ch === "]") { flush(); out.push({ k: "rb", raw: ch }); i++; continue; }
    if (ch === "," || ch === "\n") { flush(); out.push({ k: "sep", raw: ch }); i++; continue; }
    text += ch;
    i++;
  }
  flush();
  return out;
}

const round2 = (v: number) => Math.round(v * 100) / 100;
// A weight opens only at the start of an item: "2equal8::" is a name followed by a close
const EMPTY_BLOCK = new RegExp(`(^|[\\s,{[])${NUM}::[\\s,]*::`, "g");
const COMMA_AFTER_OPEN = new RegExp(`((?:^|[\\s,{[])${NUM}::|[{[])[ \\t]*,[ \\t]*`, "g");

/** Remove empty weight blocks / brackets and stray commas left behind. */
function tidy(s: string): string {
  let prev = "";
  let out = s;
  while (prev !== out) {
    prev = out;
    out = out
      .replace(EMPTY_BLOCK, "$1")
      .replace(/\{[\s,]*\}|\[[\s,]*\]/g, "")
      .replace(COMMA_AFTER_OPEN, "$1")
      // "a, ::" -> "a::", but keep a space after a digit ("2equal8 ::"), which NovelAI would read as a weight
      .replace(/(\S?)[ \t]*,[ \t]*(::|[}\]])/g, (_, c: string, close: string) => `${c}${/\d/.test(c) && close === "::" ? " " : ""}${close}`)
      .replace(/,\s*(?=,)/g, "");
  }
  // Normalise spacing but keep line-end commas (a newline alone does not separate tags)
  return out
    .replace(/[ \t]*,[ \t]*/g, ", ")
    .replace(/, \n/g, ",\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^[\s,]+|[\s,]+$/g, "");
}

export interface ArtistExtraction {
  /** Prompt with the extracted artists removed */
  text: string;
  /** Every artist found, in order of appearance (first occurrence wins) */
  artistTags: ArtistTag[];
}

/**
 * Artist tags in `prompt`. Those for which `remove(name)` is true are taken out
 * of the returned text; by default all of them are.
 */
export function extractArtistTags(prompt: string, remove: (name: string) => boolean = () => true): ArtistExtraction {
  const stack: number[] = [];
  const found: ArtistTag[] = [];
  const kept: string[] = [];
  let groupDepth: number | null = null;
  let markerPending = false;
  const toks = tokenize(prompt);
  for (const [i, t] of toks.entries()) {
    if (t.k === "open") stack.push(t.w);
    else if (t.k === "close") stack.pop();
    // `{1.2::x ::}` (the app's own format): braces directly around a weight are just delimiters
    else if (t.k === "lb") stack.push(toks[i + 1]?.k === "open" ? 1 : t.raw === "{" ? BRACE : 1 / BRACE);
    else if (t.k === "rb") stack.pop();
    else if (t.k === "text") {
      const item = t.raw.trim();
      const m = item.match(ARTIST);
      // Group mode ends when its block closes
      if (groupDepth !== null && stack.length < groupDepth) groupDepth = null;
      if (m && m[1] === "#" && stack.length > 0) groupDepth = stack.length;
      const name = m ? m[2] : groupDepth !== null && stack.length === groupDepth && item ? item : null;
      if (name) {
        const weight = round2(stack.reduce((a, b) => a * b, 1));
        if (!found.some((a) => a.name === name)) {
          found.push({ name, strength: weight === 1 ? 0 : weight, enabled: true });
        }
        if (remove(name)) {
          // Removing the `artist#` item: the next kept member carries the marker
          if (m && m[1] === "#" && groupDepth !== null) markerPending = true;
          continue;
        }
        if (markerPending && !m) {
          kept.push(t.raw.replace(item, `artist#${item}`));
          markerPending = false;
          continue;
        }
        markerPending = false;
      }
    }
    kept.push(t.raw);
  }
  return { text: tidy(kept.join("")), artistTags: found };
}
