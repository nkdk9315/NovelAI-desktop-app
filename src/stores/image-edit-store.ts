import { create } from "zustand";
import {
  DEFAULT_IMG2IMG_NOISE,
  DEFAULT_IMG2IMG_STRENGTH,
  DEFAULT_INPAINT_STRENGTH,
} from "@/lib/constants";
import { fitGenerationSize } from "@/lib/image-size";
import type { LoadedImage } from "@/lib/canvas-image";

export type EditMode = "img2img" | "inpaint";
export type EditorLayer = "paint" | "mask";

export interface BaseImage extends LoadedImage {
  /** History image this base came from (null for files / edited results) */
  sourceImageId: string | null;
}

/** Result of the canvas editor, applied to the base image. */
export interface EditLayers {
  /** Transparent paint layer (data URL, base image resolution) */
  paintSrc: string | null;
  /** Mask layer (data URL, base image resolution) — kept for re-editing */
  maskSrc: string | null;
  /** Base image + paint flattened (base64 PNG); null when nothing was painted */
  compositeBase64: string | null;
  /** 1/8-size black / white mask PNG (base64); null when no mask */
  maskBase64: string | null;
  /** Share of the image that will be regenerated (0–1) */
  maskCoverage: number;
}

interface EditParams {
  img2imgStrength: number;
  img2imgNoise: number;
  inpaintStrength: number;
  colorCorrect: boolean;
}

interface ImageEditState extends EditParams, EditLayers {
  base: BaseImage | null;
  /** When false the base image is kept but plain text-to-image is used */
  enabled: boolean;
  mode: EditMode;
  targetWidth: number;
  targetHeight: number;
  editorOpen: boolean;
  editorLayer: EditorLayer;
  setBase: (base: BaseImage, mode?: EditMode) => void;
  clear: () => void;
  setEnabled: (enabled: boolean) => void;
  setMode: (mode: EditMode) => void;
  setParam: <K extends keyof EditParams>(key: K, value: EditParams[K]) => void;
  applyLayers: (layers: EditLayers) => void;
  openEditor: (layer: EditorLayer) => void;
  closeEditor: () => void;
}

const EMPTY_LAYERS: EditLayers = {
  paintSrc: null,
  maskSrc: null,
  compositeBase64: null,
  maskBase64: null,
  maskCoverage: 0,
};

export const useImageEditStore = create<ImageEditState>()((set) => ({
  base: null,
  enabled: true,
  mode: "img2img",
  targetWidth: 0,
  targetHeight: 0,
  editorOpen: false,
  editorLayer: "paint",
  img2imgStrength: DEFAULT_IMG2IMG_STRENGTH,
  img2imgNoise: DEFAULT_IMG2IMG_NOISE,
  inpaintStrength: DEFAULT_INPAINT_STRENGTH,
  colorCorrect: true,
  ...EMPTY_LAYERS,
  setBase: (base, mode) => {
    const size = fitGenerationSize(base.width, base.height);
    set((s) => ({
      base,
      enabled: true,
      mode: mode ?? s.mode,
      targetWidth: size.width,
      targetHeight: size.height,
      ...EMPTY_LAYERS,
    }));
  },
  clear: () => set({ base: null, editorOpen: false, ...EMPTY_LAYERS }),
  setEnabled: (enabled) => set({ enabled }),
  setMode: (mode) => set({ mode, enabled: true }),
  setParam: (key, value) => set({ [key]: value }),
  applyLayers: (layers) => set({ ...layers }),
  openEditor: (layer) => set({ editorOpen: true, editorLayer: layer }),
  closeEditor: () => set({ editorOpen: false }),
}));

/** The img2img / inpaint mode actually in effect (null = text-to-image). */
export function activeEditMode(s: Pick<ImageEditState, "base" | "enabled" | "mode">): EditMode | null {
  return s.base && s.enabled ? s.mode : null;
}
