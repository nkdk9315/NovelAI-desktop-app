import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Settings2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { useAutocomplete } from "@/hooks/use-autocomplete";
import type { StylePresetDto, VibeDto } from "@/types";
import * as ipc from "@/lib/ipc";
import StylePresetModal from "@/components/modals/StylePresetModal";

export default function ArtistStyleSection() {
  const { t } = useTranslation();
  const artistTags = useGenerationParamsStore((s) => s.artistTags);
  const setArtistTags = useGenerationParamsStore((s) => s.setArtistTags);
  const selectedStylePresetId = useGenerationParamsStore((s) => s.selectedStylePresetId);
  const applyStylePreset = useGenerationParamsStore((s) => s.applyStylePreset);
  const clearStylePreset = useGenerationParamsStore((s) => s.clearStylePreset);

  const [presets, setPresets] = useState<StylePresetDto[]>([]);
  const [vibes, setVibes] = useState<VibeDto[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { results: suggestions, search } = useAutocomplete();

  const loadData = async () => {
    try {
      const [p, v] = await Promise.all([ipc.listStylePresets(), ipc.listVibes()]);
      setPresets(p);
      setVibes(v);
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTagInputChange = (value: string) => {
    setTagInput(value);
    search(value);
    setShowSuggestions(value.trim().length > 0);
  };

  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !artistTags.includes(trimmed)) {
      setArtistTags([...artistTags, trimmed]);
    }
    setTagInput("");
    setShowSuggestions(false);
  };

  const handleRemoveTag = (index: number) => {
    setArtistTags(artistTags.filter((_, i) => i !== index));
  };

  const handlePresetChange = (presetId: string) => {
    if (presetId === "__none__") {
      clearStylePreset();
      return;
    }
    const preset = presets.find((p) => p.id === presetId);
    if (preset) {
      applyStylePreset(preset, vibes);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{t("style.title")}</p>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setModalOpen(true)}>
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Artist tag input */}
      <div className="relative">
        <Input
          value={tagInput}
          onChange={(e) => handleTagInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddTag(tagInput);
            }
          }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={t("style.artistPlaceholder")}
          className="h-7 text-xs"
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
            {suggestions
              .filter((s) => s.category === 1)
              .slice(0, 8)
              .map((tag) => (
                <button
                  key={tag.name}
                  type="button"
                  className="w-full px-2 py-1 text-left text-xs hover:bg-accent"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleAddTag(tag.name)}
                >
                  {tag.name}
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Artist tag badges */}
      {artistTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {artistTags.map((tag, i) => (
            <Badge key={tag} variant="secondary" className="text-[10px] gap-0.5 pr-1">
              {tag}
              <button type="button" onClick={() => handleRemoveTag(i)} className="ml-0.5">
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Style preset selector */}
      <Select value={selectedStylePresetId ?? "__none__"} onValueChange={handlePresetChange}>
        <SelectTrigger className="h-7 text-xs">
          <SelectValue placeholder={t("style.selectPreset")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">{t("style.noPreset")}</SelectItem>
          {presets.map((preset) => (
            <SelectItem key={preset.id} value={preset.id}>
              {preset.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <StylePresetModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onPresetsChanged={loadData}
      />
    </div>
  );
}
