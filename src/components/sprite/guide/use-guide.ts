import { useMemo } from "react";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import { positiveTextOf } from "@/stores/sidebar-prompt-text-sync";
import { useSpriteStore } from "@/stores/sprite-store";
import { firstOpenStep, guideStatus, type GuideStepId } from "@/lib/sprite/guide";
import { displayTextOf } from "@/lib/sprite/text";

/** Progress of the active set, step by step, and the step the guide shows. */
export function useGuide() {
  const spec = useSpriteStore((s) => s.spec)!;
  const cells = useSpriteStore((s) => s.cells);
  const picked = useSpriteStore((s) => s.guideStep) as GuideStepId | null;
  const targets = useSidebarPromptStore((s) => s.targets);
  const main = targets["main"];
  const lookText = main ? positiveTextOf(main) : "";

  const steps = useMemo(
    () => guideStatus({ spec, cells, lookText, textOf: displayTextOf }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- targets: prompt boxes feed displayTextOf
    [spec, cells, lookText, targets],
  );
  const current = picked ?? firstOpenStep(steps);
  return { steps, current, lookText };
}
