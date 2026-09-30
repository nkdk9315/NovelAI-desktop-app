import { create } from "zustand";

/** Which page the shared panels (header, left panel) are shown in. */
export type Workspace = "generation" | "sprite";

export const useWorkspaceStore = create<{ workspace: Workspace; setWorkspace: (w: Workspace) => void }>()((set) => ({
  workspace: "generation",
  setWorkspace: (workspace) => set({ workspace }),
}));
