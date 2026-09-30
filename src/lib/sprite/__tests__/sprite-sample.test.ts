import { describe, expect, it } from "vitest";
import { allCells, cellKey, coordOf } from "../cells";
import { cellPrompt } from "../prompt";
import { SAMPLE_SECTIONS, sampleSpec } from "../sample";

describe("sample set", () => {
  it("lists bundled images for every section", () => {
    for (const s of SAMPLE_SECTIONS) {
      expect(s.images.length).toBeGreaterThan(0);
      for (const img of s.images) expect(img.src).toBeTruthy();
    }
  });

  it("starts a set with the sample's definition", () => {
    const spec = sampleSpec();
    expect(spec.poses.map((p) => p.key)).toEqual(["stand", "point"]);
    // 2 poses × 3 damage stages × 6 expressions × 2 wounds × 2 blood
    expect(allCells(spec)).toHaveLength(2 * 3 * 6 * 2 * 2);
    const [damage, face, , blood] = spec.axes;
    const d2 = cellPrompt(spec, coordOf(spec, spec.poses[0].id, { [damage.id]: 2, [face.id]: 2, [blood.id]: 1 })).positive;
    expect(d2).toContain("heavily torn navy blue blazer with gold buttons, missing sleeve, blood on clothes");
    expect(d2).toContain("loose red necktie");
    expect(d2).toContain("angry, frown, clenched teeth");
    expect(cellKey(allCells(spec)[0])).toBe(spec.poses[0].id);
  });
});
