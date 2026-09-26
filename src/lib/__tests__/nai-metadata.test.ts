import { describe, it, expect } from "vitest";
import {
  isImageBase64, modelFromSource, parseMetadata, promptWithoutArtists, splitNegative, splitQuality, vibeModelKey,
} from "@/lib/nai-metadata";
import { NEGATIVE_PRESETS, QUALITY_TAGS } from "@/lib/constants";

describe("modelFromSource", () => {
  it("uses known hashes and falls back to the version text", () => {
    expect(modelFromSource("NovelAI Diffusion V4.5 4BDE2A90")).toBe("nai-diffusion-4-5-full");
    expect(modelFromSource("NovelAI Diffusion V5 657484A5")).toBe("nai-diffusion-5-full");
    expect(modelFromSource("NovelAI Diffusion V4.5 Curated 1234ABCD")).toBe("nai-diffusion-4-5-curated");
    expect(modelFromSource("NovelAI Diffusion V4 Curated Preview X")).toBe("nai-diffusion-4-curated-preview");
    expect(modelFromSource("Stable Diffusion")).toBeNull();
    expect(modelFromSource(null)).toBeNull();
  });
});

describe("prompt splitting", () => {
  it("takes off the quality suffix", () => {
    expect(splitQuality(`1girl, ${QUALITY_TAGS}`)).toEqual({ prompt: "1girl", qualityTags: true });
    expect(splitQuality(QUALITY_TAGS)).toEqual({ prompt: "", qualityTags: true });
    expect(splitQuality("1girl")).toEqual({ prompt: "1girl", qualityTags: false });
  });

  it("removes only the chosen artists", () => {
    expect(promptWithoutArtists("artist:a, 0.3::artist:b::, 1girl", new Set(["b"]))).toBe("artist:a, 1girl");
  });

  it("detects negative presets", () => {
    const heavy = NEGATIVE_PRESETS.heavy;
    expect(splitNegative(`${heavy}, bad hands`)).toEqual({ negative: "bad hands", preset: "heavy" });
    expect(splitNegative(heavy)).toEqual({ negative: "", preset: "heavy" });
    expect(splitNegative("bad hands")).toEqual({ negative: "bad hands", preset: "none" });
  });
});

describe("isImageBase64", () => {
  it("tells images from encodings", () => {
    expect(isImageBase64("iVBORw0KGgoAAAANSUhEUg")).toBe(true);
    expect(isImageBase64("/9j/4AAQSkZJRg")).toBe(true);
    expect(isImageBase64("data:image/webp;base64,UklGRiQAAABXRUJQVlA4")).toBe(true);
    expect(isImageBase64("AAAAgD8AAIA/")).toBe(false);
  });
});

describe("parseMetadata", () => {
  const comment = {
    prompt: "fallback",
    steps: 28, width: 832, height: 1216, scale: 5, cfg_rescale: 0, seed: 4139632993,
    sampler: "k_euler_ancestral", noise_schedule: "karras",
    reference_image_multiple: ["ENC1", "iVBORw0KGgoAAAA"],
    reference_strength_multiple: [0.5, 0.6],
    reference_information_extracted_multiple: [0.7, 1],
    v4_prompt: { caption: { base_caption: "artist:a, 1girl", char_captions: [
      { char_caption: "cynthia_(pokemon), 0.5::artist:c::", centers: [{ x: 0.3, y: 0.7 }] },
    ] } },
    v4_negative_prompt: { caption: { base_caption: "lowres", char_captions: [{ char_caption: "bad", centers: [] }] } },
  };

  it("extracts prompt, characters, vibes and settings", () => {
    const m = parseMetadata({ source: "NovelAI Diffusion V4.5 4BDE2A90", software: "NovelAI", description: null, comment });
    expect(m.model).toBe("nai-diffusion-4-5-full");
    expect(m.prompt).toBe("1girl");
    expect(m.rawPrompt).toBe("artist:a, 1girl");
    expect(m.artistTags).toEqual([
      { name: "a", strength: 0, enabled: true, source: "main" },
      { name: "c", strength: 0.5, enabled: true, source: 0 },
    ]);
    expect(m.negative).toBe("lowres");
    expect(m.characters).toEqual([{
      rawPrompt: "cynthia_(pokemon), 0.5::artist:c::", prompt: "cynthia_(pokemon)", negative: "bad", centerX: 0.3, centerY: 0.7,
    }]);
    expect(m.vibes).toEqual([
      { encoding: "ENC1", encoded: true, strength: 0.5, informationExtracted: 0.7 },
      { encoding: "iVBORw0KGgoAAAA", encoded: false, strength: 0.6, informationExtracted: 1 },
    ]);
    expect(m.settings).toMatchObject({ width: 832, height: 1216, steps: 28, sampler: "k_euler_ancestral" });
    expect(m.seed).toBe(4139632993);
    expect(m.characterReference).toBeNull();
    expect(vibeModelKey(m.model)).toBe("v4-5full");
  });

  it("falls back to legacy fields and ignores unknown values", () => {
    const m = parseMetadata({ source: null, software: null, description: null, comment: { prompt: "cat", uc: "dog", sampler: "weird" } });
    expect(m.prompt).toBe("cat");
    expect(m.negative).toBe("dog");
    expect(m.settings.sampler).toBeUndefined();
    expect(m.vibes).toEqual([]);
    expect(vibeModelKey(m.model)).toBeNull();
  });

  it("reads a character reference", () => {
    const m = parseMetadata({ source: null, software: null, description: null, comment: {
      director_reference_images: ["IMG"],
      director_reference_strengths: [0.8],
      director_reference_secondary_strengths: [0.25],
      director_reference_descriptions: [{ caption: { base_caption: "style" } }],
    } });
    expect(m.characterReference).toEqual({ imageBase64: "IMG", strength: 0.8, fidelity: 0.75, mode: "style" });
  });
});
