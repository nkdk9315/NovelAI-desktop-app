import { describe, it, expect } from "vitest";
import { DEFAULT_PREFS, parsePrefs, prefsFromSelection, selectionFromPrefs } from "@/lib/metadata-import-prefs";
import { parseMetadata } from "@/lib/nai-metadata";

const meta = parseMetadata({
  source: "NovelAI Diffusion V4.5 4BDE2A90", software: null, description: null,
  comment: { prompt: "artist:a, artist:b, 1girl", uc: "lowres", seed: 42, reference_image_multiple: ["ENC"] },
});

describe("metadata import prefs", () => {
  it("defaults: settings / seed / with-image off, artists appended", () => {
    expect(DEFAULT_PREFS).toMatchObject({ settings: false, seed: false, withImage: false, artistMode: "append" });
    expect(parsePrefs(undefined)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs("not json")).toEqual(DEFAULT_PREFS);
  });

  it("merges stored values and ignores malformed ones", () => {
    const p = parsePrefs(JSON.stringify({ seed: true, artistMode: "replace", prompt: "yes", characterMode: "weird" }));
    expect(p.seed).toBe(true);
    expect(p.artistMode).toBe("replace");
    expect(p.prompt).toBe(true);
    expect(p.characterMode).toBe(DEFAULT_PREFS.characterMode);
  });

  it("builds the checklist from prefs", () => {
    const sel = selectionFromPrefs(meta, { ...DEFAULT_PREFS, seed: true });
    expect(sel.artistNames).toEqual(["a", "b"]);
    expect(sel.seed).toBe(true);
    expect(sel.vibes).toBe(true);
    expect(selectionFromPrefs(meta, { ...DEFAULT_PREFS, artists: false }).artistNames).toEqual([]);
  });

  it("remembers changes but keeps rows the image does not have", () => {
    const noChars = { ...DEFAULT_PREFS, characters: false };
    const sel = { ...selectionFromPrefs(meta, noChars), prompt: false, characters: true };
    const next = prefsFromSelection(meta, sel, noChars, true);
    expect(next.prompt).toBe(false);
    expect(next.withImage).toBe(true);
    // This image has no characters, so the characters preference is unchanged
    expect(next.characters).toBe(false);
  });
});
