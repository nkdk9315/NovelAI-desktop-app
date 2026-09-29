import { describe, it, expect } from "vitest";
import { castCountTags, castHandle, composeMangaPage, type MangaCharacterInput } from "@/lib/manga-compose";
import { castCenters, MANGA_LAYOUTS, MANGA_LAYOUT_IDS } from "@/lib/manga-layouts";
import { fitPanels, newMangaPage, withCustomLayout, type MangaPage } from "@/lib/manga-page";
import { rectShape, splitShape } from "@/lib/manga-geometry";

const A: MangaCharacterInput = { id: "a", genreId: "genre-female", prompt: "girl, blonde hair, twintails, school uniform", negativePrompt: "" };
const B: MangaCharacterInput = { id: "b", genreId: "genre-female", prompt: "girl, black hair, long hair", negativePrompt: "hat" };

function page(): MangaPage {
  const p = { ...newMangaPage(true), layoutId: "three" as const, colorMode: "color" as const };
  p.panels = fitPanels([], "three");
  p.panels[0].scene = "in a classroom";
  p.panels[0].cast = [{
    id: "c1", characterId: "a", action: "running into the room",
    dialogue: [{ id: "d1", text: "遅刻しちゃう！", style: "shout" }], sfx: [], effects: [],
  }];
  p.panels[1].cast = [
    { id: "c2", characterId: "b", action: "reading a book", dialogue: [], sfx: [], effects: ["sweat"] },
    { id: "c3", characterId: "gone", action: "", dialogue: [], sfx: [], effects: [] },
  ];
  p.panels[2].text = [{ id: "n1", text: "その後", style: "narration" }];
  return p;
}

describe("composeMangaPage", () => {
  it("describes the page and each panel in the main prompt", () => {
    const { main } = composeMangaPage(page(), "artist:x", [A, B]);
    expect(main).toBe(
      "artist:x, comic, manga, full color, black panel borders, multiple panels, 2girls. "
      + "A manga page with a wide panel across the top and two panels side by side at the bottom, read from right to left. "
      + "Panel 1 (top): in a classroom; a girl with blonde hair, twintails is running into the room. "
      + "Panel 2 (bottom right): a girl with black hair, long hair is reading a book. "
      + "Panel 3 (bottom left)., "
      + '"その後" in a rectangular narration caption box in panel 3, Text: その後',
    );
  });

  it("gives each appearance its own character prompt at the panel's center, skipping deleted characters", () => {
    const { characters } = composeMangaPage(page(), "", [A, B]);
    expect(characters).toEqual([
      {
        characterId: "a", panel: 1,
        prompt: "girl, blonde hair, twintails, school uniform, panel 1, running into the room, speech bubble, shouting, "
          + '"遅刻しちゃう！" in a large spiky jagged speech bubble, shouting, Text: 遅刻しちゃう！',
        centerX: 0.5, centerY: 0.225, negativePrompt: "",
      },
      { characterId: "b", panel: 2, prompt: "girl, black hair, long hair, panel 2, reading a book, sweatdrop", centerX: 0.75, centerY: 0.725, negativePrompt: "hat" },
    ]);
  });

  it("uses monochrome tags and works without any cast", () => {
    const empty = { ...newMangaPage(true) };
    expect(composeMangaPage(empty, "", []).main).toBe(
      "comic, manga, monochrome, greyscale, screentone, black panel borders, 4koma, four stacked panels. "
      + "A vertical 4koma comic strip with four equal panels stacked from top to bottom. "
      + "Panel 1 (top). Panel 2 (second). Panel 3 (third). Panel 4 (bottom).",
    );
  });
});

describe("manga helpers", () => {
  it("counts distinct characters by genre", () => {
    expect(castCountTags([A, B, { ...A, id: "m", genreId: "genre-male" }, { ...A, id: "o", genreId: "genre-other" }]))
      .toEqual(["2girls", "1boy", "1other"]);
  });

  it("builds a short handle from the character's first tags", () => {
    expect(castHandle("boy, 1.2::red hair::, glasses")).toBe("a boy with glasses");
    expect(castHandle("")).toBe("a character");
  });

  it("spreads characters across a panel", () => {
    expect(castCenters({ x0: 0, y0: 0, x1: 1, y1: 0.5 }, 2)).toEqual([{ x: 0.333, y: 0.25 }, { x: 0.667, y: 0.25 }]);
  });

  it("keeps panel contents when the layout changes", () => {
    const p = page();
    const fitted = fitPanels(p.panels, "koma4");
    expect(fitted).toHaveLength(4);
    expect(fitted[0]).toMatchObject({ id: p.panels[0].id, cast: p.panels[0].cast });
    expect(fitPanels(p.panels, "two")).toHaveLength(2);
  });

  it("lists panels in reading order inside the page", () => {
    for (const id of MANGA_LAYOUT_IDS) {
      for (const { rect } of MANGA_LAYOUTS[id].panels) {
        expect(rect.x0).toBeGreaterThanOrEqual(0);
        expect(rect.y1).toBeLessThanOrEqual(1);
      }
      expect(MANGA_LAYOUTS[id].width * MANGA_LAYOUTS[id].height).toBeLessThanOrEqual(1024 * 1024);
    }
  });
});

