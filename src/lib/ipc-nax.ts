import { invoke } from "@tauri-apps/api/core";
import type { NaxFavoriteTagDto, NaxGalleryDto, NaxImageDto, NaxStatusDto, NaxThumbCacheInfoDto } from "@/types";

// ---- nax.moe explorer (migration 027) ----

/** Refresh the local catalog if it is older than a day (always with `force`). */
export function naxSync(force = false): Promise<NaxStatusDto> {
  return invoke("nax_sync", { force });
}

export function naxGetStatus(): Promise<NaxStatusDto> {
  return invoke("nax_get_status");
}

export function naxListGalleries(): Promise<NaxGalleryDto[]> {
  return invoke("nax_list_galleries");
}

/** Every image of one gallery, best-voted first. */
export function naxListGalleryImages(slug: string): Promise<NaxImageDto[]> {
  return invoke("nax_list_gallery_images", { slug });
}

/** Images of the given tags across all galleries (`_`/space and case-insensitive). */
export function naxFindTags(tags: string[]): Promise<NaxImageDto[]> {
  return invoke("nax_find_tags", { tags });
}

export function naxListFavoriteTags(): Promise<NaxFavoriteTagDto[]> {
  return invoke("nax_list_favorite_tags");
}

export function naxToggleFavoriteTag(tag: string, category: string): Promise<boolean> {
  return invoke("nax_toggle_favorite_tag", { tag, category });
}

// ---- Thumbnail cache (served via the naxthumb:// protocol) ----

export function naxThumbCacheInfo(): Promise<NaxThumbCacheInfoDto> {
  return invoke("nax_thumb_cache_info");
}

export function naxSetThumbCacheLimit(limitMb: number): Promise<NaxThumbCacheInfoDto> {
  return invoke("nax_set_thumb_cache_limit", { limitMb });
}

export function naxClearThumbCache(): Promise<NaxThumbCacheInfoDto> {
  return invoke("nax_clear_thumb_cache");
}
