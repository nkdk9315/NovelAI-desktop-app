import { describe, it, expect } from "vitest";
import { cleanDialogueText, type DialogueLine } from "@/lib/dialogue";
import { appendTargetExtras, textCharCount, textCharLimit, textIssues } from "@/lib/in-image-text";
import { decorateMainPrompt, withoutNoText, type PromptDecoration } from "@/lib/prompt-decoration";
import {
  BUBBLE_SHAPES, BUILTIN_BUBBLE_STYLES, bubbleStyleGroup, type CustomBubbleStyle,
} from "@/lib/bubble-styles";
import { letteringPhrase } from "@/lib/lettering-styles";

const line = (text: string, style: DialogueLine["style"] = "speech"): DialogueLine => ({ id: text, text, style });
const appendDialogue = (prompt: string, lines: DialogueLine[] | undefined, customs: CustomBubbleStyle[] = []) =>
  appendTargetExtras(prompt, { dialogue: lines }, customs);
const dialogueCharCount = (lines: DialogueLine[]) => textCharCount({ dialogue: lines });
const dialogueIssues = (model: string, lines: DialogueLine[], prompt: string) => textIssues(model, { dialogue: lines }, prompt);

describe("cleanDialogueText", () => {
  it("keeps single line breaks but never a blank line (that would split the string)", () => {
    expect(cleanDialogueText("  あっ、\n\n\n  ネコだ！ ")).toBe("あっ、\nネコだ！");
    expect(cleanDialogueText(" \n ")).toBe("");
  });
});

describe("appendDialogue", () => {
  it("adds the kind's tags, a phrase bound to the text and a trailing Text: block", () => {
    expect(appendDialogue("1girl, smile", [line("こんにちは！")]))
      .toBe('1girl, smile, speech bubble, "こんにちは！" in a round speech bubble, Text: こんにちは！');
  });

  it("keeps each line's own shape and separates the texts with a blank line", () => {
    expect(appendDialogue("2girls,", [line("遅い！", "shout"), line("ごめん…", "weak")])).toBe(
      "2girls, speech bubble, shouting, "
      + '"遅い！" in a large spiky jagged speech bubble, shouting, '
      + '"ごめん…" in a speech bubble with a thin wavy trembling outline, weak voice, '
      + "Text: 遅い！\n\nごめん…",
    );
  });

  it("adds the direction per line", () => {
    expect(appendDialogue("", [{ ...line("翌朝", "narration"), direction: "horizontal" }]))
      .toBe('horizontal text, "翌朝" in a rectangular narration caption box, written horizontally, Text: 翌朝');
    expect(appendDialogue("1girl", [{ ...line("OPEN", "plain"), direction: "vertical" }]))
      .toBe('1girl, vertical text, "OPEN" as plain text, written vertically, Text: OPEN');
  });

  it("adds the lettering between the kind's phrase and the direction", () => {
    expect(appendDialogue("", [{ ...line("覚悟しろ"), lettering: "brush", direction: "vertical" }])).toBe(
      'speech bubble, vertical text, "覚悟しろ" in a round speech bubble, in bold brush calligraphy letters, '
      + "written vertically, Text: 覚悟しろ",
    );
    expect(appendDialogue("", [{ ...line("字幕", "subtitle"), lettering: "auto" }]))
      .toBe('"字幕" as movie subtitles at the bottom of the image, Text: 字幕');
  });

  it("uses custom kinds and falls back to the normal bubble for unknown ones", () => {
    const customs: CustomBubbleStyle[] = [
      { id: "c1", name: "Star", shape: "spiky", phrase: "in a star-shaped speech bubble", tags: "speech bubble, star (symbol)" },
    ];
    expect(appendDialogue("", [line("やった", "custom:c1")], customs))
      .toBe('speech bubble, star (symbol), "やった" in a star-shaped speech bubble, Text: やった');
    expect(appendDialogue("", [line("やった", "custom:gone")], customs))
      .toBe('speech bubble, "やった" in a round speech bubble, Text: やった');
  });

  it("flattens line breaks and double quotes inside the phrase only", () => {
    expect(appendDialogue("", [line('あっ、\n"ネコ"だ！')]))
      .toBe('speech bubble, "あっ、 \'ネコ\'だ！" in a round speech bubble, Text: あっ、\n"ネコ"だ！');
  });

  it("leaves the prompt alone without non-empty lines", () => {
    expect(appendDialogue("1girl", [line("  ")])).toBe("1girl");
    expect(appendDialogue("1girl", undefined)).toBe("1girl");
  });

  it("keeps Text: last after the site's quality-tag insertion", () => {
    const d: PromptDecoration = {
      model: "nai-diffusion-5-full", qualityPreset: "standard", customQualityTags: [],
      transparentBackground: false, furryMode: false,
    };
    const prompt = appendDialogue("1girl", [line("やあ", "plain")]);
    expect(decorateMainPrompt(prompt, d))
      .toBe('1girl, "やあ" as plain text,, very aesthetic, masterpiece, no text Text: やあ');
    expect(decorateMainPrompt(prompt, { ...d, stripNoText: true }))
      .toBe('1girl, "やあ" as plain text,, very aesthetic, masterpiece Text: やあ');
  });
});

describe("limits and issues", () => {
  it("uses the official per-model limits", () => {
    expect(textCharLimit("nai-diffusion-5-full")).toBe(750);
    expect(textCharLimit("nai-diffusion-5-curated")).toBe(374);
    expect(textCharLimit("nai-diffusion-4-5-full")).toBe(118);
  });

  it("counts characters including the blank-line separators", () => {
    expect(dialogueCharCount([line("あい"), line("う")])).toBe(5);
    expect(dialogueCharCount([line("😀")])).toBe(1);
  });

  it("warns about length, non-English text before V5 and a typed Text:", () => {
    const long = [line("a".repeat(119))];
    expect(dialogueIssues("nai-diffusion-4-5-full", long, "")).toEqual([{ kind: "tooLong", count: 119, limit: 118 }]);
    expect(dialogueIssues("nai-diffusion-4-5-full", [line("こんにちは")], "")).toEqual([{ kind: "needsV5" }]);
    expect(dialogueIssues("nai-diffusion-5-full", [line("こんにちは")], "")).toEqual([]);
    expect(dialogueIssues("nai-diffusion-5-full", [line("hi")], "sign, Text: OPEN")).toEqual([{ kind: "manualText" }]);
    expect(dialogueIssues("nai-diffusion-5-full", [], "sign, Text: OPEN")).toEqual([]);
  });
});

describe("withoutNoText", () => {
  it("drops only the no text tag", () => {
    expect(withoutNoText("very aesthetic, masterpiece, no text")).toBe("very aesthetic, masterpiece");
    expect(withoutNoText("no text, best quality")).toBe("best quality");
    expect(withoutNoText("")).toBe("");
  });
});

describe("bubble styles", () => {
  it("gives every built-in kind a known icon and a phrase", () => {
    for (const def of Object.values(BUILTIN_BUBBLE_STYLES)) {
      expect(BUBBLE_SHAPES).toContain(def.shape);
      expect(def.phrase).not.toBe("");
    }
  });

  it("splits the picker into manga and screen groups", () => {
    expect(bubbleStyleGroup("shout")).toBe("manga");
    expect(bubbleStyleGroup("gameWindow")).toBe("screen");
  });

  it("ignores unknown lettering ids", () => {
    expect(letteringPhrase("mincho")).toBe("in an elegant serif mincho font");
    expect(letteringPhrase("pixel")).toBe("");
    expect(letteringPhrase(undefined)).toBe("");
  });
});
