import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useAutocomplete } from "@/hooks/use-autocomplete";
import type { ArtistTag } from "@/types";

interface Props {
  artistTags: ArtistTag[];
  onArtistTagsChange: (tags: ArtistTag[]) => void;
}

export default function ArtistTagInput({ artistTags, onArtistTagsChange }: Props) {
  const { t } = useTranslation();
  const [tagInput, setTagInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const suggestionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { results: suggestions, search } = useAutocomplete(300, 1);
  const filteredSuggestions = suggestions.filter((s) => s.category === 1).slice(0, 8);

  const handleTagInputChange = (value: string) => {
    setTagInput(value);
    search(value);
    setShowSuggestions(value.trim().length > 0);
    setHighlightIndex(-1);
  };

  const handleAddTag = (tagName: string) => {
    const trimmed = tagName.trim();
    if (trimmed && !artistTags.some((t) => t.name === trimmed)) {
      onArtistTagsChange([...artistTags, { name: trimmed, strength: 0 }]);
    }
    setTagInput("");
    setShowSuggestions(false);
  };

  const handleRemoveTag = (index: number) => {
    onArtistTagsChange(artistTags.filter((_, i) => i !== index));
  };

  const handleTagStrength = (index: number, raw: number) => {
    const nearest = Math.round(raw * 2) / 2;
    const strength = Math.abs(raw - nearest) < 0.15 ? nearest : Math.round(raw * 100) / 100;
    onArtistTagsChange(artistTags.map((t, i) => (i === index ? { ...t, strength } : t)));
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{t("style.artist")}</Label>
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
          className="h-8 text-xs"
        />
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-md">
            {filteredSuggestions.map((tag, i) => (
              <button
                key={tag.name}
                ref={(el) => { suggestionRefs.current[i] = el; }}
                type="button"
                className={`w-full px-2 py-1 text-left text-xs ${i === highlightIndex ? "bg-accent" : "hover:bg-accent"}`}
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
        <div className="space-y-1.5 mt-2">
          {artistTags.map((tag, i) => (
            <div key={tag.name} className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {tag.name}
                <button type="button" onClick={() => handleRemoveTag(i)} className="ml-1">
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
              <Slider
                min={0} max={10} step={0.1}
                value={[tag.strength]}
                onValueChange={([v]) => handleTagStrength(i, v)}
                className="flex-1"
              />
              <span className="text-[10px] text-muted-foreground w-10 text-right">
                {tag.strength === 0 ? "—" : tag.strength.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
