import { describe, expect, it } from "vitest";
import { insertAtFront, insertPieceAt, itemBoundaries, removePiece, replacePiece, tidyCommas } from "../prompt-text";
import { newTarget, syncTargetText } from "@/stores/sidebar-prompt-text-sync";
import { rollTargetForGeneration } from "../prompt-roll";
import type { SidebarPromptGroup, SidebarPromptTag, TargetPromptState } from "@/stores/sidebar-prompt-utils";

function tag(id: string, over: Partial<SidebarPromptTag> = {}): SidebarPromptTag {
  return { tagId: id, name: id, tag: id, negativePrompt: "", enabled: false, strength: 0, defaultStrength: 0, thumbnailPath: null, ...over };
}

function group(over: Partial<SidebarPromptGroup> = {}): SidebarPromptGroup {
  return {
    groupId: "g", groupName: "hair", isSystem: false, category: null, tags: [tag("a"), tag("b")],
    expanded: false, defaultStrength: 0, savedEnabledTags: null, randomMode: false, randomCount: 1,
    randomSource: "all", wildcardToken: null, ...over,
  };
}

const enable = (t: TargetPromptState, id: string, extra: Partial<SidebarPromptTag> = {}): TargetPromptState => ({
  ...t,
  groups: t.groups.map((g) => ({ ...g, tags: g.tags.map((x) => (x.tagId === id ? { ...x, enabled: true, ...extra } : x)) })),
});

describe("prompt-text", () => {
  it("matches whole items only", () => {
    expect(removePiece("long hair, hair, smile", "hair")).toBe("long hair, smile");
    expect(removePiece("smile, hair", "hair")).toBe("smile");
    expect(replacePiece("a, b, c", "b", "2::b::")).toBe("a, 2::b::, c");
    expect(insertAtFront("  x", "y")).toBe("y, x");
    expect(insertAtFront("y, x", "y")).toBe("y, x");
  });

  it("tidies empty items", () => {
    expect(tidyCommas("a, , b, ")).toBe("a, b");
  });

  it("inserts a piece at an item boundary", () => {
    const text = "a, b, c";
    expect(itemBoundaries(text)).toEqual([0, 3, 6, 7]);
    expect(insertPieceAt(text, "T", 3)).toBe("a, T, b, c");
    expect(insertPieceAt(text, "T", 7)).toBe("a, b, c, T");
    expect(insertPieceAt(text, "T", 0)).toBe("T, a, b, c");
  });
});

describe("syncTargetText", () => {
  it("puts a selected tag at the front of the typed prompt and removes it again", () => {
    const base = { ...newTarget([group()]), promptOverride: "1girl, smile" };
    const on = syncTargetText(base, enable(base, "a", { negativePrompt: "bad a" }));
    expect(on.promptOverride).toBe("a, 1girl, smile");
    expect(on.negativeOverride).toBe("bad a");
    const off = syncTargetText(on, base);
    expect(off.promptOverride).toBe("1girl, smile");
    expect(off.negativeOverride).toBe("");
  });

  it("updates strength in place", () => {
    const base = { ...newTarget([group()]), promptOverride: "x" };
    const on = syncTargetText(base, enable(base, "a"));
    const stronger = syncTargetText(on, enable(on, "a", { strength: 1.5 }));
    expect(stronger.promptOverride).toBe("1.5::a::, x");
  });

  it("swaps tags for the wildcard when random turns on, and back", () => {
    const base = { ...newTarget([group()]), promptOverride: "x" };
    const on = syncTargetText(base, enable(base, "a"));
    const random = syncTargetText(on, { ...on, groups: on.groups.map((g) => ({ ...g, randomMode: true })) });
    expect(random.promptOverride).toBe("__hair__, x");
    const back = syncTargetText(random, on);
    expect(back.promptOverride).toBe("a, x");
  });

  it("starts a target with tokens of groups already in random mode", () => {
    expect(newTarget([group({ randomMode: true })]).promptOverride).toBe("__hair__");
  });
});

describe("rollTargetForGeneration", () => {
  it("substitutes the token and adds negatives of the same picks", () => {
    const g = group({ randomMode: true, tags: [tag("a", { negativePrompt: "bad a" })] });
    const target = { ...newTarget([g]), promptOverride: "x, __hair__, y" };
    expect(rollTargetForGeneration(target, () => 0)).toEqual({ positive: "x, a, y", negative: "bad a" });
  });

  it("drops stale tokens of non-random groups", () => {
    const target = { ...newTarget([group()]), promptOverride: "__hair__, x" };
    expect(rollTargetForGeneration(target).positive).toBe("x");
  });
});

describe("moveToken", () => {
  it("moves a token between items", async () => {
    const { moveToken } = await import("@/hooks/use-token-drag");
    const text = "__t__, a, b, c";
    expect(moveToken(text, "__t__", text.length)).toBe("a, b, c, __t__");
    expect(moveToken(text, "__t__", text.indexOf("b"))).toBe("a, __t__, b, c");
    expect(moveToken("a, b, __t__", "__t__", 0)).toBe("__t__, a, b");
    expect(moveToken(text, "__t__", 0)).toBe(text);
  });
});
