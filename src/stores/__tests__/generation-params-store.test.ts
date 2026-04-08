import { describe, it, expect, beforeEach } from "vitest";
import { useGenerationParamsStore } from "../generation-params-store";

beforeEach(() => {
  useGenerationParamsStore.setState({
    characters: [],
    selectedVibes: [],
    artistTags: [],
    selectedStylePresetId: null,
  });
});

describe("characters CRUD", () => {
  it("addCharacter adds with defaults and genreName", () => {
    useGenerationParamsStore.getState().addCharacter("Female");
    const chars = useGenerationParamsStore.getState().characters;
    expect(chars).toHaveLength(1);
    expect(chars[0]).toMatchObject({
      prompt: "",
      negativePrompt: "",
      centerX: 0.5,
      centerY: 0.5,
      genreName: "Female",
    });
    expect(chars[0].id).toBeDefined();
  });

  it("addCharacter respects MAX_CHARACTERS limit", () => {
    const { addCharacter } = useGenerationParamsStore.getState();
    for (let i = 0; i < 7; i++) {
      addCharacter("Male");
    }
    expect(useGenerationParamsStore.getState().characters).toHaveLength(6);
  });

  it("removeCharacter removes by index", () => {
    const { addCharacter } = useGenerationParamsStore.getState();
    addCharacter("Male");
    addCharacter("Female");
    useGenerationParamsStore.getState().removeCharacter(0);
    const chars = useGenerationParamsStore.getState().characters;
    expect(chars).toHaveLength(1);
    expect(chars[0].genreName).toBe("Female");
  });

  it("updateCharacter applies partial update", () => {
    useGenerationParamsStore.getState().addCharacter("Other");
    useGenerationParamsStore
      .getState()
      .updateCharacter(0, { prompt: "hello", centerX: 0.3 });
    const c = useGenerationParamsStore.getState().characters[0];
    expect(c.prompt).toBe("hello");
    expect(c.centerX).toBe(0.3);
    expect(c.centerY).toBe(0.5);
    expect(c.genreName).toBe("Other");
  });

  it("clearCharacters removes all", () => {
    const { addCharacter } = useGenerationParamsStore.getState();
    addCharacter("Male");
    addCharacter("Female");
    useGenerationParamsStore.getState().clearCharacters();
    expect(useGenerationParamsStore.getState().characters).toHaveLength(0);
  });
});

describe("vibes CRUD", () => {
  it("addVibe adds with defaults", () => {
    useGenerationParamsStore.getState().addVibe("vibe-1");
    const vibes = useGenerationParamsStore.getState().selectedVibes;
    expect(vibes).toHaveLength(1);
    expect(vibes[0]).toMatchObject({
      vibeId: "vibe-1",
      strength: 0.7,
      infoExtracted: 0.7,
      enabled: true,
    });
  });

  it("addVibe prevents duplicates", () => {
    const { addVibe } = useGenerationParamsStore.getState();
    addVibe("vibe-1");
    useGenerationParamsStore.getState().addVibe("vibe-1");
    expect(useGenerationParamsStore.getState().selectedVibes).toHaveLength(1);
  });

  it("addVibe respects MAX_VIBES limit", () => {
    for (let i = 0; i < 12; i++) {
      useGenerationParamsStore.getState().addVibe(`vibe-${i}`);
    }
    expect(useGenerationParamsStore.getState().selectedVibes).toHaveLength(10);
  });

  it("removeVibe removes by vibeId", () => {
    const s = useGenerationParamsStore.getState();
    s.addVibe("vibe-1");
    useGenerationParamsStore.getState().addVibe("vibe-2");
    useGenerationParamsStore.getState().removeVibe("vibe-1");
    const vibes = useGenerationParamsStore.getState().selectedVibes;
    expect(vibes).toHaveLength(1);
    expect(vibes[0].vibeId).toBe("vibe-2");
  });

  it("toggleVibe toggles enabled", () => {
    useGenerationParamsStore.getState().addVibe("vibe-1");
    useGenerationParamsStore.getState().toggleVibe("vibe-1");
    expect(useGenerationParamsStore.getState().selectedVibes[0].enabled).toBe(false);
    useGenerationParamsStore.getState().toggleVibe("vibe-1");
    expect(useGenerationParamsStore.getState().selectedVibes[0].enabled).toBe(true);
  });

  it("updateVibeStrength updates strength", () => {
    useGenerationParamsStore.getState().addVibe("vibe-1");
    useGenerationParamsStore.getState().updateVibeStrength("vibe-1", 0.5);
    expect(useGenerationParamsStore.getState().selectedVibes[0].strength).toBe(0.5);
  });

  it("updateVibeInfoExtracted updates infoExtracted", () => {
    useGenerationParamsStore.getState().addVibe("vibe-1");
    useGenerationParamsStore.getState().updateVibeInfoExtracted("vibe-1", 0.3);
    expect(useGenerationParamsStore.getState().selectedVibes[0].infoExtracted).toBe(0.3);
  });
});

describe("style preset", () => {
  it("applyStylePreset sets artistTags and selectedVibes", () => {
    const preset = {
      id: "preset-1",
      name: "My Preset",
      artistTags: ["artist_a", "artist_b"],
      vibeIds: ["vibe-1", "vibe-2"],
      createdAt: "2026-01-01",
    };
    const vibes = [
      { id: "vibe-1", name: "V1", filePath: "/a", model: "m", createdAt: "2026-01-01" },
      { id: "vibe-2", name: "V2", filePath: "/b", model: "m", createdAt: "2026-01-01" },
      { id: "vibe-3", name: "V3", filePath: "/c", model: "m", createdAt: "2026-01-01" },
    ];
    useGenerationParamsStore.getState().applyStylePreset(preset, vibes);
    const state = useGenerationParamsStore.getState();
    expect(state.selectedStylePresetId).toBe("preset-1");
    expect(state.artistTags).toEqual(["artist_a", "artist_b"]);
    expect(state.selectedVibes).toHaveLength(2);
    expect(state.selectedVibes.map((v) => v.vibeId)).toEqual(["vibe-1", "vibe-2"]);
  });

  it("clearStylePreset resets all preset state", () => {
    useGenerationParamsStore.getState().addVibe("vibe-1");
    useGenerationParamsStore.getState().setArtistTags(["x"]);
    useGenerationParamsStore.getState().setStylePreset("preset-1");
    useGenerationParamsStore.getState().clearStylePreset();
    const state = useGenerationParamsStore.getState();
    expect(state.selectedStylePresetId).toBeNull();
    expect(state.artistTags).toEqual([]);
    expect(state.selectedVibes).toEqual([]);
  });
});
