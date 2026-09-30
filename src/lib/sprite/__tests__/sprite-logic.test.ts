import { describe, expect, it } from "vitest";
import {
  allCells, cellCount, cellKey, cellLabel, coordOf, isOrphanKey, levelIndex, parseCellKey,
} from "../cells";
import { cellPrompt, outfitPromptAt, weighted } from "../prompt";
import { orderForGeneration, planCell, type CellState } from "../plan";
import {
  newAxis, newLevel, newPart, newPose, newSpec, newStage, normalizeSpec, slugKey, type SpriteSpec,
} from "../spec";

/** Knight: jacket + blouse over underwear, damage 0–3, wounds (body) and fear (face, composite). */
function knight() {
  const spec = newSpec("knight");
  const [body, face] = spec.regions;
  const jacket = newPart("jacket", "navy blue jacket, long sleeves");
  const blouse = newPart("blouse", "white blouse");
  const under = newPart("underwear", "light blue lace bra", [jacket.id, blouse.id]);
  spec.outfit.parts = [jacket, blouse, under];
  const d1 = newStage("破損1", "d1", "torn clothes");
  d1.states = { [jacket.id]: "torn" };
  const d2 = newStage("破損2", "d2", "torn clothes");
  d2.states = { [jacket.id]: "exposed", [blouse.id]: "exposed" };
  const d3 = newStage("破損3", "d3", "torn clothes, clothes destroyed");
  d3.states = { [jacket.id]: "gone", [blouse.id]: "gone" };
  d3.overrides = { [jacket.id]: "tattered remains of jacket" };
  spec.outfit.stages.push(d1, d2, d3);
  const wounds = newAxis("傷", "wound", "prompt", [newLevel("なし", "w0"), newLevel("あり", "w1", "bruises, cuts")]);
  wounds.regionIds = [body.id];
  const fear = newAxis("恐怖", "fear", "prompt", [newLevel("なし", "f0"), newLevel("怯え", "f1", "scared, tears", 1.6)]);
  fear.regionIds = [face.id];
  fear.composite = true;
  spec.axes.push(wounds, fear);
  const [outfit] = spec.axes;
  return { spec, body, face, jacket, blouse, under, outfit, wounds, fear, pose: spec.poses[0] };
}

const idx = (s: SpriteSpec, poseId: string, i: Record<string, number>) => cellKey(coordOf(s, poseId, i));

describe("cells", () => {
  it("keys list only non-default levels and round-trip", () => {
    const k = knight();
    const key = idx(k.spec, k.pose.id, { [k.outfit.id]: 2, [k.fear.id]: 1, [k.wounds.id]: 0 });
    const coord = parseCellKey(key);
    expect(coord.poseId).toBe(k.pose.id);
    expect(Object.keys(coord.levels)).toHaveLength(2);
    expect(levelIndex(k.spec, coord, k.outfit)).toBe(2);
    expect(cellKey(coord)).toBe(key);
    expect(idx(k.spec, k.pose.id, {})).toBe(k.pose.id);
    expect(cellLabel(k.spec, coord)).toBe("通常 / 破損2 / 怯え");
  });

  it("enumerates every combination and detects orphans", () => {
    const k = knight();
    expect(cellCount(k.spec)).toBe(1 * 4 * 2 * 2);
    expect(allCells(k.spec)).toHaveLength(16);
    const key = idx(k.spec, k.pose.id, { [k.wounds.id]: 1 });
    expect(isOrphanKey(k.spec, key)).toBe(false);
    k.wounds.levels.pop();
    expect(isOrphanKey(k.spec, key)).toBe(true);
    expect(isOrphanKey(k.spec, "nope")).toBe(true);
  });
});

describe("prompt", () => {
  it("hides underwear until a covering part is exposed", () => {
    const k = knight();
    const [d0, d1, d2, d3] = k.spec.outfit.stages;
    expect(outfitPromptAt(k.spec, d0).positive).toBe("navy blue jacket, long sleeves, white blouse");
    expect(outfitPromptAt(k.spec, d1).positive).toBe("torn clothes, torn navy blue jacket, long sleeves, white blouse");
    expect(outfitPromptAt(k.spec, d2).positive).toBe(
      "torn clothes, heavily torn navy blue jacket, long sleeves, heavily torn white blouse, light blue lace bra visible through tears",
    );
    expect(outfitPromptAt(k.spec, d3).positive).toBe(
      "torn clothes, clothes destroyed, tattered remains of jacket, light blue lace bra",
    );
  });

  it("combines pose, outfit and weighted axis levels; prompt targets win over stored text", () => {
    const k = knight();
    const coord = coordOf(k.spec, k.pose.id, { [k.fear.id]: 1 });
    const p = cellPrompt(k.spec, coord);
    expect(p.positive).toBe(
      "full body, standing, looking at viewer, navy blue jacket, long sleeves, white blouse, 1.6::scared, tears::",
    );
    const fromTargets = cellPrompt(k.spec, coord, (id, fb) =>
      id === k.pose.id ? { positive: "sitting", negative: "standing" } : fb);
    expect(fromTargets.positive.startsWith("sitting, ")).toBe(true);
    expect(fromTargets.negative).toBe("standing");
    expect(weighted(" x ", 1)).toBe("x");
    expect(weighted("x", 1.25)).toBe("1.25::x::");
  });
});

