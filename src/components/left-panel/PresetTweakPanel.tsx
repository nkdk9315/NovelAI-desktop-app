import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ImageIcon, Plus, Save, SaveAll, X } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/toast-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { useAutocomplete } from "@/hooks/use-autocomplete";
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

  const [tagInput, setTagInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const suggestionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { results: suggestions, search } = useAutocomplete(300, 1);
  const filteredSuggestions = suggestions.filter((s) => s.csvCategory === 1).slice(0, 8);

  const [vibePickerOpen, setVibePickerOpen] = useState(false);
  const [saveAsOpen, setSaveAsOpen] = useState(false);

  if (!sidebarPreset) return null;

  const { artistTags, selectedVibes } = sidebarPreset;

  const handleTagInputChange = (value: string) => {
    setTagInput(value);
    search(value);
    setShowSuggestions(value.trim().length > 0);
    setHighlightIndex(-1);
  };

  const handleAddTag = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !artistTags.some((t) => t.name === trimmed)) {
      updatePresetArtistTags(presetId, [...artistTags, { name: trimmed, strength: 0 }]);
    }
    setTagInput("");
    setShowSuggestions(false);
  };

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
        <Input
          value={tagInput}
          onChange={(e) => handleTagInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlightIndex((prev) => {
                const next = Math.min(prev + 1, filteredSuggestions.length - 1);
                suggestionRefs.current[next]?.scrollIntoView({ block: "nearest" });
                return next;
              });
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlightIndex((prev) => {
                const next = Math.max(prev - 1, -1);
                if (next >= 0) suggestionRefs.current[next]?.scrollIntoView({ block: "nearest" });
                return next;
              });
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (highlightIndex >= 0 && highlightIndex < filteredSuggestions.length) {
                handleAddTag(filteredSuggestions[highlightIndex].name);
              } else {
                handleAddTag(tagInput);
              }
            } else if (e.key === "Escape") {
              setShowSuggestions(false);
            }
          }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={t("style.artistPlaceholder")}
          className="h-6 text-[10px]"
        />
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-50 mt-1 max-h-36 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-md">
            {filteredSuggestions.map((tag, i) => (
              <button
                key={tag.name}
                ref={(el) => { suggestionRefs.current[i] = el; }}
                type="button"
                className={`w-full px-2 py-0.5 text-left text-[10px] ${i === highlightIndex ? "bg-accent" : "hover:bg-accent"}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleAddTag(tag.name)}
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
