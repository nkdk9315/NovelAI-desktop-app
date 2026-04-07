import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CharacterSection from "../CharacterSection";
import { useGenerationParamsStore } from "@/stores/generation-params-store";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

const defaultCharacter = {
  id: "test-char-id",
  prompt: "",
  negativePrompt: "",
  centerX: 0.5,
  centerY: 0.5,
  genreName: "Female",
};

beforeEach(() => {
  useGenerationParamsStore.setState({
    characters: [defaultCharacter],
  });
});

describe("CharacterSection", () => {
  it("displays genre name in header", () => {
    render(<CharacterSection index={0} />);
    expect(screen.getByText("character.label")).toBeInTheDocument();
  });

  it("updates prompt via store", () => {
    render(<CharacterSection index={0} />);
    const textarea = screen.getByPlaceholderText("generation.prompt");
    fireEvent.change(textarea, { target: { value: "test prompt" } });
    expect(
      useGenerationParamsStore.getState().characters[0].prompt,
    ).toBe("test prompt");
  });

  it("shows position sliders", () => {
    render(<CharacterSection index={0} />);
    const sliders = screen.getAllByRole("slider");
    expect(sliders.length).toBeGreaterThanOrEqual(2);
  });

  it("removes character on delete button click", () => {
    render(<CharacterSection index={0} />);
    const deleteBtn = screen.getByLabelText(/common.delete/);
    fireEvent.click(deleteBtn);
    expect(useGenerationParamsStore.getState().characters).toHaveLength(0);
  });

  it("toggles negative prompt section", () => {
    render(<CharacterSection index={0} />);
    const toggle = screen.getByText("generation.negativePrompt");
    fireEvent.click(toggle);
    const negTextareas = screen.getAllByRole("textbox");
    expect(negTextareas.length).toBe(2);
  });
});
