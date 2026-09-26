import { describe, it, expect } from "vitest";
import {
  decorateMainPrompt, effectiveQualityPreset, qualityTagsFor, splitDecorations, type PromptDecoration,
} from "@/lib/prompt-decoration";

const customs = [{ id: "q1", name: "Mine", tags: "best quality, absurdres" }];
const base: PromptDecoration = {
  model: "nai-diffusion-5-full", qualityPreset: "none", customQualityTags: customs,
  transparentBackground: false, furryMode: false,
};

describe("quality presets", () => {
  it("uses the official tags per model", () => {
    expect(qualityTagsFor("nai-diffusion-5-full", "standard", [])).toBe("very aesthetic, masterpiece, no text");
    expect(qualityTagsFor("nai-diffusion-5-curated", "light", [])).toBe("very aesthetic, amazing quality, no text");
    expect(qualityTagsFor("nai-diffusion-4-5-curated", "standard", []))
      .toBe("very aesthetic, masterpiece, no text, -0.8::feet::, rating:general");
    expect(qualityTagsFor("nai-diffusion-4-full", "standard", [])).toBe("no text, best quality, very aesthetic, absurdres");
    expect(qualityTagsFor("nai-diffusion-5-full", "none", [])).toBe("");
  });

  it("falls back when the preset is unavailable", () => {
    expect(effectiveQualityPreset("nai-diffusion-4-5-full", "light", [])).toBe("standard");
    expect(effectiveQualityPreset("nai-diffusion-5-full", "custom:gone", customs)).toBe("none");
    expect(qualityTagsFor("nai-diffusion-4-5-full", "custom:q1", customs)).toBe("best quality, absurdres");
  });
});

describe("decorateMainPrompt", () => {
  it("adds the quality suffix", () => {
    expect(decorateMainPrompt("1girl", { ...base, qualityPreset: "standard" }))
      .toBe("1girl, very aesthetic, masterpiece, no text");
    expect(decorateMainPrompt("", { ...base, qualityPreset: "light" })).toBe("very aesthetic, amazing quality, no text");
    expect(decorateMainPrompt("1girl", base)).toBe("1girl");
  });

  it("puts transparent background before the quality tags, on V5 only", () => {
    expect(decorateMainPrompt("1girl", { ...base, qualityPreset: "light", transparentBackground: true }))
      .toBe("1girl, transparent background, very aesthetic, amazing quality, no text");
    expect(decorateMainPrompt("1girl", { ...base, transparentBackground: true })).toBe("1girl, transparent background");
    expect(decorateMainPrompt("1girl", { ...base, model: "nai-diffusion-4-5-full", transparentBackground: true }))
      .toBe("1girl");
  });

  it("prefixes fur dataset in furry mode unless already there", () => {
    expect(decorateMainPrompt("fox", { ...base, furryMode: true, qualityPreset: "standard" }))
      .toBe("fur dataset, fox, very aesthetic, masterpiece, no text");
    expect(decorateMainPrompt("fur dataset, fox", { ...base, furryMode: true })).toBe("fur dataset, fox");
    expect(decorateMainPrompt("background dataset, city", { ...base, furryMode: true })).toBe("background dataset, city");
    expect(decorateMainPrompt("", { ...base, furryMode: true })).toBe("fur dataset");
  });

  it("inserts the quality tags before a Text: part", () => {
    expect(decorateMainPrompt("sign, Text: HELLO", { ...base, qualityPreset: "standard" }))
      .toBe("sign,, very aesthetic, masterpiece, no text Text: HELLO");
  });

  it("round-trips through splitDecorations", () => {
    const d = { ...base, qualityPreset: "custom:q1" as const, transparentBackground: true, furryMode: true };
    expect(splitDecorations(decorateMainPrompt("artist:a, fox", d), d.model, customs)).toEqual({
      prompt: "artist:a, fox", qualityPreset: "custom:q1", transparentBackground: true, furryMode: true,
    });
  });
});
