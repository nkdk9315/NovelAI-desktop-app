import { describe, expect, it } from "vitest";
import { applyNameTemplate, buildEntries } from "../export/entries";
import { previewTexts } from "../export/plan";
import { TARGETS } from "../export/types";
import { cellKey, coordOf } from "../cells";
import { builtinTemplate } from "../templates";
import type { SpriteSpec } from "../spec";

function adoptedSpec(): { spec: SpriteSpec; adopted: Set<string> } {
  const spec = builtinTemplate("novel");
  const pose = spec.poses[0];
  const [clothes, face] = spec.axes;
  const keys = [
    cellKey(coordOf(spec, pose.id, {})),
    cellKey(coordOf(spec, pose.id, { [face.id]: 1 })),
    cellKey(coordOf(spec, pose.id, { [clothes.id]: 2, [face.id]: 4 })),
  ];
  return { spec, adopted: new Set(keys) };
}

const lookup = (adopted: Set<string>) => (key: string) =>
  adopted.has(key) ? { adoptedImageId: `img-${key}`, excluded: false } : undefined;

describe("export entries", () => {
  it("names files from the template and marks bases", () => {
    const { spec, adopted } = adoptedSpec();
    const entries = buildEntries(spec, lookup(adopted));
    expect(entries.map((e) => e.name)).toEqual([
      "heroine_front_base_normal", "heroine_front_base_smile", "heroine_front_swim_surprised",
    ]);
    expect(entries[0].isBase).toBe(true);
    expect(entries[2].baseName).toBe("heroine_front_base_normal");
    expect(entries[2].id).toBe("front/swim/surprised");
    expect(entries[2].levels).toEqual({ outfit: "swim", face: "surprised" });
  });

  it("sanitizes names and falls back when empty", () => {
    expect(applyNameTemplate("{char} {pose}/{x}", { char: "a b", pose: "c" }, 0)).toBe("a_b_c");
    expect(applyNameTemplate("{nope}", {}, 4)).toBe("sprite_5");
    expect(applyNameTemplate("{char}_{index}", { char: "h" }, 1)).toBe("h_002");
  });

  it("de-duplicates equal names", () => {
    const { spec, adopted } = adoptedSpec();
    spec.export.nameTemplate = "{char}";
    expect(buildEntries(spec, lookup(adopted)).map((e) => e.name)).toEqual(["heroine", "heroine_2", "heroine_3"]);
  });

  it("every target writes its files and references every sprite", () => {
    const { spec, adopted } = adoptedSpec();
    const entries = buildEntries(spec, lookup(adopted));
    for (const { id } of TARGETS) {
      spec.export.target = id;
      spec.export.layers = true;
      const out = previewTexts(spec, entries);
      const all = out.texts.map((t) => t.content).join("\n");
      expect(out.texts.length, id).toBeGreaterThan(0);
      for (const e of entries) expect(all.includes(e.name), `${id} mentions ${e.name}`).toBe(true);
      if (!out.atlas) expect(out.images).toHaveLength(entries.length);
      for (const p of [...out.images.map((i) => i.relPath), ...out.texts.map((t) => t.relPath)]) {
        expect(p.includes("..") || p.startsWith("/"), p).toBe(false);
      }
    }
  });

  it("the RPG Maker plugin is valid JavaScript", () => {
    const { spec, adopted } = adoptedSpec();
    const entries = buildEntries(spec, lookup(adopted));
    for (const target of ["rpgmaker-mz", "rpgmaker-mv"] as const) {
      spec.export.target = target;
      const plugin = previewTexts(spec, entries).texts[0].content;
      expect(() => new Function(plugin)).not.toThrow();
    }
  });
});
