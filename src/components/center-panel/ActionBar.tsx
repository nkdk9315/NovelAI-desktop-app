import { useTranslation } from "react-i18next";
import { Play, Save, SaveAll, Trash2 } from "lucide-react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useGenerationStore } from "@/stores/generation-store";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { useHistoryStore } from "@/stores/history-store";
import { useSettingsStore } from "@/stores/settings-store";
import type { GenerateImageRequest } from "@/types";

export default function ActionBar() {
  const { t } = useTranslation();
  const { id: projectId } = useParams<{ id: string }>();
  const isGenerating = useGenerationStore((s) => s.isGenerating);
  const lastResult = useGenerationStore((s) => s.lastResult);
  const generate = useGenerationStore((s) => s.generate);
  const saveImage = useHistoryStore((s) => s.saveImage);
  const saveAllImages = useHistoryStore((s) => s.saveAllImages);
  const deleteImage = useHistoryStore((s) => s.deleteImage);
  const loadImages = useHistoryStore((s) => s.loadImages);
  const refreshAnlas = useSettingsStore((s) => s.refreshAnlas);
  const params = useGenerationParamsStore();

  const handleGenerate = async () => {
    if (!projectId || isGenerating) return;

    // Prepend artist tags to prompt
    const artistPrefix = params.artistTags.length > 0
      ? params.artistTags.join(", ") + ", "
      : "";
    const fullPrompt = artistPrefix + params.prompt;

    // Collect enabled vibes
    const enabledVibes = params.selectedVibes
      .filter((v) => v.enabled)
      .map((v) => ({
        vibeId: v.vibeId,
        strength: v.strength,
        infoExtracted: v.infoExtracted,
      }));

    const req: GenerateImageRequest = {
      projectId,
      prompt: fullPrompt,
      negativePrompt: params.negativePrompt || undefined,
      characters:
        params.characters.length > 0
          ? params.characters.map((c) => ({
              prompt: c.prompt,
              centerX: c.centerX,
              centerY: c.centerY,
              negativePrompt: c.negativePrompt,
            }))
          : undefined,
      vibes: enabledVibes.length > 0 ? enabledVibes : undefined,
      width: params.width,
      height: params.height,
      steps: params.steps,
      scale: params.scale,
      cfgRescale: params.cfgRescale,
      sampler: params.sampler,
      noiseSchedule: params.noiseSchedule,
      model: params.model,
      action: { type: "generate" },
    };
    await generate(req);
    await Promise.all([loadImages(projectId), refreshAnlas()]);
  };

  const handleSave = async () => {
    if (!lastResult) return;
    await saveImage(lastResult.id);
  };

  const handleSaveAll = async () => {
    if (!projectId) return;
    await saveAllImages(projectId);
  };

  const handleDelete = async () => {
    if (!lastResult || !projectId) return;
    await deleteImage(lastResult.id);
  };

  return (
    <div className="flex items-center justify-center gap-2 border-t border-border p-3">
      <Button
        onClick={handleGenerate}
        disabled={isGenerating || !params.prompt.trim()}
        size="sm"
      >
        <Play className="mr-1 h-4 w-4" />
        {t("generation.generate")}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleSave}
        disabled={!lastResult}
      >
        <Save className="mr-1 h-4 w-4" />
        {t("generation.save")}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleSaveAll}
        disabled={!projectId}
      >
        <SaveAll className="mr-1 h-4 w-4" />
        {t("generation.saveAll")}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleDelete}
        disabled={!lastResult}
      >
        <Trash2 className="mr-1 h-4 w-4" />
        {t("common.delete")}
      </Button>
    </div>
  );
}
