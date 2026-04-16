import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, Eye, EyeOff, Sparkles } from "lucide-react";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import PromptTextarea from "@/components/shared/PromptTextarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CharacterPromptGroups from "./CharacterPromptGroups";
import PromptGroupModal from "@/components/modals/PromptGroupModal";
import { assembleFullPrompt } from "@/lib/prompt-assembly";
import { NEGATIVE_PRESETS, type NegativePresetId } from "@/lib/constants";
import * as ipc from "@/lib/ipc";

const MAIN_TARGET_ID = "main";

export default function MainPromptSection() {
  const { t } = useTranslation();
  const negativePrompt = useGenerationParamsStore((s) => s.negativePrompt);
  const negativePreset = useGenerationParamsStore((s) => s.negativePreset);
  const showNegativePresetInInput = useGenerationParamsStore((s) => s.showNegativePresetInInput);
  const qualityTagsEnabled = useGenerationParamsStore((s) => s.qualityTagsEnabled);
  const setParam = useGenerationParamsStore((s) => s.setParam);
  const characters = useGenerationParamsStore((s) => s.characters);
  const targets = useSidebarPromptStore((s) => s.targets);
  const initTarget = useSidebarPromptStore((s) => s.initTarget);
  const [showNegative, setShowNegative] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const groups = await ipc.listPromptGroups();
        const defaults = groups.filter(
          (g) => g.isDefault && g.defaultGenreIds.includes("genre-main"),
        );
        if (!cancelled) {
          initTarget(MAIN_TARGET_ID, defaults.length > 0 ? defaults : undefined);
        }
      } catch {
        if (!cancelled) initTarget(MAIN_TARGET_ID);
      }
    })();
    return () => { cancelled = true; };
  }, [initTarget]);

  const lineFor = (targetId: string): string => {
    const target = targets[targetId];
    if (!target) return "";
    return target.promptOverride ?? assembleFullPrompt("", target.groups);
  };
  const mainLine = lineFor(MAIN_TARGET_ID);
  const charLines = characters.map((c) => ({
    id: c.id,
    name: c.genreName,
    line: lineFor(c.id),
  }));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-foreground">
          {t("generation.prompt")}
        </label>
        <button
          type="button"
          title={t("generation.qualityTags")}
          onClick={() => setParam("qualityTagsEnabled", !qualityTagsEnabled)}
          className={`flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] transition-colors ${
            qualityTagsEnabled
              ? "text-primary bg-primary/10"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
        >
          <Sparkles className="h-2.5 w-2.5" />
          {t("generation.qualityTags")}
        </button>
      </div>

      <CharacterPromptGroups
        targetId={MAIN_TARGET_ID}
        onOpenGroupBrowser={() => setShowGroupModal(true)}
        textareaRows={5}
        placeholder={t("generation.prompt")}
      />

      <button
        type="button"
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setShowPreview(!showPreview)}
      >
        {showPreview ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {t("prompt.sendPreview")}
      </button>

      {showPreview && (
        <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground space-y-1 break-all">
          <div>
            <span className="font-medium text-foreground">Main:</span>{" "}
            {mainLine || "—"}
          </div>
          {charLines.map((c) => (
            <div key={c.id}>
              <span className="font-medium text-foreground">[{c.name}]</span>{" "}
              {c.line || "—"}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setShowNegative(!showNegative)}
        >
          {showNegative ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {t("generation.negativePrompt")}
        </button>
        <Select
          value={negativePreset}
          onValueChange={(v) => setParam("negativePreset", v as NegativePresetId)}
        >
          <SelectTrigger className="h-4! py-0! text-[9px] w-20 px-1.5 gap-1 [&_svg]:size-3">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none" className="text-[10px]">{t("generation.negativePresetNone")}</SelectItem>
            <SelectItem value="light" className="text-[10px]">{t("generation.negativePresetLight")}</SelectItem>
            <SelectItem value="heavy" className="text-[10px]">{t("generation.negativePresetHeavy")}</SelectItem>
            <SelectItem value="human-main" className="text-[10px]">{t("generation.negativePresetHumanMain")}</SelectItem>
            <SelectItem value="furry" className="text-[10px]">{t("generation.negativePresetFurry")}</SelectItem>
          </SelectContent>
        </Select>
        {negativePreset !== "none" && (
          <button
            type="button"
            title={showNegativePresetInInput
              ? t("generation.negativePresetHide")
              : t("generation.negativePresetShow")}
            onClick={() => setParam("showNegativePresetInInput", !showNegativePresetInInput)}
            className="text-muted-foreground hover:text-foreground"
          >
            {showNegativePresetInInput ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          </button>
        )}
      </div>

      {showNegative && (() => {
        const presetText = NEGATIVE_PRESETS[negativePreset];
        const showMerged = showNegativePresetInInput && presetText.length > 0;
        const prefix = presetText ? `${presetText}, ` : "";
        const displayValue = showMerged
          ? (negativePrompt ? prefix + negativePrompt : presetText)
          : negativePrompt;
        const handleChange = (newValue: string) => {
          if (showMerged) {
            if (newValue.startsWith(prefix)) {
              setParam("negativePrompt", newValue.slice(prefix.length));
              return;
            }
            if (newValue === presetText) {
              setParam("negativePrompt", "");
              return;
            }
            setParam("negativePreset", "none");
            setParam("negativePrompt", newValue);
            return;
          }
          setParam("negativePrompt", newValue);
        };
        return (
          <PromptTextarea
            value={displayValue}
            onChange={handleChange}
            placeholder={t("generation.negativePrompt")}
            rows={3}
          />
        );
      })()}

      {showGroupModal && (
        <PromptGroupModal
          open={showGroupModal}
          onOpenChange={setShowGroupModal}
          targetId={MAIN_TARGET_ID}
        />
      )}
    </div>
  );
}
