import { create } from "zustand";
import type { DirectorTool } from "@/components/modals/director-tools/tool-defs";

interface DirectorToolsState {
  /** History image the tools run on; null = closed */
  imageId: string | null;
  initialTool: DirectorTool;
  openFor: (imageId: string, tool?: DirectorTool) => void;
  close: () => void;
}

export const useDirectorToolsStore = create<DirectorToolsState>()((set) => ({
  imageId: null,
  initialTool: "bg-removal",
  openFor: (imageId, tool) => set((s) => ({ imageId, initialTool: tool ?? s.initialTool })),
  close: () => set({ imageId: null }),
}));
