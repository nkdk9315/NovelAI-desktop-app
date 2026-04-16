import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dices, ImageIcon, Settings, Settings2, SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { useSidebarArtistTagsStore } from "@/stores/sidebar-artist-tags-store";
import { useProjectStore } from "@/stores/project-store";
import type { RandomPresetSettings, StylePresetDto, VibeDto } from "@/types";
import { DEFAULT_RANDOM_PRESET_SETTINGS } from "@/lib/constants";
import { generateRandomPreset } from "@/lib/random-preset";
import { loadAllVibeFolders } from "@/lib/vibe-utils";
import * as ipc from "@/lib/ipc";
import StylePresetModal from "@/components/modals/StylePresetModal";
import RandomPresetSettingsDialog from "@/components/modals/RandomPresetSettingsDialog";
import PresetTweakPanel from "./PresetTweakPanel";
import SidebarArtistTagInput from "./SidebarArtistTagInput";

const GLOBAL_SETTINGS_KEY = "random_preset_settings";

export default function ArtistStyleSection() {
  const { t } = useTranslation();
  const currentProject = useProjectStore((s) => s.currentProject);
  const model = useGenerationParamsStore((s) => s.model);
  const sidebarPresets = useGenerationParamsStore((s) => s.sidebarPresets);
  const toggleSidebarPreset = useGenerationParamsStore((s) => s.toggleSidebarPreset);
  const removeSidebarPreset = useGenerationParamsStore((s) => s.removeSidebarPreset);
  const saveSidebarPresets = useGenerationParamsStore((s) => s.saveSidebarPresets);
  const loadSidebarPresets = useGenerationParamsStore((s) => s.loadSidebarPresets);
  const addRandomPreset = useGenerationParamsStore((s) => s.addRandomPreset);
  const rerollRandomPreset = useGenerationParamsStore((s) => s.rerollRandomPreset);
  const updateRandomPresetSettings = useGenerationParamsStore((s) => s.updateRandomPresetSettings);
  const sidebarArtistTags = useSidebarArtistTagsStore((s) => s.sidebarArtistTags);
  const addSidebarArtistTag = useSidebarArtistTagsStore((s) => s.addSidebarArtistTag);
  const removeSidebarArtistTag = useSidebarArtistTagsStore((s) => s.removeSidebarArtistTag);
  const updateSidebarArtistTagStrength = useSidebarArtistTagsStore((s) => s.updateSidebarArtistTagStrength);
  const saveSidebarArtistTags = useSidebarArtistTagsStore((s) => s.saveSidebarArtistTags);
  const loadSidebarArtistTags = useSidebarArtistTagsStore((s) => s.loadSidebarArtistTags);

  const [presets, setPresets] = useState<StylePresetDto[]>([]);
  const [vibes, setVibes] = useState<VibeDto[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [tweakPresetId, setTweakPresetId] = useState<string | null>(null);
  const [globalSettings, setGlobalSettings] = useState<RandomPresetSettings>(DEFAULT_RANDOM_PRESET_SETTINGS);
  const [globalSettingsOpen, setGlobalSettingsOpen] = useState(false);
  const [presetSettingsId, setPresetSettingsId] = useState<string | null>(null);

  const loadData = async () => {
    try { const [p, v] = await Promise.all([ipc.listStylePresets(), ipc.listVibes()]); setPresets(p); setVibes(v); } catch { /* silently fail */ }
  };

  const loadGlobalSettings = async () => {
    try { const settings = await ipc.getSettings(); const raw = settings[GLOBAL_SETTINGS_KEY]; if (raw) setGlobalSettings({ ...DEFAULT_RANDOM_PRESET_SETTINGS, ...JSON.parse(raw) }); } catch { /* use defaults */ }
  };

  const saveGlobalSettings = (s: RandomPresetSettings) => {
    setGlobalSettings(s);
    ipc.setSetting(GLOBAL_SETTINGS_KEY, JSON.stringify(s)).catch(() => {});
  };

  useEffect(() => {
    loadData();
    loadGlobalSettings();
  }, []);

  // Load saved sidebar presets when project opens
  useEffect(() => {
    if (currentProject) {
      loadSidebarPresets(currentProject.id);
      loadSidebarArtistTags(currentProject.id);
    }
  }, [currentProject, loadSidebarPresets, loadSidebarArtistTags]);

  // Auto-save when sidebarPresets change
  useEffect(() => {
    if (currentProject) {
      saveSidebarPresets(currentProject.id);
    }
  }, [sidebarPresets, currentProject, saveSidebarPresets]);

  // Auto-save when sidebarArtistTags change
  useEffect(() => {
    if (currentProject) {
      saveSidebarArtistTags(currentProject.id);
    }
  }, [sidebarArtistTags, currentProject, saveSidebarArtistTags]);

  const handleRemovePreset = (presetId: string) => {
    removeSidebarPreset(presetId);
  };

  const handleGenerateRandom = async (settingsOverride?: RandomPresetSettings) => {
    try {
      const allVibes = vibes.length > 0 ? vibes : await ipc.listVibes();
      const settings = settingsOverride ?? globalSettings;
      const folders = await loadAllVibeFolders();
      const preset = await generateRandomPreset(settings, allVibes, model, folders);
      addRandomPreset(preset);
    } catch (e) {
      if (String(e).includes("no_compatible_vibes")) {
        toast.error(t("style.noVibesAvailable"));
      }
    }
  };

  const handleReroll = async (presetId: string) => {
    const sidebar = sidebarPresets.find((p) => p.id === presetId);
    if (!sidebar) return;
    try {
      const allVibes = vibes.length > 0 ? vibes : await ipc.listVibes();
      const settings = sidebar.randomSettings ?? globalSettings;
      const folders = await loadAllVibeFolders();
      const newPreset = await generateRandomPreset(settings, allVibes, model, folders);
      rerollRandomPreset(presetId, {
        artistTags: newPreset.artistTags,
        selectedVibes: newPreset.selectedVibes,
      });
    } catch (e) {
      if (String(e).includes("no_compatible_vibes")) {
        toast.error(t("style.noVibesAvailable"));
      }
    }
  };

  // Resolve preset details for sidebar display
  const resolvedPresets = sidebarPresets
    .map((sp) => ({
      sidebar: sp,
      preset: sp.isRandom ? null : presets.find((p) => p.id === sp.id),
    }))
    .filter((r) => r.preset || r.sidebar.isRandom);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{t("style.title")}</p>
        <div className="flex items-center gap-0.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Dices className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleGenerateRandom()}>
                <Dices className="mr-2 h-3.5 w-3.5" />
                {t("style.randomGenerate")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGlobalSettingsOpen(true)}>
                <Settings className="mr-2 h-3.5 w-3.5" />
                {t("style.randomSettings")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setModalOpen(true)}>
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Direct artist tags */}
      <SidebarArtistTagInput
        artistTags={sidebarArtistTags}
        onAdd={addSidebarArtistTag}
        onRemove={removeSidebarArtistTag}
        onStrengthChange={updateSidebarArtistTagStrength}
      />

      {/* Sidebar presets with inline tweak panels */}
      {resolvedPresets.length > 0 && (
        <div className="space-y-1">
          {resolvedPresets.map(({ sidebar, preset }) => {
            const displayName = sidebar.isRandom ? (sidebar.name ?? t("style.randomPreset")) : preset!.name;
            const thumbnailPath = sidebar.isRandom ? null : preset!.thumbnailPath;

            return (
              <div key={sidebar.id} className="rounded-md border border-border p-2 space-y-1">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={sidebar.enabled}
                    onCheckedChange={() => toggleSidebarPreset(sidebar.id)}
                    aria-label={displayName}
                  />
                  {thumbnailPath ? (
                    <img
                      src={`asset://localhost/${thumbnailPath}`}
                      alt=""
                      className="h-8 w-8 rounded object-contain shrink-0 bg-muted"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                      {sidebar.isRandom ? (
                        <Dices className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  )}
                  <span className="text-xs truncate flex-1">{displayName}</span>
                  <Button
                    variant={tweakPresetId === sidebar.id ? "default" : "ghost"}
                    size="sm"
                    className="h-5 w-5 p-0 shrink-0"
                    onClick={() => setTweakPresetId((id) => (id === sidebar.id ? null : sidebar.id))}
                    title={t("style.tweak")}
                  >
                    <SlidersHorizontal className="h-3 w-3" />
                  </Button>
                  {sidebar.isRandom && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 shrink-0"
                        onClick={() => handleReroll(sidebar.id)}
                        title={t("style.randomize")}
                      >
                        <Dices className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 shrink-0"
                        onClick={() => setPresetSettingsId(sidebar.id)}
                        title={t("style.randomSettings")}
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 shrink-0"
                    onClick={() => handleRemovePreset(sidebar.id)}
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
                {tweakPresetId === sidebar.id && (
                  <PresetTweakPanel
                    presetId={sidebar.id}
                    preset={sidebar.isRandom ? null : preset!}
                    vibes={vibes}
                    onPresetsChanged={loadData}
                    isRandom={sidebar.isRandom}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      <StylePresetModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onPresetsChanged={loadData}
      />

      {/* Global random preset settings dialog */}
      <RandomPresetSettingsDialog
        open={globalSettingsOpen}
        onOpenChange={setGlobalSettingsOpen}
        settings={globalSettings}
        onSettingsChange={saveGlobalSettings}
        allVibes={vibes}
        currentModel={model}
      />

      {/* Per-preset random settings dialog */}
      {presetSettingsId && (() => {
        const sp = sidebarPresets.find((p) => p.id === presetSettingsId);
        if (!sp) return null;
        return (
          <RandomPresetSettingsDialog
            open={true}
            onOpenChange={(open) => { if (!open) setPresetSettingsId(null); }}
            settings={sp.randomSettings ?? globalSettings}
            onSettingsChange={(s) => updateRandomPresetSettings(presetSettingsId, s)}
            allVibes={vibes}
            currentModel={model}
          />
        );
      })()}
    </div>
  );
}
