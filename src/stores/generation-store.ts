import { create } from "zustand";
import type { GenerateImageRequest, GenerateImageResponse } from "@/types";
import * as ipc from "@/lib/ipc";

interface GenerationState {
  isGenerating: boolean;
  lastResult: GenerateImageResponse | null;
  error: string | null;
  generate: (req: GenerateImageRequest) => Promise<void>;
  selectImage: (img: { id: string; seed: number; filePath: string }) => void;
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
  selectImage: (img) => {
    set({
      lastResult: {
        id: img.id,
        base64Image: "",
        seed: img.seed,
        filePath: img.filePath,
      },
    });
  },
}));
