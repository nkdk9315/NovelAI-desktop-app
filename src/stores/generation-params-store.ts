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
  MAX_VIBES,
  maxCharactersFor,
} from "@/lib/constants";
import type { NegativePresetId } from "@/lib/constants";
import type { QualityPresetId } from "@/lib/prompt-decoration";
import type { ArtistTag, RandomPresetSettings, StylePresetDto, VibeDto } from "@/types";

export interface Character {
  id: string;
  prompt: string;
  negativePrompt: string;
  centerX: number;
  centerY: number;
  genreName: string;
  genreId: string;
  genreIcon: string;
  genreColor: string;
}

export interface SelectedVibe {
  vibeId: string;
  strength: number;
  enabled: boolean;
}

export interface SidebarPreset {
  id: string;
  enabled: boolean;
  artistTags: ArtistTag[];
  selectedVibes: SelectedVibe[];
  isRandom?: boolean;
  name?: string;
  randomSettings?: RandomPresetSettings;
}

interface GenerationParamsData {
  negativePrompt: string;
  negativePreset: NegativePresetId;
  showNegativePresetInInput: boolean;
  /** Quality tags added after the prompt ("standard" / "light" / "none" / custom) */
  qualityPreset: QualityPresetId;
  /** Furry mode: prefix the prompt with "fur dataset" (off = anime mode) */
  furryMode: boolean;
  model: string;
  sampler: string;
  noiseSchedule: string;
  steps: number;
  scale: number;
  cfgRescale: number;
  width: number;
  height: number;
  normalizeVibeStrength: boolean;
  normalizeArtistStrength: boolean;
  /** V5 only: request a transparent background */
  transparentBackground: boolean;
  /** Fixed seed; null = random for every generation */
  seed: number | null;
}

interface GenerationParamsState extends GenerationParamsData {
  characters: Character[];
  selectedVibes: SelectedVibe[];
  sidebarPresets: SidebarPreset[];
  setParam: <K extends keyof GenerationParamsData>(key: K, value: GenerationParamsData[K]) => void;
  addCharacter: (genre: { name: string; id: string; icon: string; color: string }) => void;
  removeCharacter: (index: number) => void;
  updateCharacter: (index: number, partial: Partial<Character>) => void;
  clearCharacters: () => void;
  // Independent vibes (from sidebar vibe section)
  addVibe: (vibeId: string) => void;
  removeVibe: (vibeId: string) => void;
  toggleVibe: (vibeId: string) => void;
  updateVibeStrength: (vibeId: string, strength: number) => void;
  // Sidebar presets
  addSidebarPreset: (preset: StylePresetDto, vibes: VibeDto[]) => void;
  removeSidebarPreset: (presetId: string) => void;
  toggleSidebarPreset: (presetId: string) => void;
  updatePresetArtistTags: (presetId: string, tags: ArtistTag[]) => void;
  updatePresetVibeStrength: (presetId: string, vibeId: string, strength: number) => void;
  addPresetVibe: (presetId: string, vibeId: string) => void;
  removePresetVibe: (presetId: string, vibeId: string) => void;
  setSidebarPresets: (presets: SidebarPreset[]) => void;
  // Random presets
  addRandomPreset: (preset: SidebarPreset) => void;
  rerollRandomPreset: (presetId: string, newData: Pick<SidebarPreset, "artistTags" | "selectedVibes">) => void;
  updateRandomPresetSettings: (presetId: string, settings: RandomPresetSettings) => void;
  replaceWithSavedPreset: (randomPresetId: string, savedPreset: StylePresetDto, vibes: VibeDto[]) => void;
  // Persistence helpers
  // Bulk setters (used by history restore)
  setCharacters: (characters: Character[]) => void;
  setSelectedVibes: (vibes: SelectedVibe[]) => void;
}

