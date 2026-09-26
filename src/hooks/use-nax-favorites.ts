import { useMemo } from "react";
import { useNaxStore } from "@/stores/nax-store";
import { useSidebarArtistTagsStore } from "@/stores/sidebar-artist-tags-store";
import { naxTagKey } from "@/lib/nax";
import type { NaxCategory } from "@/types";

/** Favorite state for nax tags: artists share the sidebar's favorite list. */
export function useNaxFavorites() {
  const favoriteArtists = useSidebarArtistTagsStore((s) => s.favoriteArtists);
  const favoriteTags = useNaxStore((s) => s.favoriteTags);
  const toggleFavorite = useNaxStore((s) => s.toggleFavorite);

  const { artistKeys, tagKeys } = useMemo(() => ({
    artistKeys: new Set(favoriteArtists.map(naxTagKey)),
    tagKeys: new Set(favoriteTags.map((f) => naxTagKey(f.tag))),
  }), [favoriteArtists, favoriteTags]);

  const isFavorite = (tag: string, category: NaxCategory) =>
    (category === "artist" ? artistKeys : tagKeys).has(naxTagKey(tag));

  return { isFavorite, toggleFavorite, favoriteArtists, favoriteTags };
}
