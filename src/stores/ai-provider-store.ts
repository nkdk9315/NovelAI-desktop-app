import { create } from "zustand";
import type { AiProviderDto, SaveAiProviderRequest } from "@/types/ai";
import * as ipc from "@/lib/ipc-ai";

interface AiProviderState {
  providers: AiProviderDto[];
  loadProviders: () => Promise<void>;
  saveProvider: (req: SaveAiProviderRequest) => Promise<AiProviderDto>;
  deleteProvider: (id: string) => Promise<void>;
}

export const useAiProviderStore = create<AiProviderState>()((set) => ({
  providers: [],
  loadProviders: async () => {
    const providers = await ipc.listAiProviders();
    set({ providers });
  },
  saveProvider: async (req) => {
    const saved = await ipc.saveAiProvider(req);
    set((state) => ({
      providers: state.providers.some((p) => p.id === saved.id)
        ? state.providers.map((p) => (p.id === saved.id ? saved : p))
        : [...state.providers, saved],
    }));
    return saved;
  },
  deleteProvider: async (id) => {
    await ipc.deleteAiProvider(id);
    set((state) => ({ providers: state.providers.filter((p) => p.id !== id) }));
  },
}));
