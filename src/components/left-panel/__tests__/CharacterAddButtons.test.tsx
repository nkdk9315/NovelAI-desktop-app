import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CharacterAddButtons from "../CharacterAddButtons";
import { useGenerationParamsStore } from "@/stores/generation-params-store";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

vi.mock("@/lib/ipc", () => ({
  listGenres: vi.fn().mockResolvedValue([
    { id: "genre-male", name: "Male", isSystem: true, sortOrder: 0, createdAt: "", icon: "user-round", color: "#3b82f6" },
    { id: "genre-female", name: "Female", isSystem: true, sortOrder: 1, createdAt: "", icon: "user-round", color: "#ef4444" },
    { id: "genre-other", name: "Other", isSystem: true, sortOrder: 2, createdAt: "", icon: "circle-help", color: "#888888" },
  ]),
  listPromptGroups: vi.fn().mockResolvedValue([]),
}));

beforeEach(() => {
  useGenerationParamsStore.setState({ characters: [] });
});

describe("CharacterAddButtons", () => {
  it("renders genre buttons", () => {
    render(<CharacterAddButtons />);
    expect(screen.getByText("character.add")).toBeInTheDocument();
    expect(screen.getByText("character.other")).toBeInTheDocument();
  });

  it("buttons are disabled at max characters", () => {
    useGenerationParamsStore.setState({
      characters: Array.from({ length: 6 }, (_, i) => ({
        id: `test-id-${i}`,
        prompt: "",
        negativePrompt: "",
        centerX: 0.5,
        centerY: 0.5,
        genreName: "Male",
        genreId: "genre-male",
        genreIcon: "user-round",
        genreColor: "#3b82f6",
      })),
    });
    render(<CharacterAddButtons />);
    // Male, Female, Other buttons should be disabled (genre create button is not)
    const maleBtn = screen.getAllByRole("button").find((b) => b.textContent?.includes("Male"));
    const otherBtn = screen.getAllByRole("button").find((b) => b.textContent?.includes("character.other"));
    expect(maleBtn).toBeDisabled();
    expect(otherBtn).toBeDisabled();
  });
});
