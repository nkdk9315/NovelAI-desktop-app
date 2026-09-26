import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ipc", () => ({ getSettings: vi.fn(), setSetting: vi.fn(() => Promise.resolve()) }));

import { useGenerationParamsStore, type SidebarPreset } from "../generation-params-store";
import { deserializePresets, serializePresets, usePresetStashStore } from "../sidebar-preset-model-stash";

const preset = (id: string, extra: Partial<SidebarPreset> = {}): SidebarPreset =>
  ({ id, enabled: true, artistTags: [], selectedVibes: [], ...extra });

describe("per-model sidebar presets", () => {
  beforeEach(() => {
    usePresetStashStore.setState({ byModel: {} });
    useGenerationParamsStore.setState({ model: "nai-diffusion-4-5-full", sidebarPresets: [] });
  });

  it("swaps the preset list when the model changes and restores it on return", () => {
    const params = useGenerationParamsStore.getState();
    useGenerationParamsStore.setState({ sidebarPresets: [preset("v45")] });

    params.setParam("model", "nai-diffusion-5-full");
    expect(useGenerationParamsStore.getState().sidebarPresets).toEqual([]);

    useGenerationParamsStore.setState({ sidebarPresets: [preset("v5")] });
    params.setParam("model", "nai-diffusion-4-5-full");
    expect(useGenerationParamsStore.getState().sidebarPresets.map((p) => p.id)).toEqual(["v45"]);
    expect(usePresetStashStore.getState().byModel["nai-diffusion-5-full"].map((p) => p.id)).toEqual(["v5"]);
  });

  it("serializes every model and drops random presets", () => {
    const raw = serializePresets([preset("a"), preset("r", { isRandom: true })], "m1", { m2: [preset("b")] });
    expect(deserializePresets(raw, "m1")).toEqual({ m1: [preset("a")], m2: [preset("b")] });
  });

  it("reads the legacy flat array as the current model's list", () => {
    expect(deserializePresets(JSON.stringify([preset("old")]), "m1")).toEqual({ m1: [preset("old")] });
  });
});
