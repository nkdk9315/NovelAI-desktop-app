import { create } from "zustand";

export interface SpriteQueueItem {
  key: string;
  /** Candidates to make (composites always make one) */
  count: number;
  preferInpaint?: boolean;
  /** One-off inpaint mask (1/8-size PNG base64) instead of the axis' regions */
  customMaskBase64?: string;
  /** Image the one-off mask is drawn over (default: the parent's adopted image) */
  sourceImageId?: string;
  /** Allow an excluded cell (a click on the cell itself, not a batch) */
  force?: boolean;
}

export interface SpriteQueueFailure {
  key: string;
  /** i18n key or raw error text */
  reason: string;
}

interface SpriteQueueState {
  items: SpriteQueueItem[];
  running: boolean;
  current: string | null;
  done: number;
  total: number;
  failures: SpriteQueueFailure[];
  stopRequested: boolean;

  enqueue: (items: SpriteQueueItem[]) => void;
  take: () => SpriteQueueItem | undefined;
  setRunning: (running: boolean, current?: string | null) => void;
  markDone: () => void;
  fail: (f: SpriteQueueFailure) => void;
  requestStop: () => void;
  clearFailures: () => void;
}

export const useSpriteQueueStore = create<SpriteQueueState>()((set, get) => ({
  items: [],
  running: false,
  current: null,
  done: 0,
  total: 0,
  failures: [],
  stopRequested: false,

  enqueue: (items) => set((s) => {
    const queued = new Set(s.items.map((i) => i.key));
    const fresh = items.filter((i) => !queued.has(i.key) && i.key !== s.current);
    const idle = !s.running && s.items.length === 0;
    return {
      items: [...s.items, ...fresh],
      total: (idle ? 0 : s.total) + fresh.length,
      done: idle ? 0 : s.done,
      failures: idle ? [] : s.failures,
      stopRequested: false,
    };
  }),
  take: () => {
    const [first, ...rest] = get().items;
    if (first) set({ items: rest });
    return first;
  },
  setRunning: (running, current = null) => set({ running, current }),
  markDone: () => set((s) => ({ done: s.done + 1 })),
  fail: (f) => set((s) => ({ failures: [...s.failures, f] })),
  requestStop: () => set({ stopRequested: true, items: [] }),
  clearFailures: () => set({ failures: [] }),
}));
