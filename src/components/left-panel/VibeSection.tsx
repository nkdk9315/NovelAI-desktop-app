import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Settings2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import type { VibeDto } from "@/types";
import * as ipc from "@/lib/ipc";
import VibeModal from "@/components/modals/VibeModal";

export default function VibeSection() {
  const { t } = useTranslation();
  const selectedVibes = useGenerationParamsStore((s) => s.selectedVibes);
  const addVibe = useGenerationParamsStore((s) => s.addVibe);
  const toggleVibe = useGenerationParamsStore((s) => s.toggleVibe);
  const updateVibeStrength = useGenerationParamsStore((s) => s.updateVibeStrength);
  const updateVibeInfoExtracted = useGenerationParamsStore((s) => s.updateVibeInfoExtracted);

  const [vibes, setVibes] = useState<VibeDto[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const loadVibes = async () => {
    try {
      const list = await ipc.listVibes();
      setVibes(list);
    } catch {
      // silently fail - vibes are optional
    }
  };

  useEffect(() => {
    loadVibes();
  }, []);

  // Auto-add newly imported vibes to selection
  const handleVibesChanged = () => {
    loadVibes();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{t("vibe.title")}</p>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setModalOpen(true)}>
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {vibes.length > 0 && (
        <div className="space-y-1">
          {vibes.map((vibe) => {
            const selected = selectedVibes.find((sv) => sv.vibeId === vibe.id);
            return (
              <VibeItem
                key={vibe.id}
                vibe={vibe}
                selected={selected}
                onToggle={() => {
                  if (selected) {
                    toggleVibe(vibe.id);
                  } else {
                    addVibe(vibe.id);
                  }
                }}
                onStrengthChange={(v) => updateVibeStrength(vibe.id, v)}
                onInfoExtractedChange={(v) => updateVibeInfoExtracted(vibe.id, v)}
              />
            );
          })}
        </div>
      )}

      {vibes.length === 0 && (
        <p className="text-xs text-muted-foreground">{t("vibe.empty")}</p>
      )}

      <VibeModal open={modalOpen} onOpenChange={setModalOpen} onVibesChanged={handleVibesChanged} />
    </div>
  );
}

interface VibeItemProps {
  vibe: VibeDto;
  selected: { strength: number; infoExtracted: number; enabled: boolean } | undefined;
  onToggle: () => void;
  onStrengthChange: (value: number) => void;
  onInfoExtractedChange: (value: number) => void;
}

function VibeItem({ vibe, selected, onToggle, onStrengthChange, onInfoExtractedChange }: VibeItemProps) {
  const { t } = useTranslation();
  const isEnabled = selected?.enabled ?? false;

  return (
    <div className="rounded-md border border-border p-2 space-y-1.5">
      <div className="flex items-center gap-2">
        <Checkbox
          checked={isEnabled}
          onCheckedChange={onToggle}
          aria-label={vibe.name}
        />
        <span className="text-xs truncate flex-1">{vibe.name}</span>
        <span className="text-[10px] text-muted-foreground">{vibe.model}</span>
      </div>
      {isEnabled && selected && (
        <div className="space-y-1 pl-6">
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
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-12">{t("vibe.infoExtracted")}</span>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={[selected.infoExtracted]}
              onValueChange={([v]) => onInfoExtractedChange(v)}
            />
            <span className="text-[10px] text-muted-foreground w-8 text-right">
              {selected.infoExtracted.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
