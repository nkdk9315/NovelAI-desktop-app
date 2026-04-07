import { create } from "zustand";
import type { GenerateImageRequest, GenerateImageResponse } from "@/types";
import * as ipc from "@/lib/ipc";

interface GenerationState {
  isGenerating: boolean;
  lastResult: GenerateImageResponse | null;
  error: string | null;
  generate: (req: GenerateImageRequest) => Promise<void>;
}

export const useGenerationStore = create<GenerationState>()((set) => ({
  isGenerating: false,
  lastResult: null,
  error: null,
  generate: async (req) => {
    set({ isGenerating: true, error: null });
    try {
      const result = await ipc.generateImage(req);
      set({ lastResult: result, isGenerating: false });
    } catch (e) {
      set({ error: String(e), isGenerating: false });
    }
  },
}));
