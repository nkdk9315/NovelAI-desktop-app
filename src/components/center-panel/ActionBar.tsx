import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Play, Save, SaveAll, Trash2 } from "lucide-react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useGenerationStore } from "@/stores/generation-store";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { useSidebarArtistTagsStore } from "@/stores/sidebar-artist-tags-store";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import { useHistoryStore } from "@/stores/history-store";
import { useSettingsStore } from "@/stores/settings-store";
import { MAX_TOTAL_VIBES, NEGATIVE_PRESETS, QUALITY_TAGS } from "@/lib/constants";
import { calculateCost } from "@/lib/cost";
import { normalizeStrengths } from "@/lib/normalize-strength";
import { rollPromptForGeneration, substituteWildcards, assembleNegativeFromGroups } from "@/lib/prompt-assembly";
import { usePromptTokenCounts } from "@/hooks/use-prompt-token-counts";
import TokenCounter from "@/components/shared/TokenCounter";
import { appendContributions, getPresetContributionsForCharacter } from "@/lib/preset-contributions";
import { useSidebarPresetGroupStore } from "@/stores/sidebar-preset-group-store";
import { usePresetStore } from "@/stores/preset-store";
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
  const anlas = useSettingsStore((s) => s.anlas);
  const settings = useSettingsStore((s) => s.settings);
  const params = useGenerationParamsStore();
  const sidebarArtistTags = useSidebarArtistTagsStore((s) => s.sidebarArtistTags);
  const tokenCounts = usePromptTokenCounts();

  const [confirmOpen, setConfirmOpen] = useState(false);

  const costConfirmMode = settings.cost_confirm_mode ?? "confirm";

  // Compute actual vibe count for cost estimation (deduplicated by vibeId)
  const activePresets = params.sidebarPresets.filter((p) => p.enabled);
  const uniqueVibeIds = new Set([
    ...activePresets.flatMap((p) => p.selectedVibes.filter((v) => v.enabled).map((v) => v.vibeId)),
    ...params.selectedVibes.filter((v) => v.enabled).map((v) => v.vibeId),
  ]);
  const totalVibeCount = uniqueVibeIds.size;

  const cost = calculateCost({
    width: params.width,
    height: params.height,
    steps: params.steps,
    vibeCount: totalVibeCount,
    hasCharacterReference: false,
    tier: anlas?.tier ?? 0,
  });

  const executeGenerate = async () => {
    if (!projectId || isGenerating) return;
    if (tokenCounts.overflow) {
      toast.error(t("generation.tokenLimitExceededToast", { max: tokenCounts.maxTokens }));
      return;
    }

    // Collect artist tags and vibes from enabled presets + independent vibes
    // Merge by vibeId: presets first-wins, then independent vibes fill remaining
    const allArtistTags = [
      ...sidebarArtistTags,
      ...activePresets.flatMap((p) => p.artistTags),
    ];
    const presetVibes = activePresets.flatMap((p) => p.selectedVibes.filter((v) => v.enabled));
    const independentVibes = params.selectedVibes.filter((v) => v.enabled);
    const seen = new Set<string>();
    const allVibes: typeof presetVibes = [];
    for (const v of [...presetVibes, ...independentVibes]) {
      if (!seen.has(v.vibeId)) {
        seen.add(v.vibeId);
        allVibes.push(v);
      }
    }

    if (allVibes.length > MAX_TOTAL_VIBES) {
      toast.error(t("generation.tooManyVibes", { max: MAX_TOTAL_VIBES, count: allVibes.length }));
      return;
    }

    // Normalize artist tag strengths if enabled
    let finalArtistTags = allArtistTags;
    if (params.normalizeArtistStrength && allArtistTags.length > 0) {
      const normalized = normalizeStrengths(allArtistTags.map((t) => t.strength));
      finalArtistTags = allArtistTags.map((t, i) => ({ ...t, strength: normalized[i] }));
    }

    const artistPrefix = finalArtistTags.length > 0
      ? finalArtistTags.map((tag) => {
          const base = `artist:${tag.name}`;
          return tag.strength === 0 ? base : `{${tag.strength}::${base}::}`;
        }).join(", ") + ", "
      : "";

    // Assemble main prompt: artist prefix + main target override (or assembled groups)
    const sidebarState = useSidebarPromptStore.getState();
    const mainTarget = sidebarState.targets["main"];
    const presetInstances = useSidebarPresetGroupStore.getState().instances;
    const allPresets = usePresetStore.getState().presets;
    const mainContrib = getPresetContributionsForCharacter("main", presetInstances, allPresets);
    const assembledMainBase = mainTarget
      ? (mainTarget.promptOverride != null
          ? substituteWildcards(mainTarget.promptOverride, mainTarget.groups)
          : rollPromptForGeneration("", mainTarget.groups))
      : "";
    const assembledMain = appendContributions(assembledMainBase, mainContrib.positive);
    const qualitySuffix = params.qualityTagsEnabled
      ? (assembledMain ? `, ${QUALITY_TAGS}` : QUALITY_TAGS)
      : "";
    const fullPrompt = artistPrefix + assembledMain + qualitySuffix;

    let enabledVibes = allVibes.map((v) => ({
      vibeId: v.vibeId,
      strength: v.strength,
    }));
    if (params.normalizeVibeStrength && enabledVibes.length > 0) {
      const normalized = normalizeStrengths(enabledVibes.map((v) => v.strength));
      enabledVibes = enabledVibes.map((v, i) => ({ ...v, strength: normalized[i] }));
    }

    const mainNegRaw = mainTarget != null
      ? (mainTarget.negativeOverride ?? assembleNegativeFromGroups(mainTarget.groups, { mode: "generate" }))
      : "";
    const mainNegBase = appendContributions(mainNegRaw, mainContrib.negative);
    const negPresetText = NEGATIVE_PRESETS[params.negativePreset];
    const combinedNeg = negPresetText
      ? (mainNegBase ? `${negPresetText}, ${mainNegBase}` : negPresetText)
      : mainNegBase;

    const req: GenerateImageRequest = {
      projectId,
      prompt: fullPrompt,
      negativePrompt: combinedNeg || undefined,
      characters:
        params.characters.length > 0
          ? params.characters.map((c) => {
              const charTarget = sidebarState.targets[c.id];
              const charContrib = getPresetContributionsForCharacter(c.id, presetInstances, allPresets);
              const charPromptBase = charTarget
                ? (charTarget.promptOverride != null
                    ? substituteWildcards(charTarget.promptOverride, charTarget.groups)
                    : rollPromptForGeneration("", charTarget.groups))
                : c.prompt;
              const charPrompt = appendContributions(charPromptBase, charContrib.positive);
              const charNegBase = charTarget
                ? (charTarget.negativeOverride ?? assembleNegativeFromGroups(charTarget.groups, { mode: "generate" }))
                : c.negativePrompt;
              const charNeg = appendContributions(charNegBase, charContrib.negative);
              return {
                prompt: charPrompt,
                centerX: c.centerX,
                centerY: c.centerY,
                negativePrompt: charNeg,
              };
            })
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

  const handleGenerateClick = () => {
    if (tokenCounts.overflow) {
      toast.error(t("generation.tokenLimitExceededToast", { max: tokenCounts.maxTokens }));
      return;
    }
    if (!cost.isOpusFree && costConfirmMode === "confirm") {
      setConfirmOpen(true);
    } else {
      executeGenerate();
    }
  };

  const handleSave = async () => {
    if (!lastResult) return;
    try {
      await saveImage(lastResult.id);
      toast.success(t("generation.saveSuccess"));
    } catch {
      toast.error(t("generation.saveError"));
    }
  };

  const handleSaveAll = async () => {
    if (!projectId) return;
    try {
      await saveAllImages(projectId);
      toast.success(t("generation.saveAllSuccess"));
    } catch {
      toast.error(t("generation.saveError"));
    }
  };

  const handleDelete = async () => {
    if (!lastResult || !projectId) return;
    await deleteImage(lastResult.id);
  };

  const costLabel = cost.isOpusFree
    ? t("generation.free")
    : `${cost.totalCost} ${t("generation.anlas")}`;

  // Determine button variant
  let buttonVariant: "default" | "destructive" = "default";
  if (!cost.isOpusFree && costConfirmMode === "color") {
    buttonVariant = "destructive";
  }

  return (
    <div className="flex flex-col items-center gap-2 border-t border-border p-3">
      <TokenCounter counts={tokenCounts} />
      <div className="flex items-center justify-center gap-2">
      <Button
        onClick={handleGenerateClick}
        disabled={isGenerating || tokenCounts.overflow}
        size="sm"
        variant={buttonVariant}
      >
        <Play className="mr-1 h-4 w-4" />
        {t("generation.generate")} ({costLabel})
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

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("generation.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("generation.confirmDescription", { cost: cost.totalCost })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => executeGenerate()}>
              {t("generation.confirmGenerate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}