export const useGenerationParamsStore = create<GenerationParamsState>()((set) => ({
  negativePrompt: DEFAULT_NEGATIVE_PROMPT,
  negativePreset: "none",
  showNegativePresetInInput: false,
  qualityPreset: "none",
  furryMode: false,
  model: DEFAULT_MODEL,
  sampler: DEFAULT_SAMPLER,
  noiseSchedule: DEFAULT_NOISE_SCHEDULE,
  steps: DEFAULT_STEPS,
  scale: DEFAULT_SCALE,
  cfgRescale: DEFAULT_CFG_RESCALE,
  width: DEFAULT_WIDTH,
  height: DEFAULT_HEIGHT,
  normalizeVibeStrength: true,
  normalizeArtistStrength: true,
  transparentBackground: false,
  seed: null,
  characters: [],
  selectedVibes: [],
  sidebarPresets: [],
  setParam: (key, value) => set({ [key]: value }),
  addCharacter: (genre) =>
    set((state) => {
      if (state.characters.length >= maxCharactersFor(state.model)) return state;
      return {
        characters: [
          ...state.characters,
          {
            id: crypto.randomUUID(),
            prompt: "",
            negativePrompt: "",
            centerX: 0.5,
            centerY: 0.5,
            genreName: genre.name,
            genreId: genre.id,
            genreIcon: genre.icon,
            genreColor: genre.color,
          },
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
      return { selectedVibes: [...state.selectedVibes, { vibeId, strength: 0.7, enabled: true }] };
    }),
  removeVibe: (vibeId) =>
    set((state) => ({ selectedVibes: state.selectedVibes.filter((v) => v.vibeId !== vibeId) })),
  toggleVibe: (vibeId) =>
    set((state) => ({
      selectedVibes: state.selectedVibes.map((v) => v.vibeId === vibeId ? { ...v, enabled: !v.enabled } : v),
    })),
  updateVibeStrength: (vibeId, strength) =>
    set((state) => ({
      selectedVibes: state.selectedVibes.map((v) => v.vibeId === vibeId ? { ...v, strength } : v),
    })),

  addSidebarPreset: (preset, vibes) =>
    set((state) => {
      if (state.sidebarPresets.some((p) => p.id === preset.id)) return state;
      const presetVibeIds = new Set(preset.vibeRefs.map((vr) => vr.vibeId));
      // Auto-enable independent vibes that match preset vibes
      const updatedSelectedVibes = state.selectedVibes.map((v) =>
        presetVibeIds.has(v.vibeId) ? { ...v, enabled: true } : v,
      );
      return {
        selectedVibes: updatedSelectedVibes,
        sidebarPresets: [
          ...state.sidebarPresets,
          {
            id: preset.id,
            enabled: true,
            artistTags: [...preset.artistTags],
            selectedVibes: preset.vibeRefs
              .filter((vr) => vibes.some((v) => v.id === vr.vibeId))
              .slice(0, MAX_VIBES)
              .map((vr) => ({ vibeId: vr.vibeId, strength: vr.strength, enabled: true })),
          },
        ],
      };
    }),

  removeSidebarPreset: (presetId) =>
    set((state) => ({
      sidebarPresets: state.sidebarPresets.filter((p) => p.id !== presetId),
    })),

  toggleSidebarPreset: (presetId) =>
    set((state) => ({
      sidebarPresets: state.sidebarPresets.map((p) =>
        p.id === presetId ? { ...p, enabled: !p.enabled } : p,
      ),
    })),

  updatePresetArtistTags: (presetId, tags) =>
    set((state) => ({
      sidebarPresets: state.sidebarPresets.map((p) =>
        p.id === presetId ? { ...p, artistTags: tags } : p,
      ),
    })),

  updatePresetVibeStrength: (presetId, vibeId, strength) =>
    set((state) => ({
      sidebarPresets: state.sidebarPresets.map((p) =>
        p.id === presetId
          ? { ...p, selectedVibes: p.selectedVibes.map((v) => v.vibeId === vibeId ? { ...v, strength } : v) }
          : p,
      ),
    })),

  addPresetVibe: (presetId, vibeId) =>
    set((state) => ({
      sidebarPresets: state.sidebarPresets.map((p) => {
        if (p.id !== presetId) return p;
        if (p.selectedVibes.some((v) => v.vibeId === vibeId)) return p;
        if (p.selectedVibes.length >= MAX_VIBES) return p;
        return { ...p, selectedVibes: [...p.selectedVibes, { vibeId, strength: 0.7, enabled: true }] };
      }),
    })),

  removePresetVibe: (presetId, vibeId) =>
    set((state) => ({
      sidebarPresets: state.sidebarPresets.map((p) =>
        p.id === presetId
          ? { ...p, selectedVibes: p.selectedVibes.filter((v) => v.vibeId !== vibeId) }
          : p,
      ),
    })),

  setSidebarPresets: (presets) => set({ sidebarPresets: presets }),

  addRandomPreset: (preset) =>
    set((state) => ({
      sidebarPresets: [...state.sidebarPresets, preset],
    })),

  rerollRandomPreset: (presetId, newData) =>
    set((state) => ({
      sidebarPresets: state.sidebarPresets.map((p) =>
        p.id === presetId ? { ...p, artistTags: newData.artistTags, selectedVibes: newData.selectedVibes } : p,
      ),
    })),

  updateRandomPresetSettings: (presetId, settings) =>
    set((state) => ({
      sidebarPresets: state.sidebarPresets.map((p) =>
        p.id === presetId ? { ...p, randomSettings: settings } : p,
      ),
    })),

  replaceWithSavedPreset: (randomPresetId, savedPreset, vibes) =>
    set((state) => ({
      sidebarPresets: state.sidebarPresets.map((p) => {
        if (p.id !== randomPresetId) return p;
        return {
          id: savedPreset.id,
          enabled: p.enabled,
          artistTags: [...savedPreset.artistTags],
          selectedVibes: savedPreset.vibeRefs
            .filter((vr) => vibes.some((v) => v.id === vr.vibeId))
            .map((vr) => ({ vibeId: vr.vibeId, strength: vr.strength, enabled: true })),
        };
      }),
    })),

  setCharacters: (characters) => set({ characters }),
  setSelectedVibes: (vibes) => set({ selectedVibes: vibes }),
}));
