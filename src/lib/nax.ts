import { convertFileSrc } from "@tauri-apps/api/core";
import type { NaxCategory, NaxGalleryDto, NaxImageDto } from "@/types";

export const NAX_SITE_URL = "https://nax.moe";

export const NAX_VERSIONS = ["v5", "v4.5", "v4"] as const;

/** Browsable categories, in tab order. */
export const NAX_CATEGORIES: NaxCategory[] = ["artist", "character", "copyright", "face", "hair"];

/** nax.moe gallery version for a NovelAI model id; null when nax has none. */
export function naxVersionForModel(model: string): string | null {
  if (model.startsWith("nai-diffusion-5")) return "v5";
  if (model.startsWith("nai-diffusion-4-5")) return "v4.5";
  if (model.startsWith("nai-diffusion-4")) return "v4";
  return null;
}

/** Lookup form of a tag, matching the Rust side: lowercase, `_` as space. */
export function naxTagKey(tag: string): string {
  return tag.trim().toLowerCase().replace(/_/g, " ");
}

/**
 * Default variant where a version has several galleries of a category:
 * artists default to "Loose Prompt" (few other traits, so the style shows).
 */
const PREFERRED_VARIANT: Partial<Record<NaxCategory, (g: NaxGalleryDto) => boolean>> = {
  artist: (g) => /loose/i.test(g.title),
};

/**
 * Gallery to show for a category and version. Falls back to the newest
 * version that has the category (e.g. no copyright gallery for v5 yet).
 * The API lists galleries newest-first; within a version the category's
 * preferred variant wins, else the first listed.
 */
export function pickGallery(
  galleries: NaxGalleryDto[],
  category: NaxCategory,
  version: string | null,
): NaxGalleryDto | null {
  const inCategory = galleries.filter((g) => g.category === category);
  const inVersion = inCategory.filter((g) => g.modelVersion === version);
  const candidates = inVersion.length > 0 ? inVersion : inCategory.filter((g) => g.modelVersion === inCategory[0]?.modelVersion);
  const preferred = PREFERRED_VARIANT[category];
  return (preferred && candidates.find(preferred)) ?? candidates[0] ?? null;
}

/**
 * For each tag key, the image to show: the preferred version's image if any,
 * else the first one (galleries are ordered newest-first).
 */
export function bestImageByTag(images: NaxImageDto[], version: string | null): Map<string, NaxImageDto> {
  const out = new Map<string, NaxImageDto>();
  for (const img of images) {
    const key = naxTagKey(img.tag);
    const current = out.get(key);
    if (!current || (current.modelVersion !== version && img.modelVersion === version)) out.set(key, img);
  }
  return out;
}

function splitPrompt(prompt: string): string[] {
  return prompt.split(",").map((p) => p.trim()).filter(Boolean);
}

/** Whether a comma-separated prompt contains the tag as a plain entry. */
export function promptHasTag(prompt: string, tag: string): boolean {
  const key = naxTagKey(tag);
  return splitPrompt(prompt).some((p) => naxTagKey(p) === key);
}

export function addTagToPrompt(prompt: string, tag: string): string {
  if (promptHasTag(prompt, tag)) return prompt;
  const base = prompt.trimEnd().replace(/,$/, "");
  return base.trim() ? `${base}, ${tag}` : tag;
}

export function removeTagFromPrompt(prompt: string, tag: string): string {
  const key = naxTagKey(tag);
  return splitPrompt(prompt).filter((p) => naxTagKey(p) !== key).join(", ");
}

/** Fisher–Yates with a seeded PRNG (mulberry32), so a shuffle is stable across re-renders. */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Gallery category from its slug; mirrors `nax_catalog::category_for` in Rust. */
export function naxCategoryOfSlug(slug: string): NaxCategory {
  return NAX_CATEGORIES.find((c) => slug.includes(c)) ?? "other";
}

/** nax.moe's own page for a tag in a gallery. */
export function naxGalleryPageUrl(slug: string, tag: string): string {
  return `${NAX_SITE_URL}/?gallery=${encodeURIComponent(slug)}&search=${encodeURIComponent(tag)}`;
}

/**
 * Small cached copy of a CDN image (360 px WebP), served by the Rust
 * `naxthumb` protocol. Use the original `imageUrl` only for full-size views.
 */
export function naxThumbUrl(imageUrl: string): string {
  return convertFileSrc(imageUrl, "naxthumb");
}

/** Newest first by when the app first saw each image; ties keep their order. */
export function sortByFirstSeen<T extends { image: NaxImageDto | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const x = a.image?.firstSeenAt ?? "";
    const y = b.image?.firstSeenAt ?? "";
    return x === y ? 0 : x < y ? 1 : -1;
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/**
 * Prompt group entry for a nax tag. Artists need the `artist:` prefix to be
 * read as a style in a prompt; everything else is the plain tag.
 */
export function naxTagToEntry(tag: string, category: NaxCategory): { name: string; tag: string } {
  return { name: tag, tag: category === "artist" ? `artist:${tag}` : tag };
}
