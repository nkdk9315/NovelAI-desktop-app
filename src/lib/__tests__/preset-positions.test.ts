import { describe, it, expect } from "vitest";
import { computeDesiredCharacterPositions } from "../preset-positions";
import type { PromptPresetDto, SidebarPresetGroupInstanceDto } from "@/types";

function preset(id: string, sourceXY: [number, number], targetXY: [number, number]): PromptPresetDto {
  return {
    id,
    name: id,
    folderId: 1,
    sortKey: 0,
    slots: [
      {
        id: `${id}-s`, slotIndex: 0, slotLabel: "", genreId: null,
        positivePrompt: "", negativePrompt: "", role: "source",
        positionX: sourceXY[0], positionY: sourceXY[1],
      },
      {
        id: `${id}-t`, slotIndex: 1, slotLabel: "", genreId: null,
        positivePrompt: "", negativePrompt: "", role: "target",
        positionX: targetXY[0], positionY: targetXY[1],
      },
    ],
    createdAt: "",
    updatedAt: "",
  };
}

function instance(
  id: string,
  source: string,
  target: string,
  actives: { presetId: string; activatedAt: string }[],
): SidebarPresetGroupInstanceDto {
  return {
    id, projectId: "proj", folderId: 1,
    sourceCharacterId: source, targetCharacterId: target,
    position: 0,
    defaultPositiveStrength: 1, defaultNegativeStrength: 1,
    activePresets: actives.map((a) => ({
      presetId: a.presetId,
      positiveStrength: null,
      negativeStrength: null,
      activatedAt: a.activatedAt,
    })),
    createdAt: "", updatedAt: "",
  };
}

describe("computeDesiredCharacterPositions", () => {
  it("returns empty map when no active presets", () => {
    const i = instance("i1", "alice", "bob", []);
    expect(computeDesiredCharacterPositions([i], [preset("p1", [0, 0], [1, 1])]).size).toBe(0);
  });

  it("applies source position to source character and target position to target character", () => {
    const p = preset("p1", [0.2, 0.3], [0.8, 0.7]);
    const i = instance("i1", "alice", "bob", [{ presetId: "p1", activatedAt: "2026-04-17T00:00:00Z" }]);
    const result = computeDesiredCharacterPositions([i], [p]);
    expect(result.get("alice")).toMatchObject({ x: 0.2, y: 0.3 });
    expect(result.get("bob")).toMatchObject({ x: 0.8, y: 0.7 });
  });

  it("last activated preset wins for overlapping characters", () => {
    const p1 = preset("p1", [0.1, 0.1], [0.9, 0.9]);
    const p2 = preset("p2", [0.5, 0.5], [0.5, 0.5]);
    const i = instance("i1", "alice", "bob", [
      { presetId: "p1", activatedAt: "2026-04-17T00:00:00Z" },
      { presetId: "p2", activatedAt: "2026-04-17T01:00:00Z" },
    ]);
    const result = computeDesiredCharacterPositions([i], [p1, p2]);
    expect(result.get("alice")).toMatchObject({ x: 0.5, y: 0.5 });
    expect(result.get("bob")).toMatchObject({ x: 0.5, y: 0.5 });
  });

  it("resolves across multiple instances by global activation time", () => {
    const p = preset("p1", [0.2, 0.2], [0.8, 0.8]);
    const i1 = instance("i1", "alice", "bob", [
      { presetId: "p1", activatedAt: "2026-04-17T00:00:00Z" },
    ]);
    // i2 activates same preset mapping carol → bob later in time
    const i2 = instance("i2", "carol", "bob", [
      { presetId: "p1", activatedAt: "2026-04-17T02:00:00Z" },
    ]);
    const result = computeDesiredCharacterPositions([i1, i2], [p]);
    // Bob got two "target" assignments; the later one (from i2) wins
    expect(result.get("bob")).toMatchObject({ x: 0.8, y: 0.8, activatedAt: "2026-04-17T02:00:00Z" });
    // Alice (only in i1) keeps her source position
    expect(result.get("alice")).toMatchObject({ x: 0.2, y: 0.2 });
    // Carol (only in i2) also gets her source position
    expect(result.get("carol")).toMatchObject({ x: 0.2, y: 0.2 });
  });
});
