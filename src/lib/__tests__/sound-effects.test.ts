import { describe, it, expect } from "vitest";
import { appendTargetExtras, textCharCount } from "@/lib/in-image-text";
import { SFX_PRESETS, SFX_TEXTURES, activeSfx, type SfxLine } from "@/lib/sound-effects";
import { effectTags, effectsForScope, MANGA_EFFECT_IDS } from "@/lib/manga-effects";
import { shouldStripNoText } from "@/lib/generation-request";
import type { TargetPromptState } from "@/stores/sidebar-prompt-store";

const sfx = (text: string, texture: SfxLine["texture"] = "standard", size: SfxLine["size"] = "medium"): SfxLine =>
  ({ id: text, text, texture, size });

describe("sound effects", () => {
  it("binds each effect to its texture and size and shares the Text: block with dialogue", () => {
    expect(appendTargetExtras("1girl", {
      dialogue: [{ id: "d", text: "危ない！", style: "shout" }],
      sfx: [sfx("ブンッ", "sharp", "large"), sfx("チョロロロ", "liquid")],
    })).toBe(
      "1girl, speech bubble, shouting, sound effects, "
      + '"危ない！" in a large spiky jagged speech bubble, shouting, '
      + '"ブンッ" as a huge sharp slanted hand-drawn sound effect with speed lines, '
      + '"チョロロロ" as a medium-sized clearly visible soft wavy hand-drawn sound effect, '
      + "Text: 危ない！\n\nブンッ\n\nチョロロロ",
    );
  });

  it("keeps the verified ominous phrase whatever the size", () => {
    expect(appendTargetExtras("", { sfx: [sfx("ゴゴゴゴ", "ominous", "large")] }))
      .toBe('sound effects, "ゴゴゴゴ" as repeated ominous heavy hand-drawn sound effects in the background, Text: ゴゴゴゴ');
  });

  it("flattens whitespace, drops empty effects and counts them with the dialogue", () => {
    expect(activeSfx([sfx("  ザー \n ッ "), sfx("  ")]).map((l) => l.text)).toEqual(["ザー ッ"]);
    expect(textCharCount({ dialogue: [{ id: "d", text: "あ", style: "speech" }], sfx: [sfx("ドン")] })).toBe(5);
  });

  it("adds the automatic sound effects tag", () => {
    expect(appendTargetExtras("1girl, swinging", undefined, [], true)).toBe("1girl, swinging, sound effects");
    expect(appendTargetExtras("1girl", undefined)).toBe("1girl");
  });

  it("only offers known textures in the presets", () => {
    for (const group of SFX_PRESETS) for (const item of group.items) expect(SFX_TEXTURES).toContain(item.texture);
  });
});

describe("manga effects", () => {
  it("adds enabled effect tags in palette order before the text", () => {
    expect(appendTargetExtras("girl", { effects: ["anger", "sweat", "gone"], sfx: [sfx("ギクッ")] }))
      .toBe('girl, sweatdrop, anger vein, sound effects, "ギクッ" as a medium-sized clearly visible hand-drawn sound effect, Text: ギクッ');
    expect(effectTags(undefined)).toEqual([]);
  });

  it("splits the palette between characters and the whole picture", () => {
    expect(effectsForScope("main")).toEqual(["emphasisLines", "speedLines", "flowers"]);
    expect(effectsForScope("character").length + effectsForScope("main").length).toBe(MANGA_EFFECT_IDS.length);
  });
});

describe("shouldStripNoText", () => {
  const target = (extra: Partial<TargetPromptState>): TargetPromptState =>
    ({ groups: [], freeText: "", promptOverride: "", negativeOverride: "", ...extra });
  const params = { characters: [], autoSfx: false, stripNoTextWithDialogue: false };

  it("always drops no text with sound effects, otherwise only when opted in", () => {
    expect(shouldStripNoText(params, { main: target({ sfx: [sfx("ドン")] }) })).toBe(true);
    expect(shouldStripNoText({ ...params, autoSfx: true }, { main: target({}) })).toBe(true);
    const talk = { main: target({ dialogue: [{ id: "d", text: "やあ", style: "speech" }] }) };
    expect(shouldStripNoText(params, talk)).toBe(false);
    expect(shouldStripNoText({ ...params, stripNoTextWithDialogue: true }, talk)).toBe(true);
  });
});
