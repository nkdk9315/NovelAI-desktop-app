import { beforeEach, describe, expect, it } from "vitest";
import { buildGenerateRequest } from "@/lib/generation-request";
import { decorateMainPrompt, type PromptDecoration } from "@/lib/prompt-decoration";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { useSidebarPromptStore, type TargetPromptState } from "@/stores/sidebar-prompt-store";
import { NO_TEXT_NEGATIVE, WHITE_BACKGROUND_TAGS, spriteRequestExtras } from "../background";

const V5 = "nai-diffusion-5-full";
const V45 = "nai-diffusion-4-5-full";

describe("spriteRequestExtras", () => {
  it("uses V5 transparency and a white background elsewhere", () => {
    expect(spriteRequestExtras({ background: "transparent", noText: false }, V5))
      .toEqual({ positive: "", negative: "", transparent: true, plain: false });
    expect(spriteRequestExtras({ background: "transparent", noText: false }, V45))
      .toMatchObject({ positive: WHITE_BACKGROUND_TAGS, transparent: false });
    expect(spriteRequestExtras({ background: "white", noText: false }, V5))
      .toMatchObject({ positive: WHITE_BACKGROUND_TAGS, transparent: false });
    expect(spriteRequestExtras({ background: "asis", noText: false }, V45))
      .toMatchObject({ positive: "", transparent: false });
  });

  it("keeps text out with negative tags and a plain request", () => {
    expect(spriteRequestExtras({ background: "asis", noText: true }, V5))
      .toMatchObject({ negative: NO_TEXT_NEGATIVE, plain: true });
  });
});

describe("forceNoText", () => {
  const base: PromptDecoration = {
    model: V5, qualityPreset: "none", customQualityTags: [], transparentBackground: false, furryMode: false,
  };
  it("adds no text once, even without quality tags", () => {
    expect(decorateMainPrompt("1girl", { ...base, forceNoText: true })).toBe("1girl, no text");
    expect(decorateMainPrompt("1girl", { ...base, qualityPreset: "standard", forceNoText: true }))
      .toBe("1girl, very aesthetic, masterpiece, no text");
  });
});

describe("buildGenerateRequest for sprite cells", () => {
  const target = (extra: Partial<TargetPromptState>): TargetPromptState =>
    ({ groups: [], freeText: "", promptOverride: "", negativeOverride: "", ...extra });

  beforeEach(() => {
    useGenerationParamsStore.setState({
      model: V5, qualityPreset: "standard", autoSfx: true, transparentBackground: false, characters: [],
    });
    useSidebarPromptStore.setState({
      targets: {
        main: target({
          promptOverride: "1girl, silver hair",
          dialogue: [{ id: "d", text: "やあ", style: "speech" }],
          effects: ["sweat"],
        }),
      },
    });
  });

  it("leaves dialogue, sound effects and marks out of a plain image and keeps no text", () => {
    const built = buildGenerateRequest("p", { mainSuffix: "standing", plainImage: true, transparentBackground: true });
    if (!built.ok) throw new Error(built.errorKey);
    expect(built.req.prompt).toBe("1girl, silver hair, standing, transparent background, very aesthetic, masterpiece, no text");
    expect(built.req.transparentBackground).toBe(true);
  });

  it("still adds them to ordinary requests", () => {
    const built = buildGenerateRequest("p", { mainSuffix: "standing" });
    if (!built.ok) throw new Error(built.errorKey);
    expect(built.req.prompt).toContain("Text: やあ");
    expect(built.req.prompt).toContain("sound effects");
    expect(built.req.prompt).not.toContain("no text");
  });
});
