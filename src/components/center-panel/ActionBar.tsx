import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Brush, ImagePlay, Play, Save, SaveAll } from "lucide-react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useGenerationStore } from "@/stores/generation-store";
import { useHistoryStore } from "@/stores/history-store";
import { useSettingsStore } from "@/stores/settings-store";
import { usePromptTokenCounts } from "@/hooks/use-prompt-token-counts";
import { useGenerationPlan } from "@/hooks/use-generation-plan";
import { useRunGeneration } from "@/hooks/use-run-generation";
import { currentEditPlan } from "@/lib/generation-request";
import TokenCounter from "@/components/shared/TokenCounter";
import DeleteImageButton from "./DeleteImageButton";

export default function ActionBar() {
  const { t } = useTranslation();
  const { id: projectId } = useParams<{ id: string }>();
  const isGenerating = useGenerationStore((s) => s.isGenerating);
  const lastResult = useGenerationStore((s) => s.lastResult);
  const saveImage = useHistoryStore((s) => s.saveImage);
  const saveAllImages = useHistoryStore((s) => s.saveAllImages);
  const settings = useSettingsStore((s) => s.settings);
  const tokenCounts = usePromptTokenCounts();
  const plan = useGenerationPlan();
  const runGeneration = useRunGeneration();

  const [confirmOpen, setConfirmOpen] = useState(false);

  const costConfirmMode = settings.cost_confirm_mode ?? "confirm";
  const { cost } = plan;

  const executeGenerate = async () => {
    if (tokenCounts.overflow) {
      toast.error(t("generation.tokenLimitExceededToast", { max: tokenCounts.maxTokens }));
      return;
    }
    const edit = currentEditPlan();
    if (edit && "error" in edit) {
      toast.error(t(`imageEdit.${edit.error}`));
      return;
    }
    await runGeneration(edit ? { action: edit.action, width: edit.width, height: edit.height } : undefined);
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

  const costLabel = cost.isOpusFree
    ? t("generation.free")
    : `${cost.totalCost} ${t("generation.anlas")}`;

  // Determine button variant
  let buttonVariant: "default" | "destructive" = "default";
  if (!cost.isOpusFree && costConfirmMode === "color") {
    buttonVariant = "destructive";
  }

  const GenerateIcon = plan.mode === "img2img" ? ImagePlay : plan.mode === "inpaint" ? Brush : Play;
  const generateLabel = plan.mode === "img2img"
    ? t("imageEdit.generateImg2Img")
    : plan.mode === "inpaint"
      ? t("imageEdit.generateInpaint")
      : t("generation.generate");

  return (
    <div className="flex flex-col items-center gap-2 border-t border-border p-3">
      <TokenCounter counts={tokenCounts} />
      <div className="flex items-center justify-center gap-2">
      <Button
        onClick={handleGenerateClick}
        disabled={isGenerating || tokenCounts.overflow || plan.blocker !== null}
        title={plan.blocker ? t(`imageEdit.${plan.blocker}`) : undefined}
        size="sm"
        variant={buttonVariant}
      >
        <GenerateIcon className="mr-1 h-4 w-4" />
        {generateLabel} ({costLabel})
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
      <DeleteImageButton />

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