describe("plan", () => {
  const lookupOf = (adopted: string[], excluded: string[] = []) => (key: string): CellState | undefined =>
    ({ adoptedImageId: adopted.includes(key) ? "img" : null, excluded: excluded.includes(key) });

  it("makes the base by txt2img and chains outfit stages", () => {
    const k = knight();
    const base = k.pose.id;
    expect(planCell(k.spec, base, lookupOf([])).method).toBe("txt2img");
    const d2 = idx(k.spec, base, { [k.outfit.id]: 2 });
    const d1 = idx(k.spec, base, { [k.outfit.id]: 1 });
    const p = planCell(k.spec, d2, lookupOf([d1]));
    expect(p.method).toBe("inpaint");
    expect(p.parentKey).toBe(d1);
    expect(p.regionIds).toEqual([k.body.id]);
    expect(p.blockers).toEqual(["maskMissing"]);
    k.spec.masks[base] = { [k.body.id]: "png" };
    expect(planCell(k.spec, d2, lookupOf([d1])).blockers).toEqual([]);
    expect(planCell(k.spec, d2, lookupOf([], [d2])).blockers).toEqual(["excluded", "parentNotAdopted"]);
  });

  it("composites a face axis onto other axes, or inpaints when asked", () => {
    const k = knight();
    const base = k.pose.id;
    k.spec.masks[base] = { [k.body.id]: "a", [k.face.id]: "b" };
    const key = idx(k.spec, base, { [k.outfit.id]: 3, [k.fear.id]: 1 });
    const parent = idx(k.spec, base, { [k.outfit.id]: 3 });
    const source = idx(k.spec, base, { [k.fear.id]: 1 });
    const p = planCell(k.spec, key, lookupOf([parent, source]));
    expect(p).toMatchObject({ method: "composite", parentKey: parent, sourceKey: source, blockers: [] });
    expect(p.subtractRegionIds).toEqual([k.body.id]);
    expect(planCell(k.spec, key, lookupOf([parent]), { preferInpaint: true }).method).toBe("inpaint");
    // Overlapping regions can't be composited
    k.fear.regionIds = [k.body.id];
    expect(planCell(k.spec, key, lookupOf([parent, source])).method).toBe("inpaint");
  });

  it("orders cells after the cells they are made from", () => {
    const k = knight();
    const base = k.pose.id;
    const d3 = idx(k.spec, base, { [k.outfit.id]: 3 });
    const d2 = idx(k.spec, base, { [k.outfit.id]: 2 });
    const d1 = idx(k.spec, base, { [k.outfit.id]: 1 });
    expect(orderForGeneration(k.spec, [d3, base, d1, d2])).toEqual([base, d1, d2, d3]);
  });
});

describe("spec", () => {
  it("normalizes partial data and makes file-safe keys", () => {
    const s = normalizeSpec({ poses: [], outfit: { parts: [{ id: "a", name: "x", prompt: "", negative: "" }] } });
    expect(s.poses).toEqual([]);
    expect(s.outfit.parts[0].coveredBy).toEqual([]);
    expect(s.outfit.stages.length).toBe(1);
    expect(s.export.target).toBe("generic");
    expect(normalizeSpec(null).poses.length).toBe(1);
    expect(slugKey("Battle Pose!", "p")).toBe("battle_pose");
    expect(slugKey("通常", "p1")).toBe("p1");
  });
});

describe("mask cells", async () => {
  const { dilateCells, emptyCells, paintCircle, paintRect, subtractCells, unionCells } = await import("../mask");
  it("paints, combines and dilates cells", () => {
    const a = emptyCells(6, 6);
    paintRect(a, 4, 4, 1, 1, 1);
    expect(a.count).toBe(16);
    paintRect(a, 1, 1, 1, 1, 0);
    expect(a.count).toBe(15);
    const b = emptyCells(6, 6);
    paintCircle(b, 0.5, 0.5, 0.6, 1);
    expect(b.count).toBe(1);
    expect(unionCells([a, b], 6, 6).count).toBe(16);
    expect(subtractCells(a, b).count).toBe(15);
    const d = dilateCells(b, 1);
    expect(d.count).toBe(4);
  });
});

describe("batch", async () => {
  const { withMissingAncestors } = await import("../plan");
  it("adds parents that are not adopted yet", () => {
    const k = knight();
    const base = k.pose.id;
    const d2 = idx(k.spec, base, { [k.outfit.id]: 2 });
    const d1 = idx(k.spec, base, { [k.outfit.id]: 1 });
    const lookup = (key: string) => ({ adoptedImageId: key === base ? "img" : null, excluded: false });
    expect(withMissingAncestors(k.spec, [d2], lookup)).toEqual([d1, d2]);
  });
});

