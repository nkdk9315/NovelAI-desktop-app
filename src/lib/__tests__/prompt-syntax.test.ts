import { describe, expect, it } from "vitest";
import { emphasisOf, highlightPrompt, type SyntaxKind } from "@/lib/prompt-syntax";

/** Non-blank spans as [text, kind] */
const kinds = (prompt: string) =>
  highlightPrompt(prompt).filter((s) => s.text.trim()).map((s) => [s.text.trim(), s.kind] as [string, SyntaxKind]);
const weightOf = (prompt: string, text: string) => highlightPrompt(prompt).find((s) => s.text.trim() === text)?.weight;

describe("highlightPrompt", () => {
  it("keeps every character", () => {
    const prompts = [
      "1girl, {smile}, [[blush]], 1.5::artist:foo, bar::, Text: Hello, world",
      '0.8::artist#ei (eiei e1), 2equal8, ::, "hi" speech bubble\n{unclosed',
      "}]::, source#hug, |",
    ];
    for (const p of prompts) expect(highlightPrompt(p).map((s) => s.text).join("")).toBe(p);
  });

  it("marks separators, brackets and weights", () => {
    expect(kinds("1girl, {smile}")).toEqual([
      ["1girl", "plain"], [",", "separator"], ["{", "bracket"], ["smile", "plain"], ["}", "bracket"],
    ]);
    expect(kinds("1.5::smile::")).toEqual([["1.5::", "weight"], ["smile", "plain"], ["::", "weight"]]);
  });

  it("multiplies nested emphasis", () => {
    expect(weightOf("{{smile}}", "smile")).toBeCloseTo(1.1025);
    expect(weightOf("[smile]", "smile")).toBeCloseTo(1 / 1.05);
    expect(weightOf("2::{smile}::", "smile")).toBeCloseTo(2.1);
    expect(weightOf("-1::hat::", "hat")).toBe(-1);
    expect(weightOf("2::smile::, blush", "blush")).toBe(1);
  });

  it("opens a weight only at the start of an item", () => {
    expect(kinds("1girl")).toEqual([["1girl", "plain"]]);
    expect(kinds("2equal8::")).toEqual([["2equal8", "plain"], ["::", "error"]]);
  });

  it("marks artists and artist# groups", () => {
    expect(kinds("artist:foo, bar")).toEqual([
      ["artist:", "artistPrefix"], ["foo", "artist"], [",", "separator"], ["bar", "plain"],
    ]);
    expect(kinds("0.8::artist#ei, 2equal8::, smile")).toEqual([
      ["0.8::", "weight"], ["artist#", "artistPrefix"], ["ei", "artist"], [",", "separator"],
      ["2equal8", "artist"], ["::", "weight"], [",", "separator"], ["smile", "plain"],
    ]);
  });

  it("treats everything after Text: as text", () => {
    expect(kinds("1girl, Text: Hello, {world}")).toEqual([
      ["1girl", "plain"], [",", "separator"], ["Text:", "textPrefix"], ["Hello, {world}", "text"],
    ]);
    // Only at the start of an item
    expect(kinds("context: a")).toEqual([["context: a", "plain"]]);
  });

  it("marks quoted phrases, commas included", () => {
    expect(kinds('"hi, you" speech bubble, smile')).toEqual([
      ['"hi, you"', "quote"], ["speech bubble", "plain"], [",", "separator"], ["smile", "plain"],
    ]);
    expect(kinds('say "hi')).toEqual([['say "hi', "plain"]]);
  });

  it("marks interaction prefixes", () => {
    expect(kinds("source#hug")).toEqual([["source#", "prefix"], ["hug", "plain"]]);
  });

  it("flags unbalanced brackets", () => {
    expect(kinds("smile}")).toEqual([["smile", "plain"], ["}", "error"]]);
    expect(kinds("{smile")).toEqual([["{", "error"], ["smile", "plain"]]);
    expect(kinds("{smile]")).toEqual([["{", "error"], ["smile", "plain"], ["]", "error"]]);
    expect(kinds("1.2::{smile::")).toEqual([["1.2::", "weight"], ["{", "error"], ["smile", "plain"], ["::", "weight"]]);
    expect(kinds("1.2::smile")).toEqual([["1.2::", "error"], ["smile", "plain"]]);
  });
});

describe("emphasisOf", () => {
  it("is none near 1", () => {
    expect(emphasisOf(1)).toBeNull();
  });
  it("grows with the weight", () => {
    expect(emphasisOf(1.05)).toEqual({ direction: "up", level: 1 });
    expect(emphasisOf(1.05 ** 4)).toEqual({ direction: "up", level: 2 });
    expect(emphasisOf(2)).toEqual({ direction: "up", level: 3 });
    expect(emphasisOf(1 / 1.05)).toEqual({ direction: "down", level: 1 });
    expect(emphasisOf(0.5)).toEqual({ direction: "down", level: 3 });
    expect(emphasisOf(-1)).toEqual({ direction: "negative", level: 3 });
  });
});
