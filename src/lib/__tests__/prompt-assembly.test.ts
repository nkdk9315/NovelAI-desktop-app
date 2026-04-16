import { describe, it, expect } from "vitest";
import {
  formatTagWithStrength,
  assemblePrompt,
  assembleFullPrompt,
  rollPromptForGeneration,
} from "../prompt-assembly";
import type { SidebarPromptGroup } from "@/stores/sidebar-prompt-store";

describe("formatTagWithStrength", () => {
  it("returns plain tag for strength 0", () => {
    expect(formatTagWithStrength("smile", 0)).toBe("smile");
  });

  it("formats positive strength with colon syntax", () => {
    expect(formatTagWithStrength("smile", 3)).toBe("3::smile::");
    expect(formatTagWithStrength("long_hair", 1)).toBe("1::long_hair::");
  });

  it("formats negative strength with colon syntax", () => {
    expect(formatTagWithStrength("smile", -2)).toBe("-2::smile::");
    expect(formatTagWithStrength("blush", -1)).toBe("-1::blush::");
  });
});

function makeGroup(
  overrides?: Partial<SidebarPromptGroup>,
): SidebarPromptGroup {
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

function makeTag(
  tagId: string,
  tag: string,
  enabled: boolean,
  strength = 0,
) {
  return {
    tagId,
    name: tag,
    tag,
    negativePrompt: "",
    enabled,
    strength,
    defaultStrength: strength,
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

describe("assemblePrompt", () => {
  it("returns empty string for no groups", () => {
    expect(assemblePrompt([])).toBe("");
  });

  it("joins enabled tags with comma", () => {
    const group = makeGroup({
      tags: [
        { tagId: "1", name: "Smile", tag: "smile", negativePrompt: "", enabled: true, strength: 0, defaultStrength: 0, thumbnailPath: null },
        { tagId: "2", name: "Blush", tag: "blush", negativePrompt: "", enabled: true, strength: 0, defaultStrength: 0, thumbnailPath: null },
      ],
    });
    expect(assemblePrompt([group])).toBe("smile, blush");
  });

  it("skips disabled tags", () => {
    const group = makeGroup({
      tags: [
        { tagId: "1", name: "Smile", tag: "smile", negativePrompt: "", enabled: true, strength: 0, defaultStrength: 0, thumbnailPath: null },
        { tagId: "2", name: "Blush", tag: "blush", negativePrompt: "", enabled: false, strength: 0, defaultStrength: 0, thumbnailPath: null },
        { tagId: "3", name: "Wink", tag: "wink", negativePrompt: "", enabled: true, strength: 0, defaultStrength: 0, thumbnailPath: null },
      ],
    });
    expect(assemblePrompt([group])).toBe("smile, wink");
  });

  it("applies strength formatting", () => {
    const group = makeGroup({
      tags: [
        { tagId: "1", name: "Smile", tag: "smile", negativePrompt: "", enabled: true, strength: 3, defaultStrength: 3, thumbnailPath: null },
        { tagId: "2", name: "Blush", tag: "blush", negativePrompt: "", enabled: true, strength: -1, defaultStrength: -1, thumbnailPath: null },
      ],
    });
    expect(assemblePrompt([group])).toBe("3::smile::, -1::blush::");
  });

  it("assembles tags from multiple groups", () => {
    const g1 = makeGroup({
      groupId: "g1",
      tags: [
        { tagId: "1", name: "Smile", tag: "smile", negativePrompt: "", enabled: true, strength: 0, defaultStrength: 0, thumbnailPath: null },
      ],
    });
    const g2 = makeGroup({
      groupId: "g2",
      tags: [
        { tagId: "2", name: "Long Hair", tag: "long_hair", negativePrompt: "", enabled: true, strength: 2, defaultStrength: 2, thumbnailPath: null },
      ],
    });
    expect(assemblePrompt([g1, g2])).toBe("smile, 2::long_hair::");
  });
});

describe("assembleFullPrompt", () => {
  it("returns only free text when no group tags", () => {
    expect(assembleFullPrompt("hello world", [])).toBe("hello world");
  });

  it("returns only group tags when free text is empty", () => {
    const group = makeGroup({
      tags: [
        { tagId: "1", name: "Smile", tag: "smile", negativePrompt: "", enabled: true, strength: 0, defaultStrength: 0, thumbnailPath: null },
      ],
    });
    expect(assembleFullPrompt("", [group])).toBe("smile");
  });

  it("combines free text and group tags", () => {
    const group = makeGroup({
      tags: [
        { tagId: "1", name: "Smile", tag: "smile", negativePrompt: "", enabled: true, strength: 0, defaultStrength: 0, thumbnailPath: null },
      ],
    });
    expect(assembleFullPrompt("1girl", [group])).toBe("1girl, smile");
  });

  it("returns empty string when both are empty", () => {
    expect(assembleFullPrompt("", [])).toBe("");
    expect(assembleFullPrompt("   ", [])).toBe("");
  });

  it("trims free text", () => {
    const group = makeGroup({
      tags: [
        { tagId: "1", name: "Smile", tag: "smile", negativePrompt: "", enabled: true, strength: 0, defaultStrength: 0, thumbnailPath: null },
      ],
    });
    expect(assembleFullPrompt("  1girl  ", [group])).toBe("1girl, smile");
  });
});

describe("wildcard substitution", () => {
  it("substitutes enabled tags at the token position (generate mode)", () => {
    const group = makeGroup({
      wildcardToken: "__g__",
      tags: [makeTag("1", "smile", true), makeTag("2", "blush", true)],
    });
    expect(
      rollPromptForGeneration("1girl, __g__, solo", [group]),
    ).toBe("1girl, smile, blush, solo");
  });

  it("does NOT auto-append the token — the user inserts it explicitly", () => {
    const group = makeGroup({
      wildcardToken: "__g__",
      tags: [makeTag("1", "smile", true)],
    });
    expect(assembleFullPrompt("1girl", [group])).toBe("1girl");
  });

  it("leaves the token visible in preview mode", () => {
    const group = makeGroup({
      wildcardToken: "__g__",
      tags: [makeTag("1", "smile", true)],
    });
    expect(assembleFullPrompt("1girl, __g__", [group])).toBe("1girl, __g__");
  });

  it("contributes nothing when token is not in the free text", () => {
    const group = makeGroup({
      wildcardToken: "__g__",
      tags: [makeTag("1", "smile", true)],
    });
    expect(rollPromptForGeneration("1girl", [group])).toBe("1girl");
  });

  it("removes the token when no tags are selected", () => {
    const group = makeGroup({
      wildcardToken: "__g__",
      tags: [makeTag("1", "smile", false)],
    });
    expect(
      rollPromptForGeneration("a, __g__, b", [group]),
    ).toBe("a, , b");
  });
});

describe("random mode", () => {
  it("picks N from all tags regardless of enabled state", () => {
    const group = makeGroup({
      randomMode: true,
      randomCount: 2,
      randomSource: "all",
      tags: [
        makeTag("1", "a", false),
        makeTag("2", "b", false),
        makeTag("3", "c", false),
        makeTag("4", "d", false),
      ],
    });
    const result = rollPromptForGeneration("", [group], seededRandom(1));
    const parts = result.split(", ").filter((s) => s.length > 0);
    expect(parts).toHaveLength(2);
    for (const p of parts) expect(["a", "b", "c", "d"]).toContain(p);
  });

  it("picks from enabled-only pool when source=enabled", () => {
    const group = makeGroup({
      randomMode: true,
      randomCount: 5,
      randomSource: "enabled",
      tags: [
        makeTag("1", "a", true),
        makeTag("2", "b", false),
        makeTag("3", "c", true),
      ],
    });
    const parts = rollPromptForGeneration("", [group], seededRandom(2))
      .split(", ")
      .filter((s) => s.length > 0)
      .sort();
    expect(parts).toEqual(["a", "c"]);
  });

  it("preview mode ignores randomMode", () => {
    const group = makeGroup({
      randomMode: true,
      randomCount: 1,
      randomSource: "all",
      tags: [makeTag("1", "a", true), makeTag("2", "b", true)],
    });
    expect(assembleFullPrompt("", [group])).toBe("a, b");
  });

  it("random output is substituted at the wildcard token", () => {
    const group = makeGroup({
      randomMode: true,
      randomCount: 1,
      randomSource: "all",
      wildcardToken: "__pose__",
      tags: [makeTag("1", "standing", false)],
    });
    expect(
      rollPromptForGeneration("1girl, __pose__", [group], seededRandom(3)),
    ).toBe("1girl, standing");
  });
});


