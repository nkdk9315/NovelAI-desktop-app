import { describe, it, expect } from "vitest";
import { layoutText, newTypesetBox, snapshotLayers, snapshotTexts } from "@/lib/typeset";

const oneEm = (line: string) => [...line].length;

describe("layoutText", () => {
  it("stacks vertical text in columns from right to left", () => {
    const l = layoutText("あい\nう", true, oneEm);
    expect(l.width).toBeCloseTo(2.6);
    expect(l.height).toBe(2);
    const [a, i, u] = l.glyphs;
    expect(a).toMatchObject({ text: "あ", y: -0.5, rotate: false });
    expect(i.y).toBe(0.5);
    expect(a.x).toBeGreaterThan(u.x); // first column on the right
    expect(a.x).toBeCloseTo(0.65);
  });

  it("rotates long vowels and brackets and nudges punctuation in vertical text", () => {
    const l = layoutText("ー、", true, oneEm);
    expect(l.glyphs[0].rotate).toBe(true);
    expect(l.glyphs[1]).toMatchObject({ rotate: false, x: 0.3 });
    expect(l.glyphs[1].y).toBeCloseTo(0.5 - 0.3);
  });

  it("centers horizontal lines using the measured width", () => {
    const l = layoutText("abc\nd", false, oneEm);
    expect(l.width).toBe(3);
    expect(l.glyphs.map((g) => g.text)).toEqual(["abc", "d"]);
    expect(l.glyphs[0].y).toBeCloseTo(-0.675);
    expect(l.glyphs.every((g) => g.x === 0)).toBe(true);
  });
});

describe("snapshot helpers", () => {
  it("collects dialogue and sound effects from a normal and a manga snapshot", () => {
    const ui = {
      sidebarPromptTargets: { main: { dialogue: [{ text: " やあ " }], sfx: [{ text: "ドン" }] }, c1: { dialogue: [{ text: "やあ" }] } },
      mangaPage: { enabled: true, panels: [{ cast: [{ dialogue: [{ text: "おはよう" }], sfx: [] }], text: [{ text: "翌朝" }], sfx: [{ text: "" }] }] },
    };
    expect(snapshotTexts({ ui_snapshot: ui })).toEqual(["やあ", "ドン", "おはよう", "翌朝"]);
    expect(snapshotTexts({ ui_snapshot: { ...ui, mangaPage: { ...ui.mangaPage, enabled: false } } })).toEqual(["やあ", "ドン"]);
    expect(snapshotTexts(null)).toEqual([]);
  });

  it("reads stored layers only when they are well-formed", () => {
    const boxes = [newTypesetBox("やあ")];
    expect(snapshotLayers({ typeset: { version: 1, baseImageId: "b", boxes } })).toEqual({ version: 1, baseImageId: "b", boxes });
    expect(snapshotLayers({ typeset: { version: 2, baseImageId: "b", boxes } })).toBeNull();
    expect(snapshotLayers({})).toBeNull();
  });
});
