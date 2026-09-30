import { describe, expect, it } from "vitest";
import { allCells, cellKey } from "../cells";
import { baseKey, firstOpenStep, guideStatus, misplacedLookTags, regionsUsedBy, type GuideCellState } from "../guide";
import { newAxis, newLevel, newPart, newSpec, newStage } from "../spec";

/** One pose, a damage axis over the body and an expression axis over the face. */
function setup() {
  const spec = newSpec("hero");
  const [body, face] = spec.regions;
  const jacket = newPart("jacket", "red jacket");
  spec.outfit.parts = [jacket];
  const d1 = newStage("破損1", "d1");
  d1.states = { [jacket.id]: "torn" };
  spec.outfit.stages.push(d1);
  spec.axes[0].regionIds = [body.id];
  const face1 = newAxis("表情", "face", "prompt", [newLevel("通常", "n"), newLevel("笑顔", "s", "smile")]);
  face1.regionIds = [face.id];
  spec.axes.push(face1);
  spec.poses[0].prompt = "full body, standing";
  return { spec, body, face, jacket, pose: spec.poses[0] };
}

const byId = (steps: ReturnType<typeof guideStatus>) => Object.fromEntries(steps.map((s) => [s.id, s]));

describe("guideStatus", () => {
  it("walks a fresh set from the look to the bases", () => {
    const { spec } = setup();
    let steps = byId(guideStatus({ spec, cells: {}, lookText: "" }));
    expect(steps.look.done).toBe(false);
    expect(steps.outfit.done).toBe(true);
    expect(steps.poses.done).toBe(true);
    expect(steps.axes.done).toBe(true);
    expect(steps.bases.done).toBe(false);
    expect(firstOpenStep(Object.values(steps))).toBe("look");

    steps = byId(guideStatus({ spec, cells: {}, lookText: "1girl, long red hair" }));
    expect(firstOpenStep(Object.values(steps))).toBe("bases");
  });

  it("reports empty prompts and axes without regions", () => {
    const { spec, jacket, pose } = setup();
    jacket.prompt = "";
    pose.prompt = " ";
    spec.axes[1].regionIds = [];
    const steps = byId(guideStatus({ spec, cells: {}, lookText: "x" }));
    expect(steps.outfit).toMatchObject({ done: false, missing: ["jacket"] });
    expect(steps.poses).toMatchObject({ done: false, missing: [pose.label] });
    expect(steps.axes).toMatchObject({ done: false, missing: ["表情"] });
    expect(firstOpenStep(Object.values(steps))).toBe("outfit");
  });

  it("reads prompt text through textOf (the prompt boxes)", () => {
    const { spec, jacket } = setup();
    jacket.prompt = "";
    const textOf = (id: string, fb: { positive: string; negative: string }) =>
      (id === jacket.id ? { positive: "blue coat", negative: "" } : fb);
    expect(byId(guideStatus({ spec, cells: {}, lookText: "x", textOf })).outfit.done).toBe(true);
  });

  it("makes the outfit optional without a damage axis", () => {
    const { spec } = setup();
    spec.axes = spec.axes.filter((a) => a.kind !== "outfit");
    spec.outfit.parts = [];
    const steps = byId(guideStatus({ spec, cells: {}, lookText: "x" }));
    expect(steps.outfit).toMatchObject({ done: false, optional: true });
    expect(firstOpenStep(Object.values(steps))).toBe("bases");
  });

  it("counts bases, masks and variants", () => {
    const { spec, body, face, pose } = setup();
    const cells: Record<string, GuideCellState> = { [baseKey(pose.id)]: { adoptedImageId: "img", excluded: false } };
    let steps = byId(guideStatus({ spec, cells, lookText: "x" }));
    expect(steps.bases.done).toBe(true);
    expect(steps.masks).toMatchObject({ done: false, count: { done: 0, total: 1 } });
    expect(firstOpenStep(Object.values(steps))).toBe("masks");

    spec.masks = { [pose.id]: { [body.id]: "m", [face.id]: "m" } };
    steps = byId(guideStatus({ spec, cells, lookText: "x" }));
    expect(steps.masks.done).toBe(true);
    const total = allCells(spec).length;
    expect(steps.variants.count).toEqual({ done: 1, total });

    const all = Object.fromEntries(allCells(spec).map((c) => [cellKey(c), { adoptedImageId: null, excluded: true }]));
    steps = byId(guideStatus({ spec, cells: all, lookText: "x" }));
    expect(steps.variants.done).toBe(true);
  });

  it("needs masks only for the regions of the axes a pose uses", () => {
    const { spec, body, pose } = setup();
    pose.skipAxes = [spec.axes[1].id];
    expect(regionsUsedBy(spec, pose.id)).toEqual([body.id]);
    spec.masks = { [pose.id]: { [body.id]: "m" } };
    expect(byId(guideStatus({ spec, cells: {}, lookText: "x" })).masks.done).toBe(true);
  });
});

describe("misplacedLookTags", () => {
  it("finds outfit, pose and expression tags in the look", () => {
    const found = misplacedLookTags("1girl, long hair, white shirt, pleated skirt, standing, smile, blue eyes");
    expect(found).toEqual([
      { kind: "outfit", tags: ["white shirt", "pleated skirt"] },
      { kind: "pose", tags: ["standing"] },
      { kind: "expression", tags: ["smile"] },
    ]);
  });

  it("leaves a clean look alone", () => {
    expect(misplacedLookTags("1girl, long silver hair, red eyes, slender")).toEqual([]);
  });
});
