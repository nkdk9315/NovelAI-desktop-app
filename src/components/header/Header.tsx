import { ArrowLeft, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import AnlasDisplay from "./AnlasDisplay";
import CostDisplay from "./CostDisplay";
import GenerationParams from "./GenerationParams";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  const navigate = useNavigate();

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate("/")}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
          aria-label="Back"
        >
          <ArrowLeft size={16} />
        </button>
        <span className="max-w-[160px] truncate text-sm font-medium">
          {/* TODO: project name */}
          Project
        </span>
        <Separator orientation="vertical" className="h-5" />
        <AnlasDisplay />
        <Separator orientation="vertical" className="h-5" />
        <CostDisplay />
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <GenerationParams />
        <Separator orientation="vertical" className="h-5" />
        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
          aria-label="Settings"
        >
          <Settings size={16} />
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
