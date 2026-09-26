/**
 * Comma-separated prompt text editing.
 *
 * A "piece" is one item of a prompt such as `smile`, `1.2::long hair::` or a
 * wildcard token `__hair__`. Pieces are matched only on item boundaries (start,
 * end, `,` or newline), so removing `hair` never touches `long hair`.
 */

const BEFORE_BOUNDARY = /(^|[,\n])[ \t]*$/;
const AFTER_BOUNDARY = /^[ \t]*([,\n]|$)/;

/** Start index of the first whole-item occurrence of `piece`, or -1. */
export function findPiece(text: string, piece: string, from = 0): number {
  if (!piece) return -1;
  let idx = text.indexOf(piece, from);
  while (idx !== -1) {
    const okBefore = BEFORE_BOUNDARY.test(text.slice(0, idx));
    const okAfter = AFTER_BOUNDARY.test(text.slice(idx + piece.length));
    if (okBefore && okAfter) return idx;
    idx = text.indexOf(piece, idx + 1);
  }
  return -1;
}

export function hasPiece(text: string, piece: string): boolean {
  return findPiece(text, piece) !== -1;
}

/** Prepend `piece` as the first item (no-op if it is already present). */
export function insertAtFront(text: string, piece: string): string {
  if (!piece || hasPiece(text, piece)) return text;
  const rest = text.replace(/^\s+/, "");
  return rest ? `${piece}, ${rest}` : piece;
}

/** Remove every whole-item occurrence of `piece` together with one separator. */
export function removePiece(text: string, piece: string): string {
  let out = text;
  let idx = findPiece(out, piece);
  while (idx !== -1) {
    let start = idx;
    let end = idx + piece.length;
    const after = /^[ \t]*,[ \t]*/.exec(out.slice(end));
    if (after) {
      end += after[0].length;
    } else {
      const before = /[ \t]*,[ \t]*$/.exec(out.slice(0, start));
      if (before) start -= before[0].length;
    }
    out = out.slice(0, start) + out.slice(end);
    idx = findPiece(out, piece);
  }
  return out;
}

/** Replace the first whole-item occurrence of `from` with `to`, in place. */
export function replacePiece(text: string, from: string, to: string): string {
  const idx = findPiece(text, from);
  if (idx === -1) return text;
  return text.slice(0, idx) + to + text.slice(idx + from.length);
}

/** Collapse empty items left behind by substitutions (`a, , b` → `a, b`). */
export function tidyCommas(text: string): string {
  return text
    .replace(/,([ \t]*,)+/g, ",")
    .replace(/^[\s,]+/, "")
    .replace(/[\s,]+$/, "");
}

/**
 * Item boundaries of `text`: 0, the start of each item after a separator, and
 * the end. Used to snap a dropped piece so it never lands inside another tag.
 */
export function itemBoundaries(text: string): number[] {
  const out = [0];
  const re = /[,\n][ \t]*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(m.index + m[0].length);
  if (out[out.length - 1] !== text.length) out.push(text.length);
  return out;
}

/** Insert `piece` as an item at boundary `at` (an entry of `itemBoundaries`). */
export function insertPieceAt(text: string, piece: string, at: number): string {
  const before = text.slice(0, at);
  const after = text.slice(at);
  if (!before.trim()) return after.trim() ? `${piece}, ${after.replace(/^\s+/, "")}` : piece;
  if (!after.trim()) return `${before.replace(/[\s,]+$/, "")}, ${piece}`;
  return `${before}${piece}, ${after}`;
}
