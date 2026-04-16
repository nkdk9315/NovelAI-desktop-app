import { describe, it, expect, beforeEach } from "vitest";
import { useGenerationParamsStore } from "../generation-params-store";

beforeEach(() => {
  useGenerationParamsStore.setState({
    characters: [],
    sidebarPresets: [],
  });
});

describe("characters CRUD", () => {
  it("addCharacter adds with defaults and genreName", () => {
    useGenerationParamsStore.getState().addCharacter({ name: "Female", id: "genre-female", icon: "user-round", color: "#ef4444" });
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
      addCharacter({ name: "Male", id: "genre-male", icon: "user-round", color: "#3b82f6" });
    }
    expect(useGenerationParamsStore.getState().characters).toHaveLength(6);
  });

  it("removeCharacter removes by index", () => {
    const { addCharacter } = useGenerationParamsStore.getState();
    addCharacter({ name: "Male", id: "genre-male", icon: "user-round", color: "#3b82f6" });
    addCharacter({ name: "Female", id: "genre-female", icon: "user-round", color: "#ef4444" });
    useGenerationParamsStore.getState().removeCharacter(0);
    const chars = useGenerationParamsStore.getState().characters;
    expect(chars).toHaveLength(1);
    expect(chars[0].genreName).toBe("Female");
  });

  it("updateCharacter applies partial update", () => {
    useGenerationParamsStore.getState().addCharacter({ name: "Other", id: "genre-other", icon: "circle-help", color: "#888888" });
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
    addCharacter({ name: "Male", id: "genre-male", icon: "user-round", color: "#3b82f6" });
    addCharacter({ name: "Female", id: "genre-female", icon: "user-round", color: "#ef4444" });
    useGenerationParamsStore.getState().clearCharacters();
    expect(useGenerationParamsStore.getState().characters).toHaveLength(0);
  });
});

describe("sidebar presets", () => {
  const mockPreset = {
    id: "preset-1",
    name: "My Preset",
    artistTags: [{ name: "artist_a", strength: 0 }, { name: "artist_b", strength: 0 }],
    vibeRefs: [{ vibeId: "vibe-1", strength: 0.8 }, { vibeId: "vibe-2", strength: 0.5 }],
    createdAt: "2026-01-01",
    thumbnailPath: null,
    isFavorite: false,
    model: "nai-diffusion-4-5-full",
    folderId: null,
  };
  const mockVibes = [
    { id: "vibe-1", name: "V1", filePath: "/a", model: "m", createdAt: "2026-01-01", thumbnailPath: null, isFavorite: false, folderId: null },
    { id: "vibe-2", name: "V2", filePath: "/b", model: "m", createdAt: "2026-01-01", thumbnailPath: null, isFavorite: false, folderId: null },
  ];

  it("addSidebarPreset adds preset with artist tags and vibes", () => {
    useGenerationParamsStore.getState().addSidebarPreset(mockPreset, mockVibes);
    const presets = useGenerationParamsStore.getState().sidebarPresets;
    expect(presets).toHaveLength(1);
    expect(presets[0].id).toBe("preset-1");
    expect(presets[0].enabled).toBe(true);
    expect(presets[0].artistTags).toHaveLength(2);
    expect(presets[0].selectedVibes).toHaveLength(2);
  });

  it("addSidebarPreset prevents duplicates", () => {
    useGenerationParamsStore.getState().addSidebarPreset(mockPreset, mockVibes);
    useGenerationParamsStore.getState().addSidebarPreset(mockPreset, mockVibes);
    expect(useGenerationParamsStore.getState().sidebarPresets).toHaveLength(1);
  });

  it("removeSidebarPreset removes by id", () => {
    useGenerationParamsStore.getState().addSidebarPreset(mockPreset, mockVibes);
    useGenerationParamsStore.getState().removeSidebarPreset("preset-1");
    expect(useGenerationParamsStore.getState().sidebarPresets).toHaveLength(0);
  });

  it("toggleSidebarPreset toggles enabled", () => {
    useGenerationParamsStore.getState().addSidebarPreset(mockPreset, mockVibes);
    useGenerationParamsStore.getState().toggleSidebarPreset("preset-1");
    expect(useGenerationParamsStore.getState().sidebarPresets[0].enabled).toBe(false);
    useGenerationParamsStore.getState().toggleSidebarPreset("preset-1");
    expect(useGenerationParamsStore.getState().sidebarPresets[0].enabled).toBe(true);
  });

  it("updatePresetArtistTags updates tags for specific preset", () => {
    useGenerationParamsStore.getState().addSidebarPreset(mockPreset, mockVibes);
    useGenerationParamsStore.getState().updatePresetArtistTags("preset-1", [{ name: "new_artist", strength: 1.5 }]);
    const tags = useGenerationParamsStore.getState().sidebarPresets[0].artistTags;
    expect(tags).toHaveLength(1);
    expect(tags[0].name).toBe("new_artist");
  });

  it("state persists across toggle", () => {
    useGenerationParamsStore.getState().addSidebarPreset(mockPreset, mockVibes);
    useGenerationParamsStore.getState().updatePresetArtistTags("preset-1", [{ name: "tweaked", strength: 2 }]);
    // Toggle off and on
    useGenerationParamsStore.getState().toggleSidebarPreset("preset-1");
    useGenerationParamsStore.getState().toggleSidebarPreset("preset-1");
    // Tweaked state should persist
    const tags = useGenerationParamsStore.getState().sidebarPresets[0].artistTags;
    expect(tags[0].name).toBe("tweaked");
    expect(tags[0].strength).toBe(2);
  });
});
