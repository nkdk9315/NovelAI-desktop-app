import { describe, expect, it } from "vitest";
import {
  addTagToPrompt, bestImageByTag, formatBytes, naxTagKey, naxVersionForModel, pickGallery,
  naxTagToEntry, promptHasTag, removeTagFromPrompt, seededShuffle, sortByFirstSeen,
} from "@/lib/nax";
import type { NaxGalleryDto, NaxImageDto } from "@/types";

const gallery = (slug: string, category: NaxGalleryDto["category"], modelVersion: string, title = slug): NaxGalleryDto => ({
  slug, category, modelVersion, title, description: null, imageCount: 1,
});
const image = (tag: string, modelVersion: string, firstSeenAt = ""): NaxImageDto => ({
  gallerySlug: `g-${modelVersion}`, modelVersion, tag, imageUrl: `u/${tag}/${modelVersion}`,
  upVotes: 0, downVotes: 0, score: 0, firstSeenAt, isNew: false,
});

describe("naxVersionForModel", () => {
  it("maps model families", () => {
    expect(naxVersionForModel("nai-diffusion-5-full")).toBe("v5");
    expect(naxVersionForModel("nai-diffusion-4-5-curated")).toBe("v4.5");
    expect(naxVersionForModel("nai-diffusion-4-full")).toBe("v4");
    expect(naxVersionForModel("nai-diffusion-3")).toBeNull();
  });
});

describe("naxTagKey", () => {
  it("normalizes case and underscores", () => {
    expect(naxTagKey(" Ei_(eiei_e1) ")).toBe("ei (eiei e1)");
  });
});

describe("pickGallery", () => {
  const gs = [
    gallery("artist-v5", "artist", "v5", "Artist Tags - Constrained Prompt"),
    gallery("artist-2-v5", "artist", "v5", "Artist Tags - Loose Prompt"),
    gallery("artist-v4.5", "artist", "v4.5", "Artist Tags - Constrained Prompt"),
    gallery("artist-2-v4.5", "artist", "v4.5", "Artist Tags - Loose Prompt"),
    gallery("artist-v4", "artist", "v4", "Artist Tags"),
    gallery("hair-v5", "hair", "v5"),
    gallery("hair-2-v5", "hair", "v5"),
    gallery("copyright-v4.5", "copyright", "v4.5"),
  ];
  it("defaults artists to the Loose Prompt gallery of the version", () => {
    expect(pickGallery(gs, "artist", "v5")?.slug).toBe("artist-2-v5");
    expect(pickGallery(gs, "artist", "v4.5")?.slug).toBe("artist-2-v4.5");
  });
  it("uses the only / first gallery when there is no preferred variant", () => {
    expect(pickGallery(gs, "artist", "v4")?.slug).toBe("artist-v4");
    expect(pickGallery(gs, "hair", "v5")?.slug).toBe("hair-v5");
  });
  it("falls back to the newest version of the category", () => {
    expect(pickGallery(gs, "copyright", "v5")?.slug).toBe("copyright-v4.5");
    expect(pickGallery(gs, "artist", null)?.slug).toBe("artist-2-v5");
    expect(pickGallery(gs, "face", "v5")).toBeNull();
  });
});

describe("bestImageByTag", () => {
  it("prefers the requested version, else the first seen", () => {
    const map = bestImageByTag([image("a", "v5"), image("A", "v4.5"), image("b", "v4")], "v4.5");
    expect(map.get("a")?.modelVersion).toBe("v4.5");
    expect(map.get("b")?.modelVersion).toBe("v4");
  });
});

describe("prompt tag helpers", () => {
  it("detects tags regardless of spelling", () => {
    expect(promptHasTag("1girl, hime_cut, smile", "Hime cut")).toBe(true);
    expect(promptHasTag("1girl, {hime cut}", "hime cut")).toBe(false);
  });
  it("appends without duplicating", () => {
    expect(addTagToPrompt("", "afro")).toBe("afro");
    expect(addTagToPrompt("1girl, ", "afro")).toBe("1girl, afro");
    expect(addTagToPrompt("1girl, afro", "afro")).toBe("1girl, afro");
  });
  it("removes every plain occurrence", () => {
    expect(removeTagFromPrompt("afro, 1girl, Afro", "afro")).toBe("1girl");
  });
});

describe("seededShuffle", () => {
  it("is deterministic per seed and keeps all items", () => {
    const items = Array.from({ length: 50 }, (_, i) => i);
    const a = seededShuffle(items, 42);
    expect(seededShuffle(items, 42)).toEqual(a);
    expect(seededShuffle(items, 43)).not.toEqual(a);
    expect([...a].sort((x, y) => x - y)).toEqual(items);
  });
});

describe("sortByFirstSeen", () => {
  it("puts the newest first and keeps ties (and missing images) in order", () => {
    const item = (tag: string, at: string | null) => ({ tag, image: at === null ? null : image(tag, "v5", at) });
    const sorted = sortByFirstSeen([
      item("a", "2026-09-01T00:00:00+00:00"),
      item("b", "2026-09-20T00:00:00+00:00"),
      item("c", "2026-09-01T00:00:00+00:00"),
      item("none", null),
    ]);
    expect(sorted.map((i) => i.tag)).toEqual(["b", "a", "c", "none"]);
  });
});

describe("formatBytes", () => {
  it("picks a readable unit", () => {
    expect(formatBytes(15_000)).toBe("15 KB");
    expect(formatBytes(500 * 1024 * 1024)).toBe("500.0 MB");
    expect(formatBytes(2 * 1024 ** 3)).toBe("2.00 GB");
  });
});

describe("naxTagToEntry", () => {
  it("prefixes artists and keeps other tags as-is", () => {
    expect(naxTagToEntry("wagashi (dagashiya)", "artist")).toEqual({ name: "wagashi (dagashiya)", tag: "artist:wagashi (dagashiya)" });
    expect(naxTagToEntry("hime cut", "hair")).toEqual({ name: "hime cut", tag: "hime cut" });
  });
});
