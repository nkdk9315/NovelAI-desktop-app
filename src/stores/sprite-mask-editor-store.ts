import { create } from "zustand";

/** What the sprite mask editor is open for. */
export type SpriteMaskEditorRequest =
  /** Draw the named regions of a pose (saved into the spec) */
  | { kind: "regions"; poseId: string; regionId?: string }
  /** Draw a one-off mask over a cell's image and regenerate it */
  | { kind: "custom"; cellKey: string; imageId: string };

export const useSpriteMaskEditorStore = create<{
  request: SpriteMaskEditorRequest | null;
  open: (r: SpriteMaskEditorRequest) => void;
  close: () => void;
}>()((set) => ({
  request: null,
  open: (request) => set({ request }),
  close: () => set({ request: null }),
}));
