import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CharacterAddButtons from "../CharacterAddButtons";
import { useGenerationParamsStore } from "@/stores/generation-params-store";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

beforeEach(() => {
  useGenerationParamsStore.setState({ characters: [] });
});

describe("CharacterAddButtons", () => {
  it("renders three genre buttons", () => {
    render(<CharacterAddButtons />);
    expect(screen.getByText("character.male")).toBeInTheDocument();
    expect(screen.getByText("character.female")).toBeInTheDocument();
    expect(screen.getByText("character.other")).toBeInTheDocument();
  });

  it("clicking button adds character to store", () => {
    render(<CharacterAddButtons />);
    fireEvent.click(screen.getByText("character.female"));
    const chars = useGenerationParamsStore.getState().characters;
    expect(chars).toHaveLength(1);
    expect(chars[0].genreName).toBe("Female");
  });

  it("buttons are disabled at max characters", () => {
    useGenerationParamsStore.setState({
      characters: Array.from({ length: 6 }, () => ({
        prompt: "",
        negativePrompt: "",
        centerX: 0.5,
        centerY: 0.5,
        genreName: "Male",
      })),
    });
    render(<CharacterAddButtons />);
    const buttons = screen.getAllByRole("button");
    buttons.forEach((btn) => expect(btn).toBeDisabled());
  });
});
