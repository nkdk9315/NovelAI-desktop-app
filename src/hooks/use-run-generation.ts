import { useCallback } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useGenerationStore } from "@/stores/generation-store";
import { useHistoryStore } from "@/stores/history-store";
import { useSettingsStore } from "@/stores/settings-store";
import { buildGenerateRequest, type RequestOverrides } from "@/lib/generation-request";

/** Build the request from the current UI state and run a generation. */
export function useRunGeneration() {
  const { t } = useTranslation();
  const { id: projectId } = useParams<{ id: string }>();
  const generate = useGenerationStore((s) => s.generate);
  const loadImages = useHistoryStore((s) => s.loadImages);
  const refreshAnlas = useSettingsStore((s) => s.refreshAnlas);

  return useCallback(async (overrides?: RequestOverrides) => {
    if (!projectId || useGenerationStore.getState().isGenerating) return;
    const built = buildGenerateRequest(projectId, overrides);
    if (!built.ok) {
      toast.error(t(built.errorKey, built.errorArgs));
      return;
    }
    await generate(built.req);
    await Promise.all([loadImages(projectId), refreshAnlas()]);
  }, [projectId, generate, loadImages, refreshAnlas, t]);
}
