import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, Compass, Eye, EyeOff } from "lucide-react";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import { useNaxStore } from "@/stores/nax-store";
import PromptTextarea from "@/components/shared/PromptTextarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CharacterPromptGroups from "./CharacterPromptGroups";
import PromptModeControls from "./PromptModeControls";
import PromptGroupModal from "@/components/modals/PromptGroupModal";
import { assembleFullPrompt, assembleNegativeFromGroups } from "@/lib/prompt-assembly";
import { appendContributions, getPresetContributionsForCharacter } from "@/lib/preset-contributions";
import { useSidebarPresetGroupStore } from "@/stores/sidebar-preset-group-store";
import { usePresetStore } from "@/stores/preset-store";
import { NEGATIVE_PRESETS, type NegativePresetId } from "@/lib/constants";
import { loadDefaultGroupsForGenre } from "@/lib/default-groups";
import { decorateMainPrompt } from "@/lib/prompt-decoration";
import { appendTargetExtras } from "@/lib/in-image-text";
import { currentOutfitText } from "@/lib/character-look";
import { joinPrompt } from "@/lib/outfits";
import { shouldStripNoText } from "@/lib/generation-request";
import { useQualityTagStore } from "@/stores/quality-tag-store";
import { useBubbleStyleStore } from "@/stores/bubble-style-store";
import DialogueEditor from "./DialogueEditor";
import SfxEditor from "./SfxEditor";
import { useMangaStore } from "@/stores/manga-store";
import { composeCurrentMangaPage } from "@/lib/manga-request";
import EffectPalette from "./EffectPalette";

const MAIN_TARGET_ID = "main";

