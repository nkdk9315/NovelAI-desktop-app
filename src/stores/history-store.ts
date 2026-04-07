import { create } from "zustand";
import type { GeneratedImageDto } from "@/types";
import * as ipc from "@/lib/ipc";

interface HistoryState {
  images: GeneratedImageDto[];
  isLoading: boolean;
  loadImages: (projectId: string, savedOnly?: boolean) => Promise<void>;
  saveImage: (imageId: string) => Promise<void>;
  saveAllImages: (projectId: string) => Promise<void>;
  deleteImage: (imageId: string) => Promise<void>;
}

export const useHistoryStore = create<HistoryState>()((set) => ({
  images: [],
  isLoading: false,
  loadImages: async (projectId, savedOnly) => {
    set({ isLoading: true });
    const images = await ipc.getProjectImages(projectId, savedOnly);
    set({ images, isLoading: false });
  },
  saveImage: async (imageId) => {
    await ipc.saveImage(imageId);
    set((state) => ({
      images: state.images.map((img) =>
        img.id === imageId ? { ...img, isSaved: true } : img,
      ),
    }));
  },
  saveAllImages: async (projectId) => {
    await ipc.saveAllImages(projectId);
    set((state) => ({
      images: state.images.map((img) =>
        img.projectId === projectId ? { ...img, isSaved: true } : img,
      ),
    }));
  },
  deleteImage: async (imageId) => {
    await ipc.deleteImage(imageId);
    set((state) => ({
      images: state.images.filter((img) => img.id !== imageId),
    }));
  },
}));
