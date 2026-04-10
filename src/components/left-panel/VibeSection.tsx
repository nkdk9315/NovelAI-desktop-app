import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ImageIcon, Scale, Settings2, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { useProjectStore } from "@/stores/project-store";
import { MAX_TOTAL_VIBES, MODEL_TO_VIBE_KEY } from "@/lib/constants";
import type { ProjectVibeDto } from "@/types";
import * as ipc from "@/lib/ipc";
import VibeModal from "@/components/modals/VibeModal";

export default function VibeSection() {
  const { t } = useTranslation();
  const currentProject = useProjectStore((s) => s.currentProject);
  const currentModel = useGenerationParamsStore((s) => s.model);
  const selectedVibes = useGenerationParamsStore((s) => s.selectedVibes);
  const addVibe = useGenerationParamsStore((s) => s.addVibe);
  const toggleVibe = useGenerationParamsStore((s) => s.toggleVibe);
  const updateVibeStrength = useGenerationParamsStore((s) => s.updateVibeStrength);
  const sidebarPresets = useGenerationParamsStore((s) => s.sidebarPresets);
  const normalizeVibeStrength = useGenerationParamsStore((s) => s.normalizeVibeStrength);
  const normalizeArtistStrength = useGenerationParamsStore((s) => s.normalizeArtistStrength);
  const setParam = useGenerationParamsStore((s) => s.setParam);
  const currentVibeKey = MODEL_TO_VIBE_KEY[currentModel];

  // Collect vibe IDs used by enabled sidebar presets
  const presetVibeIds = new Set(
    sidebarPresets
      .filter((p) => p.enabled)
      .flatMap((p) => p.selectedVibes.filter((v) => v.enabled).map((v) => v.vibeId)),
  );

  const [projectVibes, setProjectVibes] = useState<ProjectVibeDto[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const loadVibes = useCallback(async () => {
    if (!currentProject) return;
    try {
      setProjectVibes(await ipc.listProjectVibesAll(currentProject.id));
    } catch {
      // silently fail
    }
  }, [currentProject]);

  useEffect(() => {
    loadVibes();
  }, [loadVibes]);

  // Listen for external vibe changes (e.g., D&D import)
  useEffect(() => {
    const handler = () => loadVibes();
    window.addEventListener("vibes-changed", handler);
    return () => window.removeEventListener("vibes-changed", handler);
  }, [loadVibes]);

  const handleRemove = async (vibeId: string) => {
    if (!currentProject) return;
    try {
      await ipc.removeVibeFromProject(currentProject.id, vibeId);
      await loadVibes();
    } catch {
      // silently fail
    }
  };

  // Compute total vibe count
  const presetVibeCount = sidebarPresets
    .filter((p) => p.enabled)
    .reduce((sum, p) => sum + p.selectedVibes.filter((v) => v.enabled).length, 0);
  const independentVibeCount = selectedVibes.filter((v) => v.enabled).length;
  const totalVibeCount = presetVibeCount + independentVibeCount;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">{t("vibe.title")}</p>
          {totalVibeCount > 0 && (
            <span className={`text-[10px] ${totalVibeCount >= 5 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
              {totalVibeCount}/{MAX_TOTAL_VIBES}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={(normalizeVibeStrength || normalizeArtistStrength) ? "default" : "ghost"}
                size="sm"
                className="h-6 px-1.5 text-[10px] gap-0.5"
                title={t("normalize.balanceStrength")}
              >
                <Scale className="h-3 w-3" />
                {t("normalize.balanceStrength")}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-2 space-y-1.5">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="norm-vibe"
                  checked={normalizeVibeStrength}
                  onCheckedChange={(v) => setParam("normalizeVibeStrength", v === true)}
                />
                <Label htmlFor="norm-vibe" className="text-xs cursor-pointer">{t("normalize.vibe")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="norm-artist"
                  checked={normalizeArtistStrength}
                  onCheckedChange={(v) => setParam("normalizeArtistStrength", v === true)}
                />
                <Label htmlFor="norm-artist" className="text-xs cursor-pointer">{t("normalize.artist")}</Label>
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setModalOpen(true)}>
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {projectVibes.length > 0 && (
        <div className="space-y-1">
          {projectVibes.map((pv) => {
            const selected = selectedVibes.find((sv) => sv.vibeId === pv.vibeId);
            return (
              <VibeItem
                key={pv.vibeId}
                projectVibe={pv}
                selected={selected}
                modelMismatch={!!currentVibeKey && pv.model !== currentVibeKey}
                isInPreset={presetVibeIds.has(pv.vibeId)}
                onToggle={() => {
                  if (selected) {
                    toggleVibe(pv.vibeId);
                  } else {
                    addVibe(pv.vibeId);
                  }
                }}
                onStrengthChange={(v) => updateVibeStrength(pv.vibeId, v)}
                onRemove={() => handleRemove(pv.vibeId)}
              />
            );
          })}
        </div>
      )}

      {projectVibes.length === 0 && (
        <p className="text-xs text-muted-foreground">{t("vibe.empty")}</p>
      )}

      <VibeModal open={modalOpen} onOpenChange={setModalOpen} onVibesChanged={loadVibes} />
    </div>
  );
}

interface VibeItemProps {
  projectVibe: ProjectVibeDto;
  selected: { strength: number; enabled: boolean } | undefined;
  modelMismatch: boolean;
  isInPreset: boolean;
  onToggle: () => void;
  onStrengthChange: (value: number) => void;
  onRemove: () => void;
}

function VibeItem({ projectVibe, selected, modelMismatch, isInPreset, onToggle, onStrengthChange, onRemove }: VibeItemProps) {
  const { t } = useTranslation();
  const isEnabled = isInPreset || (selected?.enabled ?? false);

  return (
    <div className={`rounded-md border border-border p-2 space-y-1.5 ${modelMismatch ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-2">
        {modelMismatch && (
          <span title={t("vibe.modelMismatch")}>
            <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
          </span>
        )}
        <Checkbox
          checked={isEnabled}
          onCheckedChange={isInPreset ? undefined : onToggle}
          disabled={isInPreset}
          aria-label={projectVibe.vibeName}
        />
        {projectVibe.thumbnailPath ? (
          <img
            src={`asset://localhost/${projectVibe.thumbnailPath}`}
            alt=""
            className="h-8 w-8 rounded object-cover shrink-0"
          />
        ) : (
          <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <span className="text-xs truncate flex-1">{projectVibe.vibeName}</span>
        {isInPreset && (
          <span className="text-[8px] px-1 py-0.5 rounded bg-primary/20 text-primary shrink-0">P</span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 shrink-0"
          onClick={onRemove}
          title={t("vibe.removeFromSidebar")}
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </Button>
      </div>
      {isEnabled && selected && !isInPreset && (
        <div className="space-y-1 pl-12">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-12">{t("vibe.strength")}</span>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={[selected.strength]}
              onValueChange={([v]) => onStrengthChange(v)}
            />
            <span className="text-[10px] text-muted-foreground w-8 text-right">
              {selected.strength.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
