import { create } from "zustand";
import { persist } from "zustand/middleware";

export const LEFT_SIDEBAR_MIN = 240;
export const LEFT_SIDEBAR_MAX = 560;
export const LEFT_SIDEBAR_DEFAULT = 320;

export const RIGHT_SIDEBAR_MIN = 200;
export const RIGHT_SIDEBAR_MAX = 480;
export const RIGHT_SIDEBAR_DEFAULT = 256;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

interface LayoutState {
  leftSidebarWidth: number;
  rightSidebarWidth: number;
  setLeftSidebarWidth: (width: number) => void;
  setRightSidebarWidth: (width: number) => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      leftSidebarWidth: LEFT_SIDEBAR_DEFAULT,
      rightSidebarWidth: RIGHT_SIDEBAR_DEFAULT,
      setLeftSidebarWidth: (width) =>
        set({ leftSidebarWidth: clamp(width, LEFT_SIDEBAR_MIN, LEFT_SIDEBAR_MAX) }),
      setRightSidebarWidth: (width) =>
        set({ rightSidebarWidth: clamp(width, RIGHT_SIDEBAR_MIN, RIGHT_SIDEBAR_MAX) }),
    }),
    { name: "layout-state" },
  ),
);
