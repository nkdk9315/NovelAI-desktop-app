import { inArtistGroup } from "@/lib/artist-extract";

/**
 * The tag being typed at the cursor, for autocomplete. Besides commas, an item
 * ends at a newline, a weight `::` (`2::smile::`), braces / brackets and `|`,
 * so the query is just the tag name. `artist:` / `artist#` prefixes (and the
 * items of an `artist#` group) make it an artist query; `Text:` is never one.
 */
export interface TagQuery {
  query: string;
  /** Range of the typed name that a suggestion replaces */
  start: number;
  end: number;
  artist: boolean;
}

const SEPARATORS = [",", "\n", "{", "}", "[", "]", "|"];
const ARTIST_PREFIX = /^artist[:#]\s*/i;
const MIN_QUERY = 2;

function itemStart(text: string, pos: number): number {
  let start = 0;
  for (const sep of [...SEPARATORS, "::"]) {
    const i = text.lastIndexOf(sep, pos - 1);
    if (i >= 0 && i + sep.length <= pos) start = Math.max(start, i + sep.length);
  }
  return start;
}

/** End of the word under the cursor ("long ha|ir" → after "ir"; "smi| blush" keeps "blush"). */
function wordEnd(text: string, pos: number): number {
  let end = pos;
  while (end < text.length && !/\s/.test(text[end]) && !SEPARATORS.includes(text[end]) && !text.startsWith("::", end)) end++;
  return end;
}

export function tagQueryAt(text: string, pos: number): TagQuery | null {
  let start = itemStart(text, pos);
  while (start < pos && /\s/.test(text[start])) start++;
  const item = text.slice(start, pos);
  if (/^text:/i.test(item)) return null;
  const prefix = item.match(ARTIST_PREFIX);
  const artist = prefix != null || inArtistGroup(text.slice(0, start));
  if (prefix) start += prefix[0].length;
  const query = text.slice(start, pos).trim();
  // A weight still being typed ("1.5" before its "::")
  if (query.length < MIN_QUERY || /^-?[\d.]+$/.test(query)) return null;
  return { query, start, end: wordEnd(text, pos), artist };
}

/** Put `tag` in place of the typed name; returns the new text and the cursor after the tag. */
export function insertTagAt(text: string, q: TagQuery, tag: string): { text: string; cursor: number } {
  const head = text.slice(0, q.start);
  const rest = text.slice(q.end);
  const lead = head.endsWith(",") ? " " : "";
  const next = rest.trimStart();
  const needsComma = next !== "" && !SEPARATORS.includes(next[0]) && !next.startsWith("::");
  const inserted = `${lead}${tag}${needsComma ? ", " : ""}`;
  return { text: `${head}${inserted}${needsComma ? next : rest}`, cursor: head.length + lead.length + tag.length };
}
