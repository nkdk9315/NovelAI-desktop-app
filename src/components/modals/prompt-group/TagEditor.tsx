import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useAutocomplete } from "@/hooks/use-autocomplete";
import type { TagInput } from "@/types";

interface TagEditorProps {
  tags: TagInput[];
  onTagsChange: (tags: TagInput[]) => void;
}

export default function TagEditor({ tags, onTagsChange }: TagEditorProps) {
  const { t } = useTranslation();
  const [tagInput, setTagInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const suggestionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { results: suggestions, search } = useAutocomplete(300);
  const filtered = suggestions.slice(0, 8);

  const handleInputChange = (value: string) => {
    setTagInput(value);
    search(value);
    setShowSuggestions(value.trim().length > 0);
    setHighlightIndex(-1);
  };

  const handleAdd = (tagName: string) => {
    const trimmed = tagName.trim();
    if (trimmed && !tags.some((t) => t.tag === trimmed)) {
      onTagsChange([...tags, { tag: trimmed, defaultStrength: 0 }]);
    }
    setTagInput("");
    setShowSuggestions(false);
  };

  const handleRemove = (index: number) => {
    onTagsChange(tags.filter((_, i) => i !== index));
  };

  const handleStrength = (index: number, strength: number) => {
    onTagsChange(tags.map((t, i) => (i === index ? { ...t, defaultStrength: strength } : t)));
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{t("promptGroup.tags")}</Label>

      {/* Autocomplete input */}
      <div className="relative">
        <Input
          value={tagInput}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlightIndex((prev) => {
                const next = Math.min(prev + 1, filtered.length - 1);
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
              if (highlightIndex >= 0 && highlightIndex < filtered.length) {
                handleAdd(filtered[highlightIndex].name);
              } else {
                handleAdd(tagInput);
              }
            } else if (e.key === "Escape") {
              setShowSuggestions(false);
            }
          }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={t("promptGroup.tagPlaceholder")}
          className="h-8 text-xs"
        />
        {showSuggestions && filtered.length > 0 && (
          <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-md">
            {filtered.map((s, i) => (
              <button
                key={s.name}
                ref={(el) => { suggestionRefs.current[i] = el; }}
                type="button"
                className={`w-full px-2 py-1 text-left text-xs ${i === highlightIndex ? "bg-accent" : "hover:bg-accent"}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleAdd(s.name)}
              >
                <span>{s.name}</span>
                <span className="ml-2 text-muted-foreground">{s.postCount.toLocaleString()}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tag list with strength */}
      {tags.length > 0 && (
        <div className="space-y-1.5 mt-2">
          {tags.map((tag, i) => (
            <div key={tag.tag} className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {tag.tag}
                <button type="button" onClick={() => handleRemove(i)} className="ml-1">
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
              <Slider
                min={-10}
                max={10}
                step={1}
                value={[tag.defaultStrength ?? 0]}
                onValueChange={([v]) => handleStrength(i, v)}
                className="flex-1"
              />
              <span className="text-[10px] text-muted-foreground w-6 text-right">
                {tag.defaultStrength ?? 0}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
