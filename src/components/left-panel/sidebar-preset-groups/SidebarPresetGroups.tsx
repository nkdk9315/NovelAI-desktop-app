import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebarPresetGroupStore } from "@/stores/sidebar-preset-group-store";
import { usePresetStore } from "@/stores/preset-store";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { computeDesiredCharacterPositions } from "@/lib/preset-positions";
import SidebarPresetGroupInstanceCard from "./SidebarPresetGroupInstanceCard";
import AddPresetGroupInstanceDialog from "./AddPresetGroupInstanceDialog";

export default function SidebarPresetGroups() {
  const { t } = useTranslation();
  const { id: projectId } = useParams<{ id: string }>();
  const instances = useSidebarPresetGroupStore((s) => s.instances);
  const loadInstances = useSidebarPresetGroupStore((s) => s.loadInstances);
  const clear = useSidebarPresetGroupStore((s) => s.clear);
  const presets = usePresetStore((s) => s.presets);
  const presetFolders = usePresetStore((s) => s.presetFolders);
  const loadPresets = usePresetStore((s) => s.loadPresets);
  const loadPresetFolders = usePresetStore((s) => s.loadPresetFolders);

  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    if (!projectId) { clear(); return; }
    loadInstances(projectId).catch(() => {});
    if (presets.length === 0) loadPresets().catch(() => {});
    if (presetFolders.length === 0) loadPresetFolders().catch(() => {});
  }, [projectId, loadInstances, clear, loadPresets, loadPresetFolders, presets.length, presetFolders.length]);

  const characters = useGenerationParamsStore((s) => s.characters);
  const updateCharacter = useGenerationParamsStore((s) => s.updateCharacter);
  useEffect(() => {
    const desired = computeDesiredCharacterPositions(instances, presets);
    if (desired.size === 0) return;
    characters.forEach((c, idx) => {
      const want = desired.get(c.id);
      if (!want) return;
      if (Math.abs(c.centerX - want.x) > 1e-4 || Math.abs(c.centerY - want.y) > 1e-4) {
        updateCharacter(idx, { centerX: want.x, centerY: want.y });
      }
    });
  }, [instances, presets, characters, updateCharacter]);

  if (!projectId) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-muted-foreground">
          {t("sidebarPresetGroups.title")}
        </h3>
      </div>
      <div className="space-y-2">
        {instances.map((inst) => (
          <SidebarPresetGroupInstanceCard key={inst.id} instance={inst} />
        ))}
      </div>
      <Button variant="outline" size="sm" className="w-full gap-1 text-xs" onClick={() => setAddOpen(true)}>
        <Plus className="h-3 w-3" />
        {t("sidebarPresetGroups.addInstance")}
      </Button>
      <AddPresetGroupInstanceDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
