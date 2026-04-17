import { describe, it, expect } from "vitest";
import {
  appendContributions,
  getPresetContributionsForCharacter,
  wrapWithStrength,
} from "../preset-contributions";
import type { PromptPresetDto, SidebarPresetGroupInstanceDto } from "@/types";

function makePreset(id: string, sourcePos: string, targetPos: string, targetNeg = ""): PromptPresetDto {
  return {
    id,
    name: id,
    folderId: 1,
    sortKey: 0,
    slots: [
      {
        id: `${id}-source`,
        slotIndex: 0,
        slotLabel: "source",
        genreId: null,
        positivePrompt: sourcePos,
        negativePrompt: "",
        role: "source",
        positionX: 0.5,
        positionY: 0.5,
      },
      {
        id: `${id}-target`,
        slotIndex: 1,
        slotLabel: "target",
        genreId: null,
        positivePrompt: targetPos,
        negativePrompt: targetNeg,
        role: "target",
        positionX: 0.5,
        positionY: 0.5,
      },
    ],
    createdAt: "",
    updatedAt: "",
  };
}

function makeInstance(
  id: string,
  source: string,
  target: string,
  activePresetIds: string[],
  overrides: Partial<SidebarPresetGroupInstanceDto> = {},
): SidebarPresetGroupInstanceDto {
  return {
    id,
    projectId: "proj",
    folderId: 1,
    sourceCharacterId: source,
    targetCharacterId: target,
    position: 0,
    defaultPositiveStrength: 1,
    defaultNegativeStrength: 1,
    activePresets: activePresetIds.map((pid) => ({
      presetId: pid,
      positiveStrength: null,
      negativeStrength: null,
      activatedAt: "2026-04-17T00:00:00Z",
    })),
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("wrapWithStrength", () => {
  it("returns text verbatim at neutral strength 1", () => {
    expect(wrapWithStrength("target#punch", 1)).toBe("target#punch");
  });

  it("wraps with strength syntax otherwise", () => {
    expect(wrapWithStrength("target#punch", 2)).toBe("2::target#punch::");
    expect(wrapWithStrength("target#punch", 2.5)).toBe("2.5::target#punch::");
  });

  it("returns empty text without wrapping", () => {
    expect(wrapWithStrength("", 2)).toBe("");
    expect(wrapWithStrength("   ", 2)).toBe("   ");
  });
});

describe("getPresetContributionsForCharacter", () => {
  it("collects source-role slots when the character is the source", () => {
    const preset = makePreset("p1", "source#punch", "target#punched");
    const instance = makeInstance("i1", "alice", "bob", ["p1"]);
    const result = getPresetContributionsForCharacter("alice", [instance], [preset]);
    expect(result.positive).toEqual(["source#punch"]);
  });

  it("collects target-role slots when the character is the target", () => {
    const preset = makePreset("p1", "source#punch", "target#punched");
    const instance = makeInstance("i1", "alice", "bob", ["p1"]);
    const result = getPresetContributionsForCharacter("bob", [instance], [preset]);
    expect(result.positive).toEqual(["target#punched"]);
  });

  it("allows duplicate tags from multiple instances", () => {
    const preset = makePreset("p1", "source#punch", "target#punched");
    const i1 = makeInstance("i1", "alice", "bob", ["p1"]);
    const i2 = makeInstance("i2", "carol", "bob", ["p1"]);
    const result = getPresetContributionsForCharacter("bob", [i1, i2], [preset]);
    expect(result.positive).toEqual(["target#punched", "target#punched"]);
  });

  it("returns empty when the character is in no instances", () => {
    const preset = makePreset("p1", "src", "tgt");
    const instance = makeInstance("i1", "alice", "bob", ["p1"]);
    expect(getPresetContributionsForCharacter("dave", [instance], [preset]).positive).toEqual([]);
  });

  it("collects negative prompts by role", () => {
    const preset = makePreset("p1", "src", "tgt", "worst quality");
    const instance = makeInstance("i1", "alice", "bob", ["p1"]);
    expect(getPresetContributionsForCharacter("bob", [instance], [preset]).negative).toEqual([
      "worst quality",
    ]);
  });

  it("wraps contributions with the instance default strength", () => {
    const preset = makePreset("p1", "src", "tgt", "worst");
    const instance = makeInstance("i1", "alice", "bob", ["p1"], {
      defaultPositiveStrength: 2,
      defaultNegativeStrength: 3,
    });
    const result = getPresetContributionsForCharacter("bob", [instance], [preset]);
    expect(result.positive).toEqual(["2::tgt::"]);
    expect(result.negative).toEqual(["3::worst::"]);
  });

  it("per-preset override beats instance default", () => {
    const preset = makePreset("p1", "src", "tgt");
    const instance = makeInstance("i1", "alice", "bob", [], {
      defaultPositiveStrength: 2,
    });
    instance.activePresets = [
      { presetId: "p1", positiveStrength: 5, negativeStrength: null, activatedAt: "2026-04-17T00:00:00Z" },
    ];
    const result = getPresetContributionsForCharacter("bob", [instance], [preset]);
    expect(result.positive).toEqual(["5::tgt::"]);
  });
});

describe("appendContributions", () => {
  it("returns base when no parts", () => {
    expect(appendContributions("1girl", [])).toBe("1girl");
  });

  it("appends non-empty parts with comma separator", () => {
    expect(appendContributions("1girl", ["smile", "blush"])).toBe("1girl, smile, blush");
  });

  it("skips empty parts", () => {
    expect(appendContributions("1girl", ["", "smile", ""])).toBe("1girl, smile");
  });

  it("returns joined tail when base is empty", () => {
    expect(appendContributions("", ["smile", "blush"])).toBe("smile, blush");
  });
});
