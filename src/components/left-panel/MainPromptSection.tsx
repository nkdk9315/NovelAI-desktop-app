import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import PromptTextarea from "@/components/shared/PromptTextarea";

export default function MainPromptSection() {
  const { t } = useTranslation();
  const prompt = useGenerationParamsStore((s) => s.prompt);
  const negativePrompt = useGenerationParamsStore((s) => s.negativePrompt);
  const setParam = useGenerationParamsStore((s) => s.setParam);
  const [showNegative, setShowNegative] = useState(false);

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-foreground">
        {t("generation.prompt")}
      </label>
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
    </div>
  );
}
