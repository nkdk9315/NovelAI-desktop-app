import { describe, it, expect } from "vitest";
import { historyActionOf, isToolOutput } from "@/lib/history-action";

describe("historyActionOf", () => {
  it("defaults to generate for legacy snapshots", () => {
    expect(historyActionOf({ prompt: "x" })).toEqual({ kind: "generate" });
    expect(historyActionOf(null)).toEqual({ kind: "generate" });
  });

  it("reads img2img / infill / tools", () => {
    expect(historyActionOf({ action: { type: "img2img", strength: 0.7 } }).kind).toBe("img2img");
    expect(historyActionOf({ action: { type: "infill" } }).kind).toBe("infill");
    expect(historyActionOf({ action: { type: "augment", tool: "lineart" } })).toEqual({ kind: "augment", tool: "lineart" });
    expect(isToolOutput({ action: { type: "upscale" } })).toBe(true);
    expect(isToolOutput({ action: { type: "img2img" } })).toBe(false);
    expect(historyActionOf({ action: { type: "typeset" } }).kind).toBe("typeset");
    expect(isToolOutput({ action: { type: "typeset" } })).toBe(true);
  });
});
