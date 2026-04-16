import { create } from "zustand";
import type {
  PromptGroupDto, PromptGroupFolderDto, GenreDto,
  CreatePromptGroupRequest, UpdatePromptGroupRequest,
  CreateGenreRequest, UpdateGenreRequest,
} from "@/types";
import * as ipc from "@/lib/ipc";

interface PromptState {
  genres: GenreDto[];
  promptGroups: PromptGroupDto[];
  promptGroupFolders: PromptGroupFolderDto[];
  isLoading: boolean;
  loadGenres: () => Promise<void>;
  createGenre: (req: CreateGenreRequest) => Promise<GenreDto>;
  updateGenre: (req: UpdateGenreRequest) => Promise<GenreDto>;
  deleteGenre: (id: string) => Promise<void>;
  loadPromptGroups: (search?: string) => Promise<void>;
  loadPromptGroupFolders: () => Promise<void>;
  createPromptGroup: (req: CreatePromptGroupRequest) => Promise<PromptGroupDto>;
  updatePromptGroup: (req: UpdatePromptGroupRequest) => Promise<void>;
  deletePromptGroup: (id: string) => Promise<void>;
  createPromptGroupFolder: (
    title: string,
    parentId: number | null,
  ) => Promise<PromptGroupFolderDto>;
  renamePromptGroupFolder: (id: number, title: string) => Promise<void>;
  movePromptGroupFolder: (id: number, parentId: number | null) => Promise<void>;
  deletePromptGroupFolder: (id: number) => Promise<void>;
  deletePromptGroupsInFolder: (folderId: number) => Promise<number>;
}

export const usePromptStore = create<PromptState>()((set, get) => ({
  genres: [],
  promptGroups: [],
  promptGroupFolders: [],
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
  updateGenre: async (req) => {
    const updated = await ipc.updateGenre(req);
    set((state) => ({
      genres: state.genres.map((g) => (g.id === updated.id ? updated : g)),
    }));
    return updated;
  },
  deleteGenre: async (id) => {
    await ipc.deleteGenre(id);
    set((state) => ({ genres: state.genres.filter((g) => g.id !== id) }));
  },
  loadPromptGroups: async (search) => {
    set({ isLoading: true });
    const promptGroups = await ipc.listPromptGroups(search);
    set({ promptGroups, isLoading: false });
  },
  loadPromptGroupFolders: async () => {
    const promptGroupFolders = await ipc.listPromptGroupFolders();
    set({ promptGroupFolders });
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
  createPromptGroupFolder: async (title, parentId) => {
    const folder = await ipc.createPromptGroupFolder(title, parentId);
    await get().loadPromptGroupFolders();
    return folder;
  },
  renamePromptGroupFolder: async (id, title) => {
    await ipc.renamePromptGroupFolder(id, title);
    await get().loadPromptGroupFolders();
  },
  movePromptGroupFolder: async (id, parentId) => {
    await ipc.movePromptGroupFolder(id, parentId);
    await get().loadPromptGroupFolders();
  },
  deletePromptGroupFolder: async (id) => {
    await ipc.deletePromptGroupFolder(id);
    await Promise.all([
      get().loadPromptGroupFolders(),
      get().loadPromptGroups(),
    ]);
  },
  deletePromptGroupsInFolder: async (folderId) => {
    const count = await ipc.deletePromptGroupsInFolder(folderId);
    await get().loadPromptGroups();
    return count;
  },
}));
