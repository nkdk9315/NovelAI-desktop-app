import { useState } from "react";
import { ArrowLeft, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Separator } from "@/components/ui/separator";
import AnlasDisplay from "./AnlasDisplay";
import CostDisplay from "./CostDisplay";
import GenerationParams from "./GenerationParams";
import ThemeToggle from "./ThemeToggle";
import SettingsDialog from "@/components/modals/SettingsDialog";
import { useProjectStore } from "@/stores/project-store";

export default function Header() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const currentProject = useProjectStore((s) => s.currentProject);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
            aria-label={t("common.back")}
          >
            <ArrowLeft size={16} />
          </button>
          <span className="max-w-[160px] truncate text-sm font-medium">
            {currentProject?.name ?? t("project.title")}
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
            onClick={() => setSettingsOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
            aria-label={t("common.settings")}
          >
            <Settings size={16} />
          </button>
          <ThemeToggle />
        </div>
      </header>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
