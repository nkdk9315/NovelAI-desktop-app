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
  MAX_VIBES,
} from "@/lib/constants";
import type { StylePresetDto, VibeDto } from "@/types";

export interface Character {
  id: string;
  prompt: string;
  negativePrompt: string;
  centerX: number;
  centerY: number;
  genreName: string;
}

export interface SelectedVibe {
  vibeId: string;
  strength: number;
  infoExtracted: number;
  enabled: boolean;
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
  selectedVibes: SelectedVibe[];
  artistTags: string[];
  selectedStylePresetId: string | null;
  setParam: <K extends keyof GenerationParamsData>(key: K, value: GenerationParamsData[K]) => void;
  addCharacter: (genreName: string) => void;
  removeCharacter: (index: number) => void;
  updateCharacter: (index: number, partial: Partial<Character>) => void;
  clearCharacters: () => void;
  addVibe: (vibeId: string) => void;
  removeVibe: (vibeId: string) => void;
  toggleVibe: (vibeId: string) => void;
  updateVibeStrength: (vibeId: string, strength: number) => void;
  updateVibeInfoExtracted: (vibeId: string, infoExtracted: number) => void;
  setArtistTags: (tags: string[]) => void;
  setStylePreset: (presetId: string) => void;
  clearStylePreset: () => void;
  applyStylePreset: (preset: StylePresetDto, vibes: VibeDto[]) => void;
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
  selectedVibes: [],
  artistTags: [],
  selectedStylePresetId: null,
  setParam: (key, value) => set({ [key]: value }),
  addCharacter: (genreName) =>
    set((state) => {
      if (state.characters.length >= MAX_CHARACTERS) return state;
      return {
        characters: [
          ...state.characters,
          { id: crypto.randomUUID(), prompt: "", negativePrompt: "", centerX: 0.5, centerY: 0.5, genreName },
        ],
      };
    }),
  removeCharacter: (index) =>
    set((state) => ({
      characters: state.characters.filter((_, i) => i !== index),
    })),
  updateCharacter: (index, partial) =>
    set((state) => {
      if (index < 0 || index >= state.characters.length) return state;
      return {
        characters: state.characters.map((c, i) =>
          i === index ? { ...c, ...partial } : c,
        ),
      };
    }),
  clearCharacters: () => set({ characters: [] }),
  addVibe: (vibeId) =>
    set((state) => {
      if (state.selectedVibes.length >= MAX_VIBES) return state;
      if (state.selectedVibes.some((v) => v.vibeId === vibeId)) return state;
      return {
        selectedVibes: [
          ...state.selectedVibes,
          { vibeId, strength: 0.7, infoExtracted: 0.7, enabled: true },
        ],
      };
    }),
  removeVibe: (vibeId) =>
    set((state) => ({
      selectedVibes: state.selectedVibes.filter((v) => v.vibeId !== vibeId),
    })),
  toggleVibe: (vibeId) =>
    set((state) => ({
      selectedVibes: state.selectedVibes.map((v) =>
        v.vibeId === vibeId ? { ...v, enabled: !v.enabled } : v,
      ),
    })),
  updateVibeStrength: (vibeId, strength) =>
    set((state) => ({
      selectedVibes: state.selectedVibes.map((v) =>
        v.vibeId === vibeId ? { ...v, strength } : v,
      ),
    })),
  updateVibeInfoExtracted: (vibeId, infoExtracted) =>
    set((state) => ({
      selectedVibes: state.selectedVibes.map((v) =>
        v.vibeId === vibeId ? { ...v, infoExtracted } : v,
      ),
    })),
  setArtistTags: (tags) => set({ artistTags: tags }),
  setStylePreset: (presetId) => set({ selectedStylePresetId: presetId }),
  clearStylePreset: () =>
    set({ selectedStylePresetId: null, artistTags: [], selectedVibes: [] }),
  applyStylePreset: (preset, vibes) =>
    set({
      selectedStylePresetId: preset.id,
      artistTags: preset.artistTags,
      selectedVibes: vibes
        .filter((v) => preset.vibeIds.includes(v.id))
        .slice(0, MAX_VIBES)
        .map((v) => ({
          vibeId: v.id,
          strength: 0.7,
          infoExtracted: 0.7,
          enabled: true,
        })),
    }),
}));
