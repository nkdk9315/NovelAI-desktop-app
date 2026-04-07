import { create } from "zustand";
import type { AnlasBalanceDto } from "@/types";
import * as ipc from "@/lib/ipc";

interface SettingsState {
  settings: Record<string, string>;
  anlas: AnlasBalanceDto | null;
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  setSetting: (key: string, value: string) => Promise<void>;
  initializeClient: (apiKey: string) => Promise<void>;
  refreshAnlas: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  settings: {},
  anlas: null,
  isLoading: false,
  loadSettings: async () => {
    set({ isLoading: true });
    const settings = await ipc.getSettings();
    set({ settings, isLoading: false });
  },
  setSetting: async (key, value) => {
    await ipc.setSetting(key, value);
    set((state) => ({ settings: { ...state.settings, [key]: value } }));
  },
  initializeClient: async (apiKey) => {
    await ipc.initializeClient(apiKey);
  },
  refreshAnlas: async () => {
    const anlas = await ipc.getAnlasBalance();
    set({ anlas });
  },
}));
