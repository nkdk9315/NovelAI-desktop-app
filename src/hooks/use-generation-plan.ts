import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { useSettingsStore } from "@/stores/settings-store";
import { activeEditMode, useImageEditStore } from "@/stores/image-edit-store";
import { useCharRefStore } from "@/stores/char-ref-store";
import { supportsCharacterReference } from "@/lib/constants";
import { calculateCost } from "@/lib/cost";
import { collectActiveVibes } from "@/lib/generation-request";

/**
 * What the next press of the generate button will do: mode, output size,
 * cost, and why it is blocked (if it is).
 */
export function useGenerationPlan() {
  const params = useGenerationParamsStore();
  const anlas = useSettingsStore((s) => s.anlas);
  const edit = useImageEditStore();
  const charRef = useCharRefStore();

  const mode = activeEditMode(edit);
  const charRefActive = !!charRef.image && charRef.enabled && supportsCharacterReference(params.model);
  const vibeCount = charRefActive ? 0 : collectActiveVibes(params).length;
  const width = mode ? edit.targetWidth : params.width;
  const height = mode ? edit.targetHeight : params.height;
  const strength = mode === "img2img" ? edit.img2imgStrength : mode === "inpaint" ? edit.inpaintStrength : 1;

  const cost = calculateCost({
    width,
    height,
    steps: params.steps,
    vibeCount,
    hasCharacterReference: charRefActive,
    tier: anlas?.tier ?? 0,
    model: params.model,
    opusUsageExhausted: anlas?.opusUsage?.isExhausted ?? false,
    mode: mode === "inpaint" ? "inpaint" : mode === "img2img" ? "img2img" : "txt2img",
    strength,
  });

  const blocker = mode === "inpaint" && !edit.maskBase64 ? "inpaintNeedsMask" : null;
  return { mode, width, height, cost, charRefActive, blocker } as const;
}
