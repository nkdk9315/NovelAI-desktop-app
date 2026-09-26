import { useCallback, useEffect, useRef, useState } from "react";

export interface ZoomView {
  scale: number;
  x: number;
  y: number;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 10;
const FIT: ZoomView = { scale: 1, x: 0, y: 0 };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Zoom by `factor` keeping the point `(cx, cy)` (relative to the container center) fixed. */
export function zoomAround(v: ZoomView, factor: number, cx: number, cy: number): ZoomView {
  const scale = clamp(v.scale * factor, MIN_SCALE, MAX_SCALE);
  if (scale <= 1) return { scale, x: 0, y: 0 };
  const k = scale / v.scale;
  return { scale, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
}

type GestureEvent = UIEvent & { scale: number; clientX: number; clientY: number };

/**
 * Wheel / trackpad-pinch / touch-pinch zoom and drag-to-pan for an image
 * centered in a container. Covers Chromium (pinch = ctrl+wheel), WebKit
 * (Safari-style gesture events, which Tauri's macOS webview emits) and
 * touch screens (two pointers). Resets whenever `resetKey` changes.
 */
export function useZoomPan(resetKey: unknown) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<ZoomView>(FIT);
  const [interacting, setInteracting] = useState(false);
  const [prevKey, setPrevKey] = useState(resetKey);
  if (prevKey !== resetKey) {
    setPrevKey(resetKey);
    setView(FIT);
  }

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number } | null>(null);

  const toCenter = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { cx: 0, cy: 0 };
    return { cx: clientX - (rect.left + rect.width / 2), cy: clientY - (rect.top + rect.height / 2) };
  }, []);

  const zoomAt = useCallback((factor: number, clientX: number, clientY: number) => {
    const { cx, cy } = toCenter(clientX, clientY);
    setView((v) => zoomAround(v, factor, cx, cy));
  }, [toCenter]);

  // Wheel and WebKit gesture listeners must be non-passive to stop page zoom/scroll.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const sensitivity = e.ctrlKey ? 0.01 : 0.0015;
      zoomAt(Math.exp(-e.deltaY * sensitivity), e.clientX, e.clientY);
    };
    let gestureBase = 1;
    const onGestureStart = (e: Event) => { e.preventDefault(); gestureBase = 1; };
    const onGestureChange = (e: Event) => {
      e.preventDefault();
      const g = e as GestureEvent;
      zoomAt(g.scale / gestureBase, g.clientX, g.clientY);
      gestureBase = g.scale;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("gesturestart", onGestureStart);
    el.addEventListener("gesturechange", onGestureChange);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("gesturestart", onGestureStart);
      el.removeEventListener("gesturechange", onGestureChange);
    };
  }, [zoomAt]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) };
    }
    setInteracting(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current.dist > 0) zoomAt(dist / pinch.current.dist, (a.x + b.x) / 2, (a.y + b.y) / 2);
      pinch.current.dist = dist;
      return;
    }
    const dx = cur.x - prev.x;
    const dy = cur.y - prev.y;
    setView((v) => (v.scale > 1 ? { ...v, x: v.x + dx, y: v.y + dy } : v));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) setInteracting(false);
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    if (view.scale !== 1) setView(FIT);
    else zoomAt(2, e.clientX, e.clientY);
  };

  const zoomBy = (factor: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    zoomAt(factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
  };

  return {
    containerRef,
    view,
    interacting,
    reset: () => setView(FIT),
    zoomBy,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onDoubleClick },
  };
}
