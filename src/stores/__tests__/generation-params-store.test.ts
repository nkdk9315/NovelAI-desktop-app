import { describe, it, expect, beforeEach } from "vitest";
import { useGenerationParamsStore } from "../generation-params-store";

beforeEach(() => {
  useGenerationParamsStore.setState({ characters: [] });
});

describe("characters CRUD", () => {
  it("addCharacter adds with defaults and genreName", () => {
    useGenerationParamsStore.getState().addCharacter("Female");
    const chars = useGenerationParamsStore.getState().characters;
    expect(chars).toHaveLength(1);
    expect(chars[0]).toEqual({
      prompt: "",
      negativePrompt: "",
      centerX: 0.5,
      centerY: 0.5,
      genreName: "Female",
    });
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