describe("edit", async () => {
  const { move, removePart, removeRegion, removePose, uniqueKey } = await import("../edit");
  it("keeps references consistent", () => {
    const k = knight();
    k.spec.masks[k.pose.id] = { [k.body.id]: "a", [k.face.id]: "b" };
    const noBody = removeRegion(k.spec, k.body.id);
    expect(noBody.masks[k.pose.id]).toEqual({ [k.face.id]: "b" });
    expect(noBody.axes.every((a) => !a.regionIds.includes(k.body.id))).toBe(true);
    const noJacket = removePart(k.spec, k.jacket.id);
    expect(noJacket.outfit.parts.find((p) => p.id === k.under.id)?.coveredBy).toEqual([k.blouse.id]);
    expect(noJacket.outfit.stages[3].overrides).toEqual({});
    expect(removePose(k.spec, k.pose.id).masks).toEqual({});
    expect(move([1, 2, 3], 0, 1)).toEqual([2, 1, 3]);
    expect(move([1, 2, 3], 0, -1)).toEqual([1, 2, 3]);
    expect(uniqueKey("a", ["a", "a_2"])).toBe("a_3");
  });
});

describe("templates", async () => {
  const { BUILTIN_TEMPLATES, builtinTemplate, copySpec, withFreshIds } = await import("../templates");
  it("builtins are consistent and copies get fresh ids", () => {
    for (const id of BUILTIN_TEMPLATES) {
      const s = builtinTemplate(id);
      const regionIds = new Set(s.regions.map((r) => r.id));
      expect(s.axes.every((a) => a.regionIds.every((r) => regionIds.has(r)))).toBe(true);
    }
    const k = knight();
    k.spec.masks[k.pose.id] = { [k.body.id]: "a" };
    const copy = withFreshIds(k.spec, true);
    expect(copy.poses[0].id).not.toBe(k.pose.id);
    expect(copy.masks[copy.poses[0].id][copy.regions[0].id]).toBe("a");
    const under = copy.outfit.parts[2];
    expect(under.coveredBy).toEqual([copy.outfit.parts[0].id, copy.outfit.parts[1].id]);
    expect(Object.keys(copy.outfit.stages[1].states)).toEqual([copy.outfit.parts[0].id]);
    const baked = copySpec(k.spec, (id, fb) => (id === k.pose.id ? { positive: "baked", negative: "" } : fb));
    expect(baked.poses[0].prompt).toBe("baked");
    expect(outfitPromptAt(copy, copy.outfit.stages[2]).positive).toContain("visible through tears");
  });
});

describe("per-pose axes", () => {
  it("skipped axes drop cells and block them", () => {
    const k = knight();
    k.pose.skipAxes = [k.fear.id];
    expect(cellCount(k.spec)).toBe(4 * 2);
    expect(allCells(k.spec)).toHaveLength(8);
    const key = idx(k.spec, k.pose.id, { [k.fear.id]: 1 });
    expect(planCell(k.spec, key, () => undefined).blockers).toEqual(["skipped"]);
  });
});

describe("stale and batch problems", async () => {
  const { batchProblems, isStale } = await import("../plan");
  it("flags cells made from an old parent image", () => {
    const k = knight();
    const d1 = idx(k.spec, k.pose.id, { [k.outfit.id]: 1 });
    const plan = planCell(k.spec, d1, () => undefined);
    expect(isStale(plan, { parentImageId: "old", method: "inpaint" }, "new")).toBe(true);
    expect(isStale(plan, { parentImageId: "new", method: "inpaint" }, "new")).toBe(false);
    expect(isStale(plan, { parentImageId: "old", method: "import" }, "new")).toBe(false);
  });
  it("lists poses without masks and axes without regions", () => {
    const k = knight();
    k.wounds.regionIds = [];
    const keys = [idx(k.spec, k.pose.id, { [k.outfit.id]: 1 }), idx(k.spec, k.pose.id, { [k.wounds.id]: 1 })];
    expect(batchProblems(k.spec, keys)).toEqual({ maskMissing: [k.pose.id], noRegion: [k.wounds.id] });
  });
});

describe("pose reference ordering", async () => {
  const { withMissingAncestors } = await import("../plan");
  it("makes the first pose's base before the others when the option is on", () => {
    const k = knight();
    const second = newPose("被弾", "hit", "being hit");
    k.spec.poses.push(second);
    const secondBase = cellKey({ poseId: second.id, levels: {} });
    expect(withMissingAncestors(k.spec, [secondBase], () => undefined)).toEqual([secondBase]);
    k.spec.poseReference = true;
    expect(withMissingAncestors(k.spec, [secondBase], () => undefined)).toEqual([k.pose.id, secondBase]);
  });
});
