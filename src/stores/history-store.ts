import { create } from "zustand";
import type { GeneratedImageDto } from "@/types";
import * as ipc from "@/lib/ipc";

interface HistoryState {
  images: GeneratedImageDto[];
  isLoading: boolean;
  selectedImageIds: string[];
  loadImages: (projectId: string, savedOnly?: boolean) => Promise<void>;
  saveImage: (imageId: string) => Promise<void>;
  saveAllImages: (projectId: string) => Promise<void>;
  saveSelectedImages: () => Promise<void>;
  deleteImage: (imageId: string) => Promise<void>;
  toggleImageSelection: (imageId: string) => void;
  clearSelection: () => void;
}

export const useHistoryStore = create<HistoryState>()((set, get) => ({
  images: [],
  isLoading: false,
  selectedImageIds: [],
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
  saveSelectedImages: async () => {
    const ids = [...get().selectedImageIds];
    if (ids.length === 0) return;
    await Promise.all(ids.map((id) => ipc.saveImage(id)));
    set((state) => ({
      images: state.images.map((img) =>
        ids.includes(img.id) ? { ...img, isSaved: true } : img,
      ),
      selectedImageIds: [],
    }));
  },
  deleteImage: async (imageId) => {
    await ipc.deleteImage(imageId);
    set((state) => ({
      images: state.images.filter((img) => img.id !== imageId),
      selectedImageIds: state.selectedImageIds.filter((id) => id !== imageId),
    }));
  },
  toggleImageSelection: (imageId) => {
    set((state) => ({
      selectedImageIds: state.selectedImageIds.includes(imageId)
        ? state.selectedImageIds.filter((id) => id !== imageId)
        : [...state.selectedImageIds, imageId],
    }));
  },
  clearSelection: () => {
    set({ selectedImageIds: [] });
  },
}));
