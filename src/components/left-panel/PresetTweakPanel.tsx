import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ImageIcon, Plus, Save, SaveAll, Search, X } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/toast-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { useArtistTagInput } from "@/hooks/use-artist-tag-input";
import type { PresetVibeRef, StylePresetDto, VibeDto } from "@/types";
import * as ipc from "@/lib/ipc";
import VibePickerModal from "@/components/modals/VibePickerModal";
import StylePresetEditorModal from "@/components/modals/StylePresetEditorModal";

interface PresetTweakPanelProps {
  presetId: string;
  preset: StylePresetDto | null;
  vibes: VibeDto[];
  onPresetsChanged: () => void;
  isRandom?: boolean;
}

export default function PresetTweakPanel({ presetId, preset, vibes, onPresetsChanged, isRandom }: PresetTweakPanelProps) {
  const { t } = useTranslation();
  const sidebarPreset = useGenerationParamsStore((s) => s.sidebarPresets.find((p) => p.id === presetId));
  const updatePresetArtistTags = useGenerationParamsStore((s) => s.updatePresetArtistTags);
  const updatePresetVibeStrength = useGenerationParamsStore((s) => s.updatePresetVibeStrength);
  const addPresetVibe = useGenerationParamsStore((s) => s.addPresetVibe);
  const removePresetVibe = useGenerationParamsStore((s) => s.removePresetVibe);
  const replaceWithSavedPreset = useGenerationParamsStore((s) => s.replaceWithSavedPreset);
  const model = useGenerationParamsStore((s) => s.model);

  const [vibePickerOpen, setVibePickerOpen] = useState(false);
  const [saveAsOpen, setSaveAsOpen] = useState(false);

  if (!sidebarPreset) return null;

  const { artistTags, selectedVibes } = sidebarPreset;

  const { tagInput, showSuggestions, highlightIndex, suggestionRefs, filteredSuggestions,
          handleInputChange, handleAdd, onKeyDown, onBlur } = useArtistTagInput((name) => {
    if (!artistTags.some((t) => t.name === name)) {
      updatePresetArtistTags(presetId, [...artistTags, { name, strength: 0 }]);
    }
  });

  const handleRemoveTag = (index: number) => {
    updatePresetArtistTags(presetId, artistTags.filter((_, i) => i !== index));
  };

  const handleTagStrength = (index: number, raw: number) => {
    const nearest = Math.round(raw * 2) / 2;
    const strength = Math.abs(raw - nearest) < 0.15 ? nearest : Math.round(raw * 100) / 100;
    updatePresetArtistTags(presetId, artistTags.map((t, i) => (i === index ? { ...t, strength } : t)));
  };

  const handleVibePickerConfirm = (ids: string[]) => {
    for (const id of ids) {
      addPresetVibe(presetId, id);
    }
  };

  const handleOverwrite = async () => {
    try {
      const vibeRefs: PresetVibeRef[] = selectedVibes
        .filter((v) => v.enabled)
        .map((v) => ({ vibeId: v.vibeId, strength: v.strength }));
      await ipc.updateStylePreset({
        id: presetId,
        artistTags,
        vibeRefs,
      });
      toast.success(t("style.saveSuccess"));
      onPresetsChanged();
    } catch (e) {
      toastError(String(e));
    }
  };

  const buildSaveAsPreset = (): StylePresetDto => {
    const base = preset ?? {
      id: "",
      name: sidebarPreset.name ?? "Random Preset",
      artistTags: [],
      vibeRefs: [],
      createdAt: new Date().toISOString(),
      thumbnailPath: null,
      isFavorite: false,
      model,
      folderId: null,
    };
    return {
      ...base,
      id: "",
      name: isRandom ? (sidebarPreset.name ?? "Random Preset") : `${base.name} (copy)`,
      artistTags,
      vibeRefs: selectedVibes.filter((v) => v.enabled).map((v) => ({ vibeId: v.vibeId, strength: v.strength })),
    };
  };

  return (
    <div className="space-y-2 pt-1 border-t border-border mt-1">
      {/* Artist tags */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-2 h-3 w-3 text-muted-foreground/60" />
          <input
            value={tagInput}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={onBlur}
            placeholder={t("style.artistPlaceholder")}
            className="h-6 w-full rounded-md border border-border bg-muted/40 pl-6 pr-2 text-[10px] outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-background"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </div>
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-50 mt-1 max-h-36 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-md">
            {filteredSuggestions.map((tag, i) => (
              <button
                key={tag.name}
                ref={(el) => { suggestionRefs.current[i] = el; }}
                type="button"
                className={`w-full px-2 py-0.5 text-left text-[10px] ${i === highlightIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleAdd(tag.name)}
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </div>
      {artistTags.length > 0 && (
        <div className="space-y-1">
          {artistTags.map((tag, i) => (
            <div key={tag.name} className="flex items-center gap-1">
              <Badge variant="secondary" className="text-[9px] shrink-0 h-5">
                {tag.name}
                <button type="button" onClick={() => handleRemoveTag(i)} className="ml-0.5">
                  <X className="h-2 w-2" />
                </button>
              </Badge>
              <Slider min={0} max={10} step={0.1} value={[tag.strength]} onValueChange={([v]) => handleTagStrength(i, v)} className="flex-1" />
              <span className="text-[9px] text-muted-foreground w-7 text-right">{tag.strength === 0 ? "—" : tag.strength.toFixed(1)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Vibes */}
      {selectedVibes.filter((v) => v.enabled).length > 0 && (
        <div className="space-y-1">
          {selectedVibes.filter((v) => v.enabled).map((sv) => {
            const vibe = vibes.find((v) => v.id === sv.vibeId);
            if (!vibe) return null;
            return (
              <div key={sv.vibeId} className="flex items-center gap-1">
                {vibe.thumbnailPath ? (
                  <img src={`asset://localhost/${vibe.thumbnailPath}`} alt="" className="h-5 w-5 rounded object-contain bg-muted shrink-0" />
                ) : (
                  <div className="h-5 w-5 rounded bg-muted flex items-center justify-center shrink-0">
                    <ImageIcon className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}
                <Slider min={0} max={1} step={0.01} value={[sv.strength]} onValueChange={([v]) => updatePresetVibeStrength(presetId, sv.vibeId, v)} className="flex-1" />
                <span className="text-[9px] text-muted-foreground w-7 text-right">{sv.strength.toFixed(2)}</span>
                <button type="button" onClick={() => removePresetVibe(presetId, sv.vibeId)} className="shrink-0">
                  <X className="h-2.5 w-2.5 text-muted-foreground" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <Button variant="ghost" size="sm" className="h-5 text-[9px] w-full" onClick={() => setVibePickerOpen(true)}>
        <Plus className="mr-0.5 h-2.5 w-2.5" />
        {t("style.addVibe")}
      </Button>

      {/* Save actions */}
      <div className="flex gap-1">
        {!isRandom && (
          <Button variant="outline" size="sm" className="h-6 text-[9px] flex-1" onClick={handleOverwrite}>
            <Save className="mr-0.5 h-2.5 w-2.5" />
            {t("style.overwrite")}
          </Button>
        )}
        <Button variant="outline" size="sm" className="h-6 text-[9px] flex-1" onClick={() => setSaveAsOpen(true)}>
          {isRandom ? <Save className="mr-0.5 h-2.5 w-2.5" /> : <SaveAll className="mr-0.5 h-2.5 w-2.5" />}
          {isRandom ? t("common.save") : t("style.saveAs")}
        </Button>
      </div>

      <VibePickerModal
        open={vibePickerOpen}
        onOpenChange={setVibePickerOpen}
        selectedVibeIds={selectedVibes.filter((v) => v.enabled).map((v) => v.vibeId)}
        modelFilter={model}
        maxVibes={4}
        onConfirm={handleVibePickerConfirm}
      />

      {saveAsOpen && (
        <StylePresetEditorModal
          open={true}
          onOpenChange={(o) => { if (!o) { setSaveAsOpen(false); onPresetsChanged(); } }}
          preset={buildSaveAsPreset()}
          onSaved={isRandom ? (saved) => replaceWithSavedPreset(presetId, saved, vibes) : undefined}
        />
      )}
    </div>
  );
}
