import { create } from "zustand";

/** Typesetting dialog: which history image is being typeset (null = closed). */
interface TypesetState {
  imageId: string | null;
  openFor: (imageId: string) => void;
  close: () => void;
}

export const useTypesetStore = create<TypesetState>()((set) => ({
  imageId: null,
  openFor: (imageId) => set({ imageId }),
  close: () => set({ imageId: null }),
}));
