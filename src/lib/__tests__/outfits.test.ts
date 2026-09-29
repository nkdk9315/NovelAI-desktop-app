import { describe, it, expect } from "vitest";
import { joinPrompt, plainTags, resolveOutfit, withoutTags } from "@/lib/outfits";

describe("outfits", () => {
  const outfits = [{ id: "a" }, { id: "b" }];

  it("resolves an appearance's outfit choice", () => {
    expect(resolveOutfit(undefined, outfits, "a")).toBe("a");
    expect(resolveOutfit("default", outfits, null)).toBeNull();
    expect(resolveOutfit("b", outfits, "a")).toBe("b");
    expect(resolveOutfit("none", outfits, "a")).toBeNull();
    expect(resolveOutfit("gone", outfits, "a")).toBeNull();
  });

  it("offers only plain tags for switching off", () => {
    expect(plainTags("girl, long hair, 1.2::red eyes::, {smile}, long hair,  ")).toEqual(["girl", "long hair"]);
  });

  it("removes switched-off tags and joins prompt parts", () => {
    expect(withoutTags("girl, long hair, blue eyes", ["long hair"])).toBe("girl, blue eyes");
    expect(withoutTags("girl, long hair", [])).toBe("girl, long hair");
    expect(joinPrompt("girl,", "", undefined, " panel 1 ")).toBe("girl, panel 1");
  });
});
