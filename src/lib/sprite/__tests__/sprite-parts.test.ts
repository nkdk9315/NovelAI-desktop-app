import { describe, expect, it } from "vitest";
import { allCells, cellKey, coordOf, isSkipped } from "../cells";
import { cellPrompt, partVisibleAt } from "../prompt";
import { planCell, type CellState } from "../plan";
import { axisFromPreset } from "../axis-presets";
import { removePart } from "../edit";
import { newAxis, newLevel, newPart, newSpec, newStage } from "../spec";
import { buildEntries } from "../export/entries";

/** Jacket + blouse over underwear; damage 0–2 (underwear shows from 2); a stain axis on the underwear. */
function setup(stainFirst = false) {
  const spec = newSpec("knight");
  const [body] = spec.regions;
  const jacket = newPart("jacket", "navy jacket");
  const blouse = newPart("blouse", "white blouse");
  const under = newPart("underwear", "light blue panties", [jacket.id, blouse.id]);
  spec.outfit.parts = [jacket, blouse, under];
  const d1 = newStage("破損1", "d1");
  d1.states = { [jacket.id]: "torn" };
  const d2 = newStage("破損2", "d2");
  d2.states = { [jacket.id]: "exposed", [blouse.id]: "gone" };
  spec.outfit.stages.push(d1, d2);
  const stain = newAxis("シミ", "stain", "prompt", [newLevel("なし", "s0"), newLevel("シミ", "s1", "stained panties")]);
  stain.regionIds = [body.id];
  stain.partIds = [under.id];
  const wound = newAxis("傷", "wound", "prompt", [newLevel("なし", "w0"), newLevel("傷", "w1", "bruises")]);
  wound.regionIds = [body.id];
  const [damage] = spec.axes;
  spec.axes = stainFirst ? [stain, damage, wound] : [damage, stain, wound];
  const key = (i: Record<string, number>) => cellKey(coordOf(spec, spec.poses[0].id, i));
  return { spec, damage, stain, wound, under, jacket, key };
}

describe("part-attached axes", () => {
  it("write their tags after the part, only while it is visible", () => {
    const { spec, damage, stain } = setup();
    const at = (d: number) => cellPrompt(spec, coordOf(spec, spec.poses[0].id, { [damage.id]: d, [stain.id]: 1 })).positive;
    expect(at(0)).not.toContain("stained");
    expect(at(0)).not.toContain("panties");
    expect(at(2)).toContain("light blue panties visible through tears, stained panties");
  });

  it("follow visibility: covered until a coverer is exposed, never when gone", () => {
    const { spec, under, jacket } = setup();
    const [d0, , d2] = spec.outfit.stages;
    expect(partVisibleAt(spec, d0, under.id)).toBe(false);
    expect(partVisibleAt(spec, d2, under.id)).toBe(true);
    expect(partVisibleAt(spec, d0, jacket.id)).toBe(true);
    d2.states[jacket.id] = "gone";
    expect(partVisibleAt(spec, d2, jacket.id)).toBe(false);
  });

  it("skip the cells where the part is hidden", () => {
    const { spec, damage, stain, key } = setup();
    expect(isSkipped(spec, coordOf(spec, spec.poses[0].id, { [damage.id]: 1, [stain.id]: 1 }))).toBe(true);
    const keys = allCells(spec).map(cellKey);
    expect(keys).toContain(key({ [damage.id]: 2, [stain.id]: 1 }));
    expect(keys).not.toContain(key({ [stain.id]: 1 }));
    // 3 stages × 2 wounds, plus the stain only at stage 2 (× 2 wounds)
    expect(keys).toHaveLength(3 * 2 + 2);
    expect(planCell(spec, key({ [stain.id]: 1 }), () => undefined).blockers).toEqual(["partHidden"]);
  });

  it("derive from a cell that is made, whatever the axis order", () => {
    const { spec, damage, stain, key } = setup(true);
    const adopted = (): CellState => ({ adoptedImageId: "x", excluded: false });
    // Last changed axis would be the damage (parent: stain at stage 1, hidden) → the stain is changed instead
    const plan = planCell(spec, key({ [damage.id]: 2, [stain.id]: 1 }), adopted);
    expect(plan.axis?.id).toBe(stain.id);
    expect(plan.parentKey).toBe(key({ [damage.id]: 2 }));
  });

  it("export the hidden combinations with the image of the look they share", () => {
    const { spec, damage, stain, wound, key } = setup();
    spec.axes = spec.axes.filter((a) => a.id !== wound.id);
    const images: Record<string, string> = { [key({})]: "base", [key({ [damage.id]: 2 })]: "d2", [key({ [damage.id]: 2, [stain.id]: 1 })]: "d2s" };
    const entries = buildEntries(spec, (k) => (images[k] ? { adoptedImageId: images[k], excluded: false } : undefined));
    const byId = Object.fromEntries(entries.map((e) => [e.id, e.imageId]));
    expect(byId["idle/d0/s0"]).toBe("base");
    expect(byId["idle/d0/s1"]).toBe("base");
    expect(byId["idle/d2/s1"]).toBe("d2s");
  });

  it("are removed from axes with their part", () => {
    const { spec, under, stain } = setup();
    expect(removePart(spec, under.id).axes.find((a) => a.id === stain.id)?.partIds).toEqual([]);
  });
});

describe("axis presets", () => {
  it("attach underwear presets to worn-under parts and clothes presets to the others", () => {
    const { spec, under, jacket } = setup();
    expect(axisFromPreset(spec, "underwearStain")?.partIds).toEqual([under.id]);
    expect(axisFromPreset(spec, "wet")?.partIds).toContain(jacket.id);
    const face = axisFromPreset(spec, "blush")!;
    expect(face.partIds).toEqual([]);
    expect(face.regionIds).toEqual([spec.regions.find((r) => r.key === "face")!.id]);
    expect(face.composite).toBe(true);
  });

  it("gets a unique key", () => {
    const { spec } = setup();
    spec.axes.push(axisFromPreset(spec, "sweat")!);
    expect(axisFromPreset(spec, "sweat")?.key).toBe("sweat_2");
  });
});
