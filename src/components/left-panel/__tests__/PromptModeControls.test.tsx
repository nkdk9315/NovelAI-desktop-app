import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PromptModeControls from "../PromptModeControls";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { useQualityTagStore } from "@/stores/quality-tag-store";
import * as ipc from "@/lib/ipc";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

vi.mock("@/lib/ipc", () => ({
  getSettings: vi.fn().mockResolvedValue({
    custom_quality_tags: JSON.stringify([{ id: "q1", name: "Mine", tags: "best quality" }]),
  }),
  setSetting: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  useGenerationParamsStore.setState({
    model: "nai-diffusion-5-full", furryMode: false, qualityPreset: "none", transparentBackground: false,
  });
  useQualityTagStore.setState({ customQualityTags: [], loaded: false });
});

describe("PromptModeControls", () => {
  it("switches between anime and furry mode", () => {
    render(<PromptModeControls />);
    fireEvent.click(screen.getByText("generation.artStyleMode.furry"));
    expect(useGenerationParamsStore.getState().furryMode).toBe(true);
    fireEvent.click(screen.getByText("generation.artStyleMode.anime"));
    expect(useGenerationParamsStore.getState().furryMode).toBe(false);
  });

  it("shows the transparent toggle only for V5", () => {
    const { rerender } = render(<PromptModeControls />);
    fireEvent.click(screen.getByText("generation.transparentBackground"));
    expect(useGenerationParamsStore.getState().transparentBackground).toBe(true);
    useGenerationParamsStore.setState({ model: "nai-diffusion-4-5-full" });
    rerender(<PromptModeControls />);
    expect(screen.queryByText("generation.transparentBackground")).toBeNull();
  });

  it("loads custom quality tags and shows the selected one", async () => {
    useGenerationParamsStore.setState({ qualityPreset: "custom:q1" });
    render(<PromptModeControls />);
    await waitFor(() => expect(screen.getByText("Mine")).toBeInTheDocument());
    expect(ipc.getSettings).toHaveBeenCalled();
  });

  it("shows light as standard on a model without it", () => {
    useGenerationParamsStore.setState({ model: "nai-diffusion-4-5-full", qualityPreset: "light" });
    render(<PromptModeControls />);
    expect(screen.getByText("generation.qualityPreset.standard")).toBeInTheDocument();
  });
});
