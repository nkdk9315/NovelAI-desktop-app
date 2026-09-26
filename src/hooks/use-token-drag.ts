import { useRef, useState } from "react";
import { findPiece, insertPieceAt, itemBoundaries, removePiece } from "@/lib/prompt-text";

/**
 * Character offset in the textarea under a screen point. Textareas have no
 * point→offset API, so we hit-test the highlight overlay (a mirror of the text
 * with identical layout) by briefly making it the topmost hit target.
 */
function offsetFromPoint(textarea: HTMLTextAreaElement, overlay: HTMLElement, x: number, y: number): number | null {
  const prev = { ta: textarea.style.pointerEvents, ov: overlay.style.pointerEvents, z: overlay.style.zIndex };
  textarea.style.pointerEvents = "none";
  overlay.style.pointerEvents = "auto";
  overlay.style.zIndex = "10";
  let node: Node | null = null;
  let offset = 0;
  try {
    if (document.caretRangeFromPoint) {
      const r = document.caretRangeFromPoint(x, y);
      if (r) { node = r.startContainer; offset = r.startOffset; }
    } else {
      const doc = document as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null };
      const p = doc.caretPositionFromPoint?.(x, y);
      if (p) { node = p.offsetNode; offset = p.offset; }
    }
  } finally {
    textarea.style.pointerEvents = prev.ta;
    overlay.style.pointerEvents = prev.ov;
    overlay.style.zIndex = prev.z;
  }
  if (!node || !overlay.contains(node)) return null;
  const walker = document.createTreeWalker(overlay, NodeFilter.SHOW_TEXT);
  let acc = 0;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n === node) return acc + offset;
    acc += n.textContent?.length ?? 0;
  }
  return null;
}

function nearest(values: number[], target: number): number {
  return values.reduce((best, v) => (Math.abs(v - target) < Math.abs(best - target) ? v : best), values[0]);
}

const DRAG_THRESHOLD_PX = 4;

/** Move the first whole-item `token` so it starts at item boundary `drop` of `text`. */
export function moveToken(text: string, token: string, drop: number): string {
  const start = findPiece(text, token);
  if (start === -1) return text;
  const end = start + token.length;
  const without = removePiece(text, token);
  // Dropping onto itself (or the separator right after it) is a no-op.
  if (drop >= start && drop <= end + (text.length - without.length - token.length)) return text;
  const shifted = drop > end ? drop - (text.length - without.length) : drop;
  const at = nearest(itemBoundaries(without), Math.max(0, shifted));
  return insertPieceAt(without, token, at);
}

/**
 * Lets wildcard tokens be moved inside a textarea by dragging. Clicking a
 * token selects it as a unit; dragging it snaps the drop point to the nearest
 * item boundary, so it never lands inside another tag.
 */
export function useTokenDrag(opts: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  overlayRef: React.RefObject<HTMLDivElement | null>;
  value: string;
  tokens: string[];
  onChange: (value: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const state = useRef<{ token: string; x: number; y: number; moved: boolean; drop: number | null } | null>(null);

  const tokenAt = (offset: number): { token: string; start: number } | null => {
    for (const token of opts.tokens) {
      let idx = findPiece(opts.value, token);
      while (idx !== -1) {
        if (offset >= idx && offset <= idx + token.length) return { token, start: idx };
        idx = findPiece(opts.value, token, idx + 1);
      }
    }
    return null;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLTextAreaElement>) => {
    const ta = opts.textareaRef.current;
    const ov = opts.overlayRef.current;
    if (e.button !== 0 || !ta || !ov || opts.tokens.length === 0) return;
    const offset = offsetFromPoint(ta, ov, e.clientX, e.clientY);
    const hit = offset == null ? null : tokenAt(offset);
    if (!hit) return;
    e.preventDefault();
    ta.focus();
    ta.setSelectionRange(hit.start, hit.start + hit.token.length);
    ta.setPointerCapture(e.pointerId);
    state.current = { token: hit.token, x: e.clientX, y: e.clientY, moved: false, drop: null };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLTextAreaElement>) => {
    const s = state.current;
    const ta = opts.textareaRef.current;
    const ov = opts.overlayRef.current;
    if (!s || !ta || !ov) return;
    if (!s.moved && Math.hypot(e.clientX - s.x, e.clientY - s.y) < DRAG_THRESHOLD_PX) return;
    if (!s.moved) { s.moved = true; setDragging(true); }
    const offset = offsetFromPoint(ta, ov, e.clientX, e.clientY);
    if (offset == null) return;
    // Show the snapped drop point as the caret while dragging.
    const drop = nearest(itemBoundaries(opts.value), offset);
    s.drop = drop;
    ta.setSelectionRange(drop, drop);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLTextAreaElement>) => {
    const s = state.current;
    state.current = null;
    setDragging(false);
    const ta = opts.textareaRef.current;
    if (ta?.hasPointerCapture(e.pointerId)) ta.releasePointerCapture(e.pointerId);
    if (!s || !s.moved || !ta) return;
    const ov = opts.overlayRef.current;
    const offset = ov ? offsetFromPoint(ta, ov, e.clientX, e.clientY) : null;
    if (offset == null) return;
    const next = moveToken(opts.value, s.token, nearest(itemBoundaries(opts.value), offset));
    if (next === opts.value) return;
    opts.onChange(next);
    requestAnimationFrame(() => {
      const idx = findPiece(next, s.token);
      if (idx !== -1) ta.setSelectionRange(idx, idx + s.token.length);
    });
  };

  return { dragging, onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp };
}
