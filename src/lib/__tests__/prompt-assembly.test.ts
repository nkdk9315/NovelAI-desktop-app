import { describe, it, expect } from "vitest";
import {
  formatTagWithStrength,
  assemblePrompt,
  assembleFullPrompt,
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
    ...overrides,
  };
}

describe("assemblePrompt", () => {
  it("returns empty string for no groups", () => {
    expect(assemblePrompt([])).toBe("");
  });

  it("joins enabled tags with comma", () => {
    const group = makeGroup({
      tags: [
        { tagId: "1", name: "Smile", tag: "smile", enabled: true, strength: 0, defaultStrength: 0, thumbnailPath: null },
        { tagId: "2", name: "Blush", tag: "blush", enabled: true, strength: 0, defaultStrength: 0, thumbnailPath: null },
      ],
    });
    expect(assemblePrompt([group])).toBe("smile, blush");
  });

  it("skips disabled tags", () => {
    const group = makeGroup({
      tags: [
        { tagId: "1", name: "Smile", tag: "smile", enabled: true, strength: 0, defaultStrength: 0, thumbnailPath: null },
        { tagId: "2", name: "Blush", tag: "blush", enabled: false, strength: 0, defaultStrength: 0, thumbnailPath: null },
        { tagId: "3", name: "Wink", tag: "wink", enabled: true, strength: 0, defaultStrength: 0, thumbnailPath: null },
      ],
    });
    expect(assemblePrompt([group])).toBe("smile, wink");
  });

  it("applies strength formatting", () => {
    const group = makeGroup({
      tags: [
        { tagId: "1", name: "Smile", tag: "smile", enabled: true, strength: 3, defaultStrength: 3, thumbnailPath: null },
        { tagId: "2", name: "Blush", tag: "blush", enabled: true, strength: -1, defaultStrength: -1, thumbnailPath: null },
      ],
    });
    expect(assemblePrompt([group])).toBe("3::smile::, -1::blush::");
  });

  it("assembles tags from multiple groups", () => {
    const g1 = makeGroup({
      groupId: "g1",
      tags: [
        { tagId: "1", name: "Smile", tag: "smile", enabled: true, strength: 0, defaultStrength: 0, thumbnailPath: null },
      ],
    });
    const g2 = makeGroup({
      groupId: "g2",
      tags: [
        { tagId: "2", name: "Long Hair", tag: "long_hair", enabled: true, strength: 2, defaultStrength: 2, thumbnailPath: null },
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
        { tagId: "1", name: "Smile", tag: "smile", enabled: true, strength: 0, defaultStrength: 0, thumbnailPath: null },
      ],
    });
    expect(assembleFullPrompt("", [group])).toBe("smile");
  });

  it("combines free text and group tags", () => {
    const group = makeGroup({
      tags: [
        { tagId: "1", name: "Smile", tag: "smile", enabled: true, strength: 0, defaultStrength: 0, thumbnailPath: null },
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
        { tagId: "1", name: "Smile", tag: "smile", enabled: true, strength: 0, defaultStrength: 0, thumbnailPath: null },
      ],
    });
    expect(assembleFullPrompt("  1girl  ", [group])).toBe("1girl, smile");
  });
});
