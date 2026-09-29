import { useCallback, useRef, useState } from "react";

const MAX_HISTORY = 100;
const COALESCE_MS = 800;

/**
 * State with undo / redo. Changes sharing a `key` within a short time (typing
 * in one field, one drag) collapse into a single undo step.
 */
export function useUndoable<T>(initial: T) {
  const [value, setValue] = useState(initial);
  const current = useRef(initial);
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const last = useRef<{ key: string; at: number } | null>(null);

  const commit = useCallback((next: T) => {
    current.current = next;
    setValue(next);
  }, []);

  const set = useCallback((next: T | ((prev: T) => T), key?: string) => {
    const prev = current.current;
    const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
    const now = Date.now();
    const coalesce = key != null && last.current?.key === key && now - last.current.at < COALESCE_MS;
    if (!coalesce) {
      past.current = [...past.current.slice(-(MAX_HISTORY - 1)), prev];
      future.current = [];
    }
    last.current = key != null ? { key, at: now } : null;
    commit(resolved);
  }, [commit]);

  const undo = useCallback(() => {
    if (past.current.length === 0) return;
    const target = past.current[past.current.length - 1];
    past.current = past.current.slice(0, -1);
    future.current = [current.current, ...future.current];
    last.current = null;
    commit(target);
  }, [commit]);

  const redo = useCallback(() => {
    if (future.current.length === 0) return;
    const [target, ...rest] = future.current;
    future.current = rest;
    past.current = [...past.current, current.current];
    last.current = null;
    commit(target);
  }, [commit]);

  return { value, set, undo, redo, canUndo: past.current.length > 0, canRedo: future.current.length > 0 };
}
