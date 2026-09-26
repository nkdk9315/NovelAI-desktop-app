import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Scale, Search, Star, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useArtistTagInput } from "@/hooks/use-artist-tag-input";
import { useSidebarArtistTagsStore } from "@/stores/sidebar-artist-tags-store";
import { isArtistTagOn } from "@/lib/artist-tag";
import ArtistFavoritesPopover from "./ArtistFavoritesPopover";
import type { ArtistTag } from "@/types";

interface Props {
  artistTags: ArtistTag[];
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
  onStrengthChange: (name: string, strength: number) => void;
  /** Rescale all strengths so they sum to 1. */
  onBalance: () => void;
  onToggle: (name: string) => void;
}

export default function SidebarArtistTagInput({ artistTags, onAdd, onRemove, onStrengthChange, onBalance, onToggle }: Props) {
  const { t } = useTranslation();
  const enabledTags = artistTags.filter(isArtistTagOn);
  const strengthTotal = enabledTags.reduce((sum, tag) => sum + tag.strength, 0);
  const isBalanced = Math.abs(strengthTotal - 1) < 0.005;
  const favoriteArtists = useSidebarArtistTagsStore((s) => s.favoriteArtists);
  const toggleFavoriteArtist = useSidebarArtistTagsStore((s) => s.toggleFavoriteArtist);
  const { tagInput, showSuggestions, highlightIndex, suggestionRefs,
          filteredSuggestions, handleInputChange, handleAdd, onKeyDown, onBlur } = useArtistTagInput(onAdd);

  return (
    <div className="space-y-1">
      {/* Autocomplete input + favorites */}
      <div className="flex items-start gap-1">
        <div className="relative flex-1">
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
        <ArtistFavoritesPopover activeNames={enabledTags.map((a) => a.name)} onAdd={onAdd} onRemove={onRemove} />
      </div>

      {/* Tag list */}
      {artistTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {artistTags.map((tag) => (
            <ArtistTagChip
              key={tag.name}
              tag={tag}
              onRemove={() => onRemove(tag.name)}
              onToggle={() => onToggle(tag.name)}
              toggleLabel={t("style.artistToggle")}
              onStrengthChange={(s) => onStrengthChange(tag.name, s)}
              strengthLabel={t("style.directTagStrength")}
              editHint={t("style.strengthEditHint")}
              isFavorite={favoriteArtists.includes(tag.name)}
              onToggleFavorite={() => toggleFavoriteArtist(tag.name)}
              favoriteLabel={t("style.favoriteToggle")}
            />
          ))}
        </div>
      )}

      {enabledTags.length >= 2 && (
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="tabular">
            {t("style.strengthTotal", { total: strengthTotal.toFixed(2) })}
          </span>
          <button
            type="button"
            onClick={onBalance}
            disabled={isBalanced}
            title={t("style.balanceHint")}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            <Scale className="h-3 w-3" />
            {t("style.balance")}
          </button>
        </div>
      )}
    </div>
  );
}

const STRENGTH_MIN = 0.01;
const STRENGTH_MAX = 10;
const SLIDER_MAX = 3;

function clampStrength(v: number): number {
  const rounded = Math.round(v * 100) / 100;
  return Math.min(STRENGTH_MAX, Math.max(STRENGTH_MIN, rounded));
}

interface ChipProps {
  tag: ArtistTag;
  onRemove: () => void;
  onToggle: () => void;
  toggleLabel: string;
  onStrengthChange: (strength: number) => void;
  strengthLabel: string;
  editHint: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  favoriteLabel: string;
}

function ArtistTagChip({ tag, onRemove, onToggle, toggleLabel, onStrengthChange, strengthLabel, editHint, isFavorite, onToggleFavorite, favoriteLabel }: ChipProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const on = isArtistTagOn(tag);

  const commit = () => {
    if (draft === null) return;
    const parsed = Number(draft);
    if (draft.trim() !== "" && Number.isFinite(parsed)) onStrengthChange(clampStrength(parsed));
    setDraft(null);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className={`flex items-center gap-0.5 rounded border py-0.5 pl-1 pr-1 text-[10px] cursor-default select-none ${
          on ? "border-border bg-muted/50" : "border-dashed border-border bg-transparent text-muted-foreground"
        }`}>
          <button
            type="button"
            title={favoriteLabel}
            aria-pressed={isFavorite}
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            className="shrink-0 text-muted-foreground hover:text-primary"
          >
            <Star className={`h-2.5 w-2.5 ${isFavorite ? "fill-primary text-primary" : ""}`} />
          </button>
          <button
            type="button"
            title={toggleLabel}
            aria-pressed={on}
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className={`max-w-[96px] truncate text-left hover:text-foreground ${on ? "" : "line-through opacity-70"}`}
          >
            {tag.name}
          </button>
          {draft !== null ? (
            <input
              ref={(el) => el?.focus()}
              type="number"
              inputMode="decimal"
              step={0.01}
              min={STRENGTH_MIN}
              max={STRENGTH_MAX}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); commit(); }
                else if (e.key === "Escape") { e.preventDefault(); setDraft(null); }
              }}
              onFocus={(e) => e.currentTarget.select()}
              className="ml-0.5 h-4 w-11 rounded-sm border border-primary/60 bg-background px-0.5 text-right text-[10px] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            />
          ) : (
            <button
              type="button"
              title={editHint}
              onClick={(e) => { e.stopPropagation(); setDraft(tag.strength.toFixed(2)); }}
              className="ml-0.5 shrink-0 rounded-sm px-0.5 text-[9px] tabular text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {tag.strength.toFixed(2)}
            </button>
          )}
          <button
            type="button"
            className="ml-0.5 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48 p-2 space-y-1.5">
        <p className="text-[10px] text-muted-foreground">
          {strengthLabel}: <span className="text-foreground font-medium tabular">{tag.strength.toFixed(2)}</span>
        </p>
        <Slider
          min={STRENGTH_MIN}
          max={Math.max(SLIDER_MAX, tag.strength)}
          step={0.01}
          value={[tag.strength]}
          onValueChange={([v]) => onStrengthChange(clampStrength(v))}
        />
      </ContextMenuContent>
    </ContextMenu>
  );
}
