import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Check, Plus, Star, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSidebarArtistTagsStore } from "@/stores/sidebar-artist-tags-store";

interface Props {
  /** Names already in the sidebar (shown as added). */
  activeNames: string[];
  onAdd: (name: string) => void;
  /** Remove from the sidebar only — the favorite itself stays. */
  onRemove: (name: string) => void;
}

/** Star button next to the artist search: pick from saved favorite artists. */
export default function ArtistFavoritesPopover({ activeNames, onAdd, onRemove }: Props) {
  const { t } = useTranslation();
  const favorites = useSidebarArtistTagsStore((s) => s.favoriteArtists);
  const loadFavorites = useSidebarArtistTagsStore((s) => s.loadFavoriteArtists);
  const toggleFavorite = useSidebarArtistTagsStore((s) => s.toggleFavoriteArtist);

  useEffect(() => { loadFavorites(); }, [loadFavorites]);

  const addAll = () => favorites.forEach((n) => { if (!activeNames.includes(n)) onAdd(n); });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={t("style.favorites")}
          aria-label={t("style.favorites")}
          className="flex h-6 shrink-0 items-center gap-0.5 rounded-md border border-border px-1.5 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Star className={`h-3 w-3 ${favorites.length > 0 ? "fill-primary text-primary" : ""}`} />
          {favorites.length > 0 && <span className="tabular">{favorites.length}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 p-2">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-[11px] font-medium">{t("style.favorites")}</p>
          {favorites.length > 1 && (
            <button type="button" onClick={addAll} className="text-[10px] text-primary hover:underline">
              {t("style.favoritesAddAll")}
            </button>
          )}
        </div>
        {favorites.length === 0 ? (
          <p className="text-[10px] leading-relaxed text-muted-foreground">{t("style.favoritesEmpty")}</p>
        ) : (
          <ul className="max-h-60 space-y-0.5 overflow-y-auto">
            {favorites.map((name) => {
              const added = activeNames.includes(name);
              return (
                <li key={name} className="group flex items-center gap-1 rounded px-1 py-0.5 hover:bg-accent">
                  <button
                    type="button"
                    title={added ? t("style.favoriteUnapply") : t("style.favoriteApply")}
                    aria-pressed={added}
                    onClick={() => (added ? onRemove(name) : onAdd(name))}
                    className={`flex min-w-0 flex-1 items-center gap-1 text-left text-[11px] ${added ? "text-primary" : ""}`}
                  >
                    {added ? <Check className="h-3 w-3 shrink-0" /> : <Plus className="h-3 w-3 shrink-0" />}
                    <span className="truncate">{name}</span>
                  </button>
                  <button
                    type="button"
                    title={t("style.favoriteRemove")}
                    onClick={() => toggleFavorite(name)}
                    className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
