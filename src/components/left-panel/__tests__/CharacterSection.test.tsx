import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CharacterSection from "../CharacterSection";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

vi.mock("@/lib/ipc", () => ({
  listGenres: vi.fn().mockResolvedValue([]),
  listPromptGroups: vi.fn().mockResolvedValue([]),
}));

const defaultCharacter = {
  id: "test-char-id",
  prompt: "",
  negativePrompt: "",
  centerX: 0.5,
  centerY: 0.5,
  genreName: "Female",
  genreId: "genre-female",
  genreIcon: "user-round",
  genreColor: "#ef4444",
};

beforeEach(() => {
  useGenerationParamsStore.setState({
    characters: [defaultCharacter],
  });
  useSidebarPromptStore.setState({ targets: {} });
  useSidebarPromptStore.getState().initTarget("test-char-id");
});

describe("CharacterSection", () => {
  it("displays genre name in header", () => {
    render(<CharacterSection index={0} />);
    expect(screen.getByText("character.label")).toBeInTheDocument();
  });

  it("shows position editor", () => {
    render(<CharacterSection index={0} />);
    expect(screen.getByText(/character\.position/)).toBeInTheDocument();
  });

  it("removes character and sidebar target on delete", () => {
    render(<CharacterSection index={0} />);
    const deleteBtn = screen.getByLabelText(/common.delete/);
    fireEvent.click(deleteBtn);
    expect(useGenerationParamsStore.getState().characters).toHaveLength(0);
    expect(useSidebarPromptStore.getState().targets["test-char-id"]).toBeUndefined();
  });

  it("toggles negative prompt section", () => {
    render(<CharacterSection index={0} />);
    const toggle = screen.getByText("generation.negativePrompt");
    fireEvent.click(toggle);
    // After toggle, negative prompt textarea should appear
    const textareas = screen.getAllByRole("textbox");
    expect(textareas.length).toBeGreaterThanOrEqual(1);
  });
});
