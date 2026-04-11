import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, Settings2 } from "lucide-react";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import PromptTextarea from "@/components/shared/PromptTextarea";
import CharacterPromptGroups from "./CharacterPromptGroups";
import PromptGroupModal from "@/components/modals/PromptGroupModal";
import GroupBrowserModal from "@/components/modals/GroupBrowserModal";
import { Button } from "@/components/ui/button";

const MAIN_TARGET_ID = "main";

export default function MainPromptSection() {
  const { t } = useTranslation();
  const prompt = useGenerationParamsStore((s) => s.prompt);
  const negativePrompt = useGenerationParamsStore((s) => s.negativePrompt);
  const setParam = useGenerationParamsStore((s) => s.setParam);
  const initTarget = useSidebarPromptStore((s) => s.initTarget);
  const [showNegative, setShowNegative] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showGroupBrowser, setShowGroupBrowser] = useState(false);

  // Ensure main target exists in sidebar-prompt-store
  useEffect(() => {
    initTarget(MAIN_TARGET_ID);
  }, [initTarget]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-foreground">
          {t("generation.prompt")}
        </label>
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

      {/* Free text prompt */}
      <PromptTextarea
        value={prompt}
        onChange={(v) => setParam("prompt", v)}
        placeholder={t("generation.prompt")}
        rows={5}
      />

      {/* Prompt groups for main target */}
      <CharacterPromptGroups
        targetId={MAIN_TARGET_ID}
        onOpenGroupBrowser={() => setShowGroupBrowser(true)}
      />

      {/* Negative prompt */}
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
      <GroupBrowserModal
        open={showGroupBrowser}
        onOpenChange={setShowGroupBrowser}
        targetId={MAIN_TARGET_ID}
      />
    </div>
  );
}
