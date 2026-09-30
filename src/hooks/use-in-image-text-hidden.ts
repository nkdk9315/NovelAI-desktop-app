import { useWorkspaceStore } from "@/stores/workspace-store";
import { useSpriteStore } from "@/stores/sprite-store";

/** The sprite page keeps text out of its images: dialogue / sound effects / marks inputs don't apply there. */
export function useInImageTextHidden(): boolean {
  const sprite = useWorkspaceStore((s) => s.workspace === "sprite");
  const noText = useSpriteStore((s) => s.spec?.noText ?? true);
  return sprite && noText;
}
