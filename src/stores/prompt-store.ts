import { create } from "zustand";
import type {
  PromptGroupDto, GenreDto,
  CreatePromptGroupRequest, UpdatePromptGroupRequest, CreateGenreRequest,
} from "@/types";
import * as ipc from "@/lib/ipc";

interface PromptState {
  genres: GenreDto[];
  promptGroups: PromptGroupDto[];
  isLoading: boolean;
  loadGenres: () => Promise<void>;
  createGenre: (req: CreateGenreRequest) => Promise<GenreDto>;
  deleteGenre: (id: string) => Promise<void>;
  loadPromptGroups: (genreId?: string, usageType?: string, search?: string) => Promise<void>;
  createPromptGroup: (req: CreatePromptGroupRequest) => Promise<PromptGroupDto>;
  updatePromptGroup: (req: UpdatePromptGroupRequest) => Promise<void>;
  deletePromptGroup: (id: string) => Promise<void>;
}

export const usePromptStore = create<PromptState>()((set) => ({
  genres: [],
  promptGroups: [],
  isLoading: false,
  loadGenres: async () => {
    const genres = await ipc.listGenres();
    set({ genres });
  },
  createGenre: async (req) => {
    const genre = await ipc.createGenre(req);
    set((state) => ({ genres: [...state.genres, genre] }));
    return genre;
  },
  deleteGenre: async (id) => {
    await ipc.deleteGenre(id);
    set((state) => ({ genres: state.genres.filter((g) => g.id !== id) }));
  },
  loadPromptGroups: async (genreId, usageType, search) => {
    set({ isLoading: true });
    const promptGroups = await ipc.listPromptGroups(genreId, usageType, search);
    set({ promptGroups, isLoading: false });
  },
  createPromptGroup: async (req) => {
    const group = await ipc.createPromptGroup(req);
    set((state) => ({ promptGroups: [group, ...state.promptGroups] }));
    return group;
  },
  updatePromptGroup: async (req) => {
    await ipc.updatePromptGroup(req);
  },
  deletePromptGroup: async (id) => {
    await ipc.deletePromptGroup(id);
    set((state) => ({
      promptGroups: state.promptGroups.filter((g) => g.id !== id),
    }));
  },
}));
