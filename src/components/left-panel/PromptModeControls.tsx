import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BadgeCheck, SquareDashed } from "lucide-react";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { useQualityTagStore } from "@/stores/quality-tag-store";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import QualityTagsDialog from "@/components/modals/QualityTagsDialog";
import { isV5Model } from "@/lib/constants";
import {
  builtinQualityTags, customPresetId, effectiveQualityPreset, qualityPresetLabel, type QualityPresetId,
} from "@/lib/prompt-decoration";

const MANAGE_VALUE = "__manage__";

function ModeButton({ active, onClick, title, children }: {
  active: boolean; onClick: () => void; title?: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onClick={onClick}
      className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] transition-colors ${
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

/** Official-site prompt options: anime / furry mode, quality tags and (V5) transparent background. */
export default function PromptModeControls() {
  const { t } = useTranslation();
  const model = useGenerationParamsStore((s) => s.model);
  const furryMode = useGenerationParamsStore((s) => s.furryMode);
  const qualityPreset = useGenerationParamsStore((s) => s.qualityPreset);
  const transparentBackground = useGenerationParamsStore((s) => s.transparentBackground);
  const setParam = useGenerationParamsStore((s) => s.setParam);
  const customs = useQualityTagStore((s) => s.customQualityTags);
  const loaded = useQualityTagStore((s) => s.loaded);
  const loadCustoms = useQualityTagStore((s) => s.loadCustomQualityTags);
  const [manageOpen, setManageOpen] = useState(false);

  useEffect(() => { if (!loaded) loadCustoms(); }, [loaded, loadCustoms]);

  const isV5 = isV5Model(model);
  const builtins = builtinQualityTags(model);
  // A custom preset can't be checked until the list has loaded
  const effective = !loaded && qualityPreset.startsWith("custom:")
    ? qualityPreset
    : effectiveQualityPreset(model, qualityPreset, customs);
  const effectiveTags = (id: QualityPresetId) =>
    id === "standard" || id === "light" ? builtins[id] : customs.find((c) => customPresetId(c.id) === id)?.tags;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <div className="flex items-center rounded border border-border p-px" title={t("generation.artStyleMode.tooltip")}>
        <ModeButton active={!furryMode} onClick={() => setParam("furryMode", false)}>
          {t("generation.artStyleMode.anime")}
        </ModeButton>
        <ModeButton active={furryMode} onClick={() => setParam("furryMode", true)}>
          {t("generation.artStyleMode.furry")}
        </ModeButton>
      </div>

      <Select
        value={effective}
        onValueChange={(v) => {
          if (v === MANAGE_VALUE) setManageOpen(true);
          else setParam("qualityPreset", v as QualityPresetId);
        }}
      >
        <SelectTrigger
          className="h-5! max-w-36 gap-1 px-1.5 py-0! text-[9px] [&_svg]:size-3"
          title={[t("generation.qualityTags"), effectiveTags(effective)].filter(Boolean).join(": ")}
        >
          <BadgeCheck className={effective === "none" ? "text-muted-foreground" : "text-primary"} />
          <SelectValue>{qualityPresetLabel(effective, customs, t)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel className="text-[10px]">{t("generation.qualityTags")}</SelectLabel>
            {(["standard", "light", "none"] as const)
              .filter((id) => id === "none" || builtins[id])
              .map((id) => (
                <SelectItem key={id} value={id} className="text-[10px]" title={builtins[id as "standard" | "light"]}>
                  {t(`generation.qualityPreset.${id}`)}
                </SelectItem>
              ))}
          </SelectGroup>
          {customs.length > 0 && (
            <SelectGroup>
              <SelectSeparator />
              <SelectLabel className="text-[10px]">{t("generation.qualityPresetCustomGroup")}</SelectLabel>
              {customs.map((c) => (
                <SelectItem key={c.id} value={customPresetId(c.id)} className="text-[10px]" title={c.tags}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
          <SelectSeparator />
          <SelectItem value={MANAGE_VALUE} className="text-[10px] text-muted-foreground">
            {t("generation.qualityPresetManage")}
          </SelectItem>
        </SelectContent>
      </Select>

      {isV5 && (
        <ModeButton
          active={transparentBackground}
          onClick={() => setParam("transparentBackground", !transparentBackground)}
          title={t("generation.transparentBackgroundTooltip")}
        >
          <SquareDashed className="h-2.5 w-2.5" />
          {t("generation.transparentBackground")}
        </ModeButton>
      )}

      {manageOpen && <QualityTagsDialog open={manageOpen} onOpenChange={setManageOpen} />}
    </div>
  );
}
