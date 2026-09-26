import { create } from "zustand";
import type { LoadedImage } from "@/lib/canvas-image";
import type { CharRefMode } from "@/types";

interface CharRefState {
  image: LoadedImage | null;
  enabled: boolean;
  mode: CharRefMode;
  strength: number;
  fidelity: number;
  setImage: (image: LoadedImage | null) => void;
  setEnabled: (enabled: boolean) => void;
  setMode: (mode: CharRefMode) => void;
  setStrength: (strength: number) => void;
  setFidelity: (fidelity: number) => void;
}

export const useCharRefStore = create<CharRefState>()((set) => ({
  image: null,
  enabled: true,
  mode: "character&style",
  strength: 1,
  fidelity: 1,
  setImage: (image) => set({ image, enabled: image !== null }),
  setEnabled: (enabled) => set({ enabled }),
  setMode: (mode) => set({ mode }),
  setStrength: (strength) => set({ strength }),
  setFidelity: (fidelity) => set({ fidelity }),
}));
