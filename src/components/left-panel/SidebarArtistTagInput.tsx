import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useArtistTagInput } from "@/hooks/use-artist-tag-input";
import type { ArtistTag } from "@/types";

interface Props {
  artistTags: ArtistTag[];
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
  onStrengthChange: (name: string, strength: number) => void;
}

export default function SidebarArtistTagInput({ artistTags, onAdd, onRemove, onStrengthChange }: Props) {
  const { t } = useTranslation();
  const { tagInput, showSuggestions, highlightIndex, suggestionRefs,
          filteredSuggestions, handleInputChange, handleAdd, onKeyDown, onBlur } = useArtistTagInput(onAdd);

  return (
    <div className="space-y-1">
      {/* Autocomplete input */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-2 h-3 w-3 text-muted-foreground/60" />
          <input
            value={tagInput}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={onBlur}
            placeholder={t("style.directTagPlaceholder")}
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

      {/* Tag list */}
      {artistTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {artistTags.map((tag) => (
            <ArtistTagChip
              key={tag.name}
              tag={tag}
              onRemove={() => onRemove(tag.name)}
              onStrengthChange={(s) => onStrengthChange(tag.name, s)}
              strengthLabel={t("style.directTagStrength")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ChipProps {
  tag: ArtistTag;
  onRemove: () => void;
  onStrengthChange: (strength: number) => void;
  strengthLabel: string;
}

function ArtistTagChip({ tag, onRemove, onStrengthChange, strengthLabel }: ChipProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="flex items-center gap-0.5 rounded border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] cursor-default select-none">
          <span className="max-w-[80px] truncate">{tag.name}</span>
          <span className="text-[9px] text-muted-foreground ml-0.5 shrink-0">
            {tag.strength.toFixed(1)}
          </span>
          <button
            type="button"
            className="ml-0.5 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
          >
            <X className="h-2 w-2" />
          </button>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48 p-2 space-y-1.5">
        <p className="text-[10px] text-muted-foreground">
          {strengthLabel}: <span className="text-foreground font-medium">{tag.strength.toFixed(1)}</span>
        </p>
        <Slider
          min={1}
          max={10}
          step={0.1}
          value={[tag.strength]}
          onValueChange={([v]) => onStrengthChange(Math.round(v * 10) / 10)}
        />
      </ContextMenuContent>
    </ContextMenu>
  );
}
