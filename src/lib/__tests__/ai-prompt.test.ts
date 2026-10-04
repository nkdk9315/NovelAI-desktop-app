import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/ipc", () => ({ getSettings: vi.fn(), setSetting: vi.fn() }));

import {
  DEFAULT_PREFS, MAX_AI_ITEMS, clampCount, composePrompt, parsePrefs, rowsToTagInputs, toRows,
} from "../ai-prompt";

describe("parsePrefs", () => {
  it("falls back to defaults for missing or broken input", () => {
    expect(parsePrefs(undefined)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs("{not json")).toEqual(DEFAULT_PREFS);
  });

  it("keeps valid fields and ignores malformed ones", () => {
    const prefs = parsePrefs(JSON.stringify({
      providerId: "p1", count: 999, style: "hybrid", detail: "nope", adult: true, includeOutfit: "yes",
    }));
    expect(prefs).toEqual({
      ...DEFAULT_PREFS, providerId: "p1", count: MAX_AI_ITEMS, style: "hybrid", adult: true,
    });
  });
});

describe("clampCount", () => {
  it("keeps the count within 1..MAX", () => {
    expect(clampCount(0)).toBe(1);
    expect(clampCount(7.4)).toBe(7);
    expect(clampCount(NaN)).toBe(DEFAULT_PREFS.count);
  });
});

describe("composePrompt", () => {
  it("joins tags and prose, skipping the empty part", () => {
    expect(composePrompt({ tags: ["umbrella", "rain"], text: "" })).toBe("umbrella, rain");
    expect(composePrompt({ tags: [], text: " Two girls wait. " })).toBe("Two girls wait.");
    expect(composePrompt({ tags: ["rain"], text: "Two girls wait." })).toBe("rain, Two girls wait.");
  });
});

describe("rows", () => {
  const items = [
    { name: "雨宿り", tags: ["umbrella"], text: "", unknownTags: [], removedTags: ["masterpiece"] },
    { name: "", tags: ["rain"], text: "", unknownTags: ["rain"], removedTags: [] },
  ];

  it("builds checked rows and converts only checked, non-empty ones", () => {
    const rows = toRows(items);
    expect(rows.map((r) => r.checked)).toEqual([true, true]);
    rows[1] = { ...rows[1], checked: false };
    expect(rowsToTagInputs(rows)).toEqual([{ name: "雨宿り", tag: "umbrella", defaultStrength: 0 }]);
    expect(rowsToTagInputs([{ ...rows[0], prompt: "  " }])).toEqual([]);
  });

  it("leaves the entry name undefined when blank", () => {
    const rows = toRows(items);
    expect(rowsToTagInputs([rows[1]])[0].name).toBeUndefined();
  });
});
