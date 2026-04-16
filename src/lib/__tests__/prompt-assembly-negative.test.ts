import { describe, it, expect } from "vitest";
import { assembleNegativeFromGroups } from "../prompt-assembly";
import type { SidebarPromptGroup } from "@/stores/sidebar-prompt-store";

function makeGroup(overrides?: Partial<SidebarPromptGroup>): SidebarPromptGroup {
  return {
    groupId: "g1",
    groupName: "Test",
    isSystem: false,
    category: null,
    tags: [],
    expanded: false,
    defaultStrength: 0,
    savedEnabledTags: null,
    randomMode: false,
    randomCount: 1,
    randomSource: "enabled",
    wildcardToken: null,
    ...overrides,
  };
}

function makeTag(tagId: string, tag: string, enabled: boolean, negativePrompt = "") {
  return {
    tagId,
    name: tag,
    tag,
    negativePrompt,
    enabled,
    strength: 0,
    defaultStrength: 0,
    thumbnailPath: null,
  };
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

describe("assembleNegativeFromGroups", () => {
  it("returns empty string for no groups", () => {
    expect(assembleNegativeFromGroups([])).toBe("");
  });

  it("collects negativePrompt from enabled tags only", () => {
    const group = makeGroup({
      tags: [
        makeTag("1", "a", true, "bad hands"),
        makeTag("2", "b", false, "blurry"),
      ],
    });
    expect(assembleNegativeFromGroups([group])).toBe("bad hands");
  });

  it("skips tags with empty negativePrompt", () => {
    const group = makeGroup({
      tags: [
        makeTag("1", "a", true, ""),
        makeTag("2", "b", true, "worst quality"),
      ],
    });
    expect(assembleNegativeFromGroups([group])).toBe("worst quality");
  });

  it("joins negatives from multiple groups with ', '", () => {
    const g1 = makeGroup({ groupId: "g1", tags: [makeTag("1", "a", true, "bad hands")] });
    const g2 = makeGroup({ groupId: "g2", tags: [makeTag("2", "b", true, "blurry")] });
    expect(assembleNegativeFromGroups([g1, g2])).toBe("bad hands, blurry");
  });

  it("in generate mode with randomMode, picks from pool randomly", () => {
    const group = makeGroup({
      randomMode: true,
      randomCount: 1,
      randomSource: "all",
      tags: [
        makeTag("1", "a", false, "bad hands"),
        makeTag("2", "b", false, "blurry"),
      ],
    });
    const result = assembleNegativeFromGroups([group], { mode: "generate", random: seededRandom(1) });
    expect(["bad hands", "blurry"]).toContain(result);
  });
});
