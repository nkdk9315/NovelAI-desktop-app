import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/stores/theme-store";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:outline-none"
      aria-label="Toggle theme"
      title={isDark ? "Light mode" : "Dark mode"}
    >
      <Sun
        size={16}
        className={`absolute transition-all duration-300 ${
          isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
        }`}
      />
      <Moon
        size={16}
        className={`absolute transition-all duration-300 ${
          isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
        }`}
      />
    </button>
  );
}