describe("per-panel look and custom layouts", () => {
  const withOutfits: MangaCharacterInput = {
    ...A,
    prompt: "girl, blonde hair, twintails, long hair",
    outfits: [
      { id: "uni", prompt: "school uniform", negativePrompt: "" },
      { id: "swim", prompt: "white bikini", negativePrompt: "coat" },
    ],
    outfitId: "uni",
  };

  function onePanel(cast: Partial<MangaPage["panels"][number]["cast"][number]>): MangaPage {
    const p = { ...newMangaPage(true), layoutId: "two" as const, colorMode: "color" as const };
    p.panels = fitPanels([], "two");
    p.panels[0].cast = [{ id: "c1", characterId: "a", dialogue: [], sfx: [], effects: [], ...cast }];
    return p;
  }

  it("uses the card's outfit by default, another one or none per panel, and drops switched-off tags", () => {
    const prompt = (cast: Parameters<typeof onePanel>[0]) => composeMangaPage(onePanel(cast), "", [withOutfits]).characters[0];
    expect(prompt({}).prompt).toBe("girl, blonde hair, twintails, long hair, school uniform, panel 1");
    expect(prompt({ outfitId: "swim" })).toMatchObject({
      prompt: "girl, blonde hair, twintails, long hair, white bikini, panel 1", negativePrompt: "coat",
    });
    expect(prompt({ outfitId: "none", excludeTags: ["long hair"] }).prompt).toBe("girl, blonde hair, twintails, panel 1");
  });

  it("takes the action and scene from their prompt targets, falling back to legacy text", () => {
    const page = onePanel({ action: "old text" });
    const texts = { [`manga-cast:c1`]: { positive: "running, smile", negative: "frown" }, [`manga-scene:${page.panels[0].id}`]: { positive: "beach", negative: "" } };
    const out = composeMangaPage(page, "", [withOutfits], [], texts);
    expect(out.characters[0]).toMatchObject({ prompt: expect.stringContaining("panel 1, running, smile"), negativePrompt: "frown" });
    expect(out.main).toContain("Panel 1 (top): beach; a girl with blonde hair, twintails is running, smile.");
    expect(composeMangaPage(page, "", [withOutfits]).characters[0].prompt).toContain("panel 1, old text");
  });

  it("describes a custom layout from its shapes and sends slanted borders as a template", () => {
    const rects = [rectShape(0, 0, 1, 0.5), rectShape(0.5, 0.5, 1, 1), rectShape(0, 0.5, 0.5, 1)];
    const custom = withCustomLayout(newMangaPage(true), rects, "portrait");
    const out = composeMangaPage(custom, "", []);
    expect(out.main).toContain("multiple panels");
    expect(out.main).toContain("A manga page with 3 panels, read from right to left. Panel 1 (top, large). Panel 2 (bottom right). Panel 3 (bottom left).");
    expect(out.template).toBeNull();

    const slanted = withCustomLayout(newMangaPage(true), splitShape(rectShape(0, 0, 1, 1), { x: 0, y: 0.6 }, { x: 1, y: 0.4 })!, "portrait");
    const s = composeMangaPage(slanted, "", []);
    expect(s.main).toContain("A manga page with 2 panels separated by diagonal borders.");
    expect(s.template).toMatchObject({ width: 832, height: 1216 });
    expect(s.template!.shapes).toHaveLength(2);
  });

  it("keeps panel contents in reading order when switching to a custom layout", () => {
    const p = page();
    const custom = withCustomLayout(p, [rectShape(0, 0.5, 1, 1), rectShape(0, 0, 1, 0.5)], "square");
    expect(custom.panels.map((x) => x.id)).toEqual([p.panels[0].id, p.panels[1].id]);
    expect(custom.panels[0].shape![0]).toEqual({ x: 0, y: 0 });
    expect(custom.aspect).toBe("square");
  });
});
