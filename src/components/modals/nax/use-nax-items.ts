import { useEffect, useMemo, useRef, useState } from "react";
import { useNaxStore } from "@/stores/nax-store";
import { useNaxFavorites } from "@/hooks/use-nax-favorites";
import { listGalleryImagesCached } from "./gallery-cache";
import { bestImageByTag, naxCategoryOfSlug, naxTagKey, seededShuffle, sortByFirstSeen } from "@/lib/nax";
import type { NaxCategory, NaxGalleryDto } from "@/types";
import type { NaxFavoriteFilter, NaxSort } from "@/stores/nax-view-store";
import type { NaxGridItem } from "./NaxImageCard";

interface Options {
  /** Gallery to list; null = favorites tab. */
  gallery: NaxGalleryDto | null;
  favorites: boolean;
  /** Version whose image to prefer when favorites show all versions. */
  preferredVersion: string | null;
  favCategory: NaxFavoriteFilter<NaxCategory>;
  favVersion: NaxFavoriteFilter<string>;
  search: string;
  sort: NaxSort;
  seed: number;
}

/** Grid items for the explorer: a gallery's images, or the favorites. */
export function useNaxItems({
  gallery, favorites, preferredVersion, favCategory, favVersion, search, sort, seed,
}: Options) {
  const syncedAt = useNaxStore((s) => s.status?.syncedAt ?? null);
  const imagesByTag = useNaxStore((s) => s.imagesByTag);
  const lookupTags = useNaxStore((s) => s.lookupTags);
  const { favoriteArtists, favoriteTags } = useNaxFavorites();
  const [items, setItems] = useState<NaxGridItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const requestId = useRef(0);

  // Gallery images
  const slug = gallery?.slug ?? null;
  const category = gallery?.category ?? null;
  useEffect(() => {
    if (favorites || !slug || !category) { setItems([]); return; }
    const id = ++requestId.current;
    setLoading(true);
    setError(false);
    listGalleryImagesCached(slug, syncedAt)
      .then((images) => {
        if (id !== requestId.current) return;
        setItems(images.map((image) => ({ tag: image.tag, category, image })));
      })
      .catch(() => { if (id === requestId.current) { setItems([]); setError(true); } })
      .finally(() => { if (id === requestId.current) setLoading(false); });
  }, [favorites, slug, category, syncedAt]);

  // Favorites: artists (app-wide list) first, then other tags, newest first.
  const favoriteEntries = useMemo<{ tag: string; category: NaxCategory }[]>(() => [
    ...favoriteArtists.map((tag) => ({ tag, category: "artist" as const })),
    ...favoriteTags.map((f) => ({ tag: f.tag, category: f.category })),
  ], [favoriteArtists, favoriteTags]);

  const favoriteCounts = useMemo(() => {
    const counts: Partial<Record<NaxFavoriteFilter<NaxCategory>, number>> = { all: favoriteEntries.length };
    for (const f of favoriteEntries) counts[f.category] = (counts[f.category] ?? 0) + 1;
    return counts;
  }, [favoriteEntries]);

  useEffect(() => {
    if (!favorites || favoriteEntries.length === 0) return;
    setError(false);
    lookupTags(favoriteEntries.map((f) => f.tag)).catch(() => setError(true));
  }, [favorites, favoriteEntries, lookupTags]);

  const favoriteItems = useMemo<NaxGridItem[]>(() => {
    if (!favorites) return [];
    const out: NaxGridItem[] = [];
    for (const { tag, category: cat } of favoriteEntries) {
      if (favCategory !== "all" && cat !== favCategory) continue;
      const key = naxTagKey(tag);
      const looked = imagesByTag[key];
      const candidates = (looked ?? []).filter((img) => naxCategoryOfSlug(img.gallerySlug) === cat);
      if (favVersion === "all") {
        out.push({ tag, category: cat, image: bestImageByTag(candidates, preferredVersion).get(key) ?? null });
        continue;
      }
      const image = candidates.find((img) => img.modelVersion === favVersion);
      // A specific model only lists tags that have an image for it.
      if (image) out.push({ tag, category: cat, image });
    }
    return out;
  }, [favorites, favoriteEntries, favCategory, favVersion, imagesByTag, preferredVersion]);

  const visible = useMemo(() => {
    const source = favorites ? favoriteItems : items;
    const needle = naxTagKey(search);
    const filtered = needle ? source.filter((i) => naxTagKey(i.tag).includes(needle)) : source;
    switch (sort) {
      case "name": return [...filtered].sort((a, b) => a.tag.localeCompare(b.tag));
      case "random": return seededShuffle(filtered, seed);
      case "recent": return sortByFirstSeen(filtered);
      default:
        // Gallery lists arrive best-first; favorites need sorting.
        return favorites ? [...filtered].sort((a, b) => (b.image?.score ?? 0) - (a.image?.score ?? 0)) : filtered;
    }
  }, [favorites, favoriteItems, items, search, sort, seed]);

  const favoritesPending = favorites && favoriteEntries.some((f) => !(naxTagKey(f.tag) in imagesByTag));
  return {
    items: visible,
    loading: loading || (favoritesPending && !error),
    error,
    favoriteCounts,
    favoriteCount: favoriteEntries.length,
  };
}
