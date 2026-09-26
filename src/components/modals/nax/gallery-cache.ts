import * as naxIpc from "@/lib/ipc-nax";
import type { NaxImageDto } from "@/types";

// Gallery listings are large (up to ~16k rows) and only change on sync, so
// keep them for the session, keyed by the sync time that produced them.
const cache = new Map<string, Promise<NaxImageDto[]>>();

export function listGalleryImagesCached(slug: string, syncedAt: string | null): Promise<NaxImageDto[]> {
  const suffix = `@${syncedAt ?? ""}`;
  // A newer sync makes every older listing stale.
  for (const k of cache.keys()) if (!k.endsWith(suffix)) cache.delete(k);
  const key = `${slug}${suffix}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = naxIpc.naxListGalleryImages(slug);
    hit.catch(() => cache.delete(key));
    cache.set(key, hit);
  }
  return hit;
}
