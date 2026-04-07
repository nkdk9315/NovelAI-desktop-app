import { create } from "zustand";
import {
  DEFAULT_MODEL,
  DEFAULT_SAMPLER,
  DEFAULT_NOISE_SCHEDULE,
  DEFAULT_STEPS,
  DEFAULT_SCALE,
  DEFAULT_CFG_RESCALE,
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  DEFAULT_NEGATIVE_PROMPT,
} from "@/lib/constants";

interface GenerationParamsState {
  prompt: string;
  negativePrompt: string;
  model: string;
  sampler: string;
  noiseSchedule: string;
  steps: number;
  scale: number;
  cfgRescale: number;
  width: number;
  height: number;
  setParam: <K extends keyof GenerationParamsState>(key: K, value: GenerationParamsState[K]) => void;
}

export const useGenerationParamsStore = create<GenerationParamsState>()((set) => ({
  prompt: "",
  negativePrompt: DEFAULT_NEGATIVE_PROMPT,
  model: DEFAULT_MODEL,
  sampler: DEFAULT_SAMPLER,
  noiseSchedule: DEFAULT_NOISE_SCHEDULE,
  steps: DEFAULT_STEPS,
  scale: DEFAULT_SCALE,
  cfgRescale: DEFAULT_CFG_RESCALE,
  width: DEFAULT_WIDTH,
  height: DEFAULT_HEIGHT,
  setParam: (key, value) => set({ [key]: value }),
}));
