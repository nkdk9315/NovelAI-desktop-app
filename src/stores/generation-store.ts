import { create } from "zustand";
import type { GenerateImageRequest, GenerateImageResponse, GenerationProgressDto } from "@/types";
import * as ipc from "@/lib/ipc";

/** Latest denoising preview of the running generation (stream preview setting). */
export interface GenerationPreview {
  /** data: URL of the JPEG preview */
  src: string;
  /** Previews received so far, and about how many will come */
  count: number;
  expected: number;
  /** Size of the image being generated (previews may be smaller) */
  width: number;
  height: number;
}

/** The API streams one preview per step it samples: img2img only runs `steps × strength`. */
export function expectedPreviews(req: GenerateImageRequest): number {
  return req.action.type === "img2Img" ? Math.max(1, Math.ceil(req.steps * req.action.strength)) : req.steps;
}

interface GenerationState {
  isGenerating: boolean;
  lastResult: GenerateImageResponse | null;
  preview: GenerationPreview | null;
  error: string | null;
  /** `stream`: show the denoising previews while generating. */
  generate: (req: GenerateImageRequest, options?: { stream?: boolean }) => Promise<void>;
  selectImage: (img: { id: string; seed: number; filePath: string }) => void;
  clearResult: () => void;
  clearError: () => void;
}

/** Previews arriving after their generation ended (or from an older one) are dropped. */
let currentRun = 0;

export const useGenerationStore = create<GenerationState>()((set, get) => ({
  isGenerating: false,
  lastResult: null,
  preview: null,
  error: null,
  generate: async (req, options) => {
    const run = ++currentRun;
    set({ isGenerating: true, error: null, preview: null });
    const expected = expectedPreviews(req);
    const onProgress = (p: GenerationProgressDto) => {
      if (run !== currentRun || !get().isGenerating) return;
      set((s) => ({
        preview: {
          src: `data:image/jpeg;base64,${p.imageBase64}`,
          count: (s.preview?.count ?? 0) + 1,
          expected,
          width: req.width,
          height: req.height,
        },
      }));
    };
    try {
      const result = options?.stream ? await ipc.generateImageStream(req, onProgress) : await ipc.generateImage(req);
      set({ lastResult: result, isGenerating: false, preview: null });
    } catch (e) {
      set({ error: String(e), isGenerating: false, preview: null });
    }
  },
  clearResult: () => set({ lastResult: null, error: null }),
  clearError: () => set({ error: null }),
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
