import { describe, it, expect } from "vitest";
import { extractArtistTags } from "@/lib/artist-extract";

const names = (p: string) => extractArtistTags(p).artistTags.map((a) => [a.name, a.strength]);

describe("extractArtistTags", () => {
  it("reads weights in every syntax", () => {
    expect(names("0.3::artist:sincos::, 1girl")).toEqual([["sincos", 0.3]]);
    expect(names("0.3::artist#sincos::")).toEqual([["sincos", 0.3]]);
    expect(names("{0.33::artist:jj.jj ::}, {0.33::artist:2equal8 ::}")).toEqual([["jj.jj", 0.33], ["2equal8", 0.33]]);
    expect(names("artist:plain, {{artist:up}}, [artist:down]")).toEqual([["plain", 0], ["up", 1.1], ["down", 0.95]]);
    expect(names("1.5::artist:a, artist:b, smile::")).toEqual([["a", 1.5], ["b", 1.5]]);
    expect(names("2::{artist:nested}::")).toEqual([["nested", 2.1]]);
  });

  it("reads artist# groups up to the end of their block", () => {
    const prompt = "tachi-e, cowboy shot, 0.8::artist#ei (eiei e1), 2equal8, ::,  rakugaki, smile";
    expect(names(prompt)).toEqual([["ei (eiei e1)", 0.8], ["2equal8", 0.8]]);
    expect(extractArtistTags(prompt).text).toBe("tachi-e, cowboy shot, rakugaki, smile");
    // Only the chosen member is removed; the group marker stays with the rest
    expect(extractArtistTags(prompt, (n) => n === "2equal8").text)
      .toBe("tachi-e, cowboy shot, 0.8::artist#ei (eiei e1)::, rakugaki, smile");
    expect(extractArtistTags(prompt, (n) => n === "ei (eiei e1)").text)
      .toBe("tachi-e, cowboy shot, 0.8::artist#2equal8 ::, rakugaki, smile");
    // Outside a block artist# is a single tag
    expect(names("artist#solo, 1girl")).toEqual([["solo", 0]]);
  });

  it("removes artists and cleans up empty blocks", () => {
    expect(extractArtistTags("0.3::artist:sincos::, 1girl, smile").text).toBe("1girl, smile");
    expect(extractArtistTags("{0.33::artist:x ::}, 1girl").text).toBe("1girl");
    expect(extractArtistTags("1.5::artist:a, smile::, 1girl").text).toBe("1.5::smile::, 1girl");
    expect(extractArtistTags("1girl, {artist:a}, [artist:b], blush").text).toBe("1girl, blush");
  });

  it("keeps artists the caller does not remove", () => {
    const r = extractArtistTags("artist:a, artist:b, 1girl", (n) => n === "a");
    expect(r.text).toBe("artist:b, 1girl");
    expect(r.artistTags.map((a) => a.name)).toEqual(["a", "b"]);
  });

  it("does not treat numbers inside words as weights", () => {
    expect(extractArtistTags("1girl, 2boys").text).toBe("1girl, 2boys");
    expect(names("1girl, 2boys")).toEqual([]);
  });

  it("never glues a name ending in a digit to a close", () => {
    expect(extractArtistTags("1.2::artist:a, 2equal8, ::, smile").text).toBe("1.2::2equal8 ::, smile");
  });

  it("keeps line breaks", () => {
    expect(extractArtistTags("artist:a,\n1girl,\nsmile").text).toBe("1girl,\nsmile");
    expect(extractArtistTags("a,\nartist:b,\nc").text).toBe("a,\nc");
  });
});
