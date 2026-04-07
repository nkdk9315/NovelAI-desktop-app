import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "dark" | "light";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      setTheme: (theme) => {
        document.documentElement.classList.toggle("light", theme === "light");
        set({ theme });
      },
      toggleTheme: () => {
        const next = get().theme === "dark" ? "light" : "dark";
        get().setTheme(next);
      },
    }),
    {
      name: "theme-preference",
      onRehydrateStorage: () => {
        return (rehydratedState?: ThemeState) => {
          if (rehydratedState) {
            document.documentElement.classList.toggle(
              "light",
              rehydratedState.theme === "light",
            );
          }
        };
      },
    },
  ),
);
