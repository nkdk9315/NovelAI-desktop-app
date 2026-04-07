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
  MAX_CHARACTERS,
} from "@/lib/constants";

export interface Character {
  prompt: string;
  negativePrompt: string;
  centerX: number;
  centerY: number;
  genreName: string;
}

interface GenerationParamsData {
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
}

interface GenerationParamsState extends GenerationParamsData {
  characters: Character[];
  setParam: <K extends keyof GenerationParamsData>(key: K, value: GenerationParamsData[K]) => void;
  addCharacter: (genreName: string) => void;
  removeCharacter: (index: number) => void;
  updateCharacter: (index: number, partial: Partial<Character>) => void;
  clearCharacters: () => void;
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
  characters: [],
  setParam: (key, value) => set({ [key]: value }),
  addCharacter: (genreName) =>
    set((state) => {
      if (state.characters.length >= MAX_CHARACTERS) return state;
      return {
        characters: [
          ...state.characters,
          { prompt: "", negativePrompt: "", centerX: 0.5, centerY: 0.5, genreName },
        ],
      };
    }),
  removeCharacter: (index) =>
    set((state) => ({
      characters: state.characters.filter((_, i) => i !== index),
    })),
  updateCharacter: (index, partial) =>
    set((state) => ({
      characters: state.characters.map((c, i) =>
        i === index ? { ...c, ...partial } : c,
      ),
    })),
  clearCharacters: () => set({ characters: [] }),
}));
