import { describe, it, expect, vi, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useUndoable } from "@/hooks/use-undoable";

afterEach(() => vi.useRealTimers());

describe("useUndoable", () => {
  it("undoes and redoes changes", () => {
    const { result } = renderHook(() => useUndoable(0));
    act(() => result.current.set(1));
    act(() => result.current.set((v) => v + 1));
    expect(result.current.value).toBe(2);
    act(() => result.current.undo());
    expect(result.current.value).toBe(1);
    act(() => result.current.redo());
    expect(result.current.value).toBe(2);
    expect(result.current.canRedo).toBe(false);
  });

  it("collapses quick changes with the same key into one step", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useUndoable(""));
    act(() => result.current.set("a", "text"));
    act(() => result.current.set("ab", "text"));
    vi.advanceTimersByTime(2000);
    act(() => result.current.set("abc", "text"));
    act(() => result.current.undo());
    expect(result.current.value).toBe("ab");
    act(() => result.current.undo());
    expect(result.current.value).toBe("");
    expect(result.current.canUndo).toBe(false);
  });

  it("drops the redo stack after a new change", () => {
    const { result } = renderHook(() => useUndoable(0));
    act(() => result.current.set(1));
    act(() => result.current.undo());
    act(() => result.current.set(5));
    expect(result.current.canRedo).toBe(false);
  });
});