export default function MainPromptSection() {
  const { t } = useTranslation();
  const negativePrompt = useGenerationParamsStore((s) => s.negativePrompt);
  const negativePreset = useGenerationParamsStore((s) => s.negativePreset);
  const showNegativePresetInInput = useGenerationParamsStore((s) => s.showNegativePresetInInput);
  const setParam = useGenerationParamsStore((s) => s.setParam);
  const characters = useGenerationParamsStore((s) => s.characters);
  const model = useGenerationParamsStore((s) => s.model);
  const qualityPreset = useGenerationParamsStore((s) => s.qualityPreset);
  const furryMode = useGenerationParamsStore((s) => s.furryMode);
  const transparentBackground = useGenerationParamsStore((s) => s.transparentBackground);
  const bubbleStyles = useBubbleStyleStore((s) => s.customBubbleStyles);
  const stripNoText = useGenerationParamsStore((s) => s.stripNoTextWithDialogue);
  const autoSfx = useGenerationParamsStore((s) => s.autoSfx);
  const mangaPage = useMangaStore((s) => s.page);
  const customQualityTags = useQualityTagStore((s) => s.customQualityTags);
  const targets = useSidebarPromptStore((s) => s.targets);
  const initTarget = useSidebarPromptStore((s) => s.initTarget);
  const setNegativeOverride = useSidebarPromptStore((s) => s.setNegativeOverride);

  const mainTarget = targets[MAIN_TARGET_ID];
  const mainGroupsRaw = mainTarget?.groups;
  const negativeOverride = mainTarget?.negativeOverride ?? null;
  const assembledNegative = useMemo(
    () => assembleNegativeFromGroups(mainGroupsRaw ?? []),
    [mainGroupsRaw],
  );
  const [showNegative, setShowNegative] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const defaults = await loadDefaultGroupsForGenre("genre-main");
        if (!cancelled) initTarget(MAIN_TARGET_ID, defaults);
      } catch {
        if (!cancelled) initTarget(MAIN_TARGET_ID);
      }
    })();
    return () => { cancelled = true; };
  }, [initTarget]);

  // Migrate legacy negativePrompt from generation-params-store → negativeOverride (once)
  const mainTargetReady = mainTarget != null;
  useEffect(() => {
    if (mainTarget && !negativeOverride && negativePrompt) {
      setNegativeOverride(MAIN_TARGET_ID, negativePrompt);
      setParam("negativePrompt", "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainTargetReady]);

  const presetInstances = useSidebarPresetGroupStore((s) => s.instances);
  const allPresets = usePresetStore((s) => s.presets);
  const baseFor = (targetId: string): string => {
    const target = targets[targetId];
    const base = target
      ? (target.promptOverride ?? assembleFullPrompt("", target.groups))
      : "";
    return appendContributions(base, getPresetContributionsForCharacter(targetId, presetInstances, allPresets).positive);
  };
  const lineFor = (targetId: string): string => appendTargetExtras(
    baseFor(targetId), targets[targetId], bubbleStyles, targetId === MAIN_TARGET_ID && autoSfx,
  );
  // Manga mode: the page replaces the dialogue and character lines
  const composed = mangaPage.enabled ? composeCurrentMangaPage(baseFor(MAIN_TARGET_ID), false) : null;
  const mainLine = decorateMainPrompt(composed ? composed.main : lineFor(MAIN_TARGET_ID), {
    model, qualityPreset, customQualityTags, transparentBackground, furryMode,
    stripNoText: shouldStripNoText({ characters, autoSfx, stripNoTextWithDialogue: stripNoText }, targets, mangaPage),
  });
  const genreName = (id: string) => characters.find((c) => c.id === id)?.genreName ?? "";
  const charLines = composed
    ? composed.characters.map((c, i) => ({
      id: `${c.characterId}-${i}`,
      name: `${genreName(c.characterId)} · ${t("manga.panelN", { n: c.panel })}`,
      line: c.prompt,
    }))
    : characters.map((c) => ({
      id: c.id,
      name: c.genreName,
      line: appendTargetExtras(
        joinPrompt(baseFor(c.id), currentOutfitText(c, targets, false)?.positive), targets[c.id], bubbleStyles,
      ),
    }));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-foreground">
          {t("generation.prompt")}
        </label>
        <button
          type="button"
          title={t("nax.openExplorerTags")}
          onClick={() => useNaxStore.getState().openExplorer()}
          className="ml-auto flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Compass className="h-2.5 w-2.5" />
          {t("nax.findTags")}
        </button>
      </div>

      <PromptModeControls />

      <CharacterPromptGroups
        targetId={MAIN_TARGET_ID}
        onOpenGroupBrowser={() => setShowGroupModal(true)}
        textareaRows={8}
        placeholder={t("generation.prompt")}
      />

      {!mangaPage.enabled && (
        <>
          <DialogueEditor targetId={MAIN_TARGET_ID} isMain />
          <SfxEditor targetId={MAIN_TARGET_ID} isMain />
          <EffectPalette targetId={MAIN_TARGET_ID} scope="main" />
        </>
      )}

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
        const baseValue = negativeOverride ?? assembledNegative;
        const presetText = NEGATIVE_PRESETS[negativePreset];
        const showMerged = showNegativePresetInInput && presetText.length > 0;
        const prefix = presetText ? `${presetText}, ` : "";
        const displayValue = showMerged
          ? (baseValue ? prefix + baseValue : presetText)
          : baseValue;
        const handleChange = (newValue: string) => {
          if (showMerged) {
            if (newValue.startsWith(prefix)) {
              setNegativeOverride(MAIN_TARGET_ID, newValue.slice(prefix.length));
              return;
            }
            if (newValue === presetText) {
              setNegativeOverride(MAIN_TARGET_ID, "");
              return;
            }
            setParam("negativePreset", "none");
            setNegativeOverride(MAIN_TARGET_ID, newValue);
            return;
          }
          setNegativeOverride(MAIN_TARGET_ID, newValue);
        };
        return (
          <PromptTextarea
            value={displayValue}
            onChange={handleChange}
            placeholder={t("generation.negativePrompt")}
            rows={4}
            expandOnFocus
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
