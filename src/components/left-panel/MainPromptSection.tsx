import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, Settings2 } from "lucide-react";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import PromptTextarea from "@/components/shared/PromptTextarea";
import PromptGroupPicker from "./PromptGroupPicker";
import PromptGroupModal from "@/components/modals/PromptGroupModal";
import { Button } from "@/components/ui/button";

export default function MainPromptSection() {
  const { t } = useTranslation();
  const prompt = useGenerationParamsStore((s) => s.prompt);
  const negativePrompt = useGenerationParamsStore((s) => s.negativePrompt);
  const setParam = useGenerationParamsStore((s) => s.setParam);
  const [showNegative, setShowNegative] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);

  const handleInsertTags = (tags: string[]) => {
    const insertion = tags.join(", ");
    const newPrompt = prompt ? `${prompt}, ${insertion}` : insertion;
    setParam("prompt", newPrompt);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-foreground">
          {t("generation.prompt")}
        </label>
        <div className="flex items-center gap-1">
          <PromptGroupPicker onInsertTags={handleInsertTags} />
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-2 text-xs"
            onClick={() => setShowGroupModal(true)}
          >
            <Settings2 className="h-3 w-3" />
            {t("promptGroup.manage")}
          </Button>
        </div>
      </div>
      <PromptTextarea
        value={prompt}
        onChange={(v) => setParam("prompt", v)}
        placeholder={t("generation.prompt")}
        rows={5}
      />

      <button
        type="button"
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setShowNegative(!showNegative)}
      >
        {showNegative ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        {t("generation.negativePrompt")}
      </button>

      {showNegative && (
        <PromptTextarea
          value={negativePrompt}
          onChange={(v) => setParam("negativePrompt", v)}
          placeholder={t("generation.negativePrompt")}
          rows={3}
        />
      )}

      <PromptGroupModal open={showGroupModal} onOpenChange={setShowGroupModal} />
    </div>
  );
}
