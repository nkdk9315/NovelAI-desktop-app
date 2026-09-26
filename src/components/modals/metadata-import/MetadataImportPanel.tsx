import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { formatArtistTag } from "@/lib/artist-tag";
import { promptWithoutArtists, vibeModelKey, type ParsedMetadata } from "@/lib/nai-metadata";
import type { MergeMode, MetadataSelection } from "@/lib/apply-metadata";
import { qualityPresetLabel } from "@/lib/prompt-decoration";
import { useQualityTagStore } from "@/stores/quality-tag-store";

interface MetadataImportPanelProps {
  meta: ParsedMetadata;
  sel: MetadataSelection;
  onChange: (sel: MetadataSelection) => void;
}

function Row({ checked, onChange, disabled, label, count, children, extra }: {
  checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string; count?: string | number;
  children?: React.ReactNode; extra?: React.ReactNode;
}) {
  return (
    <div className={`rounded-md border px-2.5 py-2 ${checked && !disabled ? "border-primary/50 bg-primary/5" : "border-border"} ${disabled ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-2">
        <label className="flex flex-1 cursor-pointer items-center gap-2 text-sm font-medium">
          <Checkbox checked={checked && !disabled} disabled={disabled} onCheckedChange={(v) => onChange(v === true)} />
          {label}
          {count !== undefined && <span className="rounded bg-muted px-1.5 text-[10px] tabular text-muted-foreground">{count}</span>}
        </label>
        {extra}
      </div>
      {children && <div className="mt-1 pl-6 text-[11px] leading-snug text-muted-foreground">{children}</div>}
    </div>
  );
}

function ModeToggle({ value, onChange }: { value: MergeMode; onChange: (m: MergeMode) => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex rounded border border-border p-px text-[10px]">
      {(["replace", "append"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`rounded-sm px-1.5 py-0.5 ${value === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          {t(`metadataImport.mode.${m}`)}
        </button>
      ))}
    </div>
  );
}

/** "human-main" -> "HumanMain" (i18n key suffix of the negative presets) */
const presetKey = (id: string) => id.replace(/(^|-)([a-z])/g, (_, __, c: string) => c.toUpperCase());
const VIBE_ENCODE_PRICE = 2;

/** Long text clipped to `limit` characters with a toggle to show all of it. */
function ExpandableText({ text, limit = 160, empty }: { text: string; limit?: number; empty?: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (!text) return <span>{empty ?? "—"}</span>;
  const long = text.length > limit;
  return (
    <span className="block">
      <span className={open ? "block max-h-48 overflow-y-auto whitespace-pre-wrap break-words pr-1" : "break-words"}>
        {open || !long ? text : `${text.slice(0, limit)}…`}
      </span>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline"
        >
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {t(open ? "metadataImport.showLess" : "metadataImport.showAll", { count: text.length })}
        </button>
      )}
    </span>
  );
}

/** Checklist of the parts of a NovelAI image's metadata to import. */
export default function MetadataImportPanel({ meta, sel, onChange }: MetadataImportPanelProps) {
  const { t } = useTranslation();
  const customQualityTags = useQualityTagStore((s) => s.customQualityTags);
  const vibesUsable = vibeModelKey(meta.model) !== null;
  const set = <K extends keyof MetadataSelection>(k: K, v: MetadataSelection[K]) => onChange({ ...sel, [k]: v });
  const picked = new Set(sel.artistNames);
  const toggleArtist = (name: string) =>
    set("artistNames", picked.has(name) ? sel.artistNames.filter((n) => n !== name) : [...sel.artistNames, name]);
  const allArtists = meta.artistTags.map((a) => a.name);

  const s = meta.settings;
  const settingsText = [
    meta.model?.replace("nai-diffusion-", "V").replace(/-/g, " "),
    s.width && s.height ? `${s.width}×${s.height}` : null,
    s.steps ? `${s.steps} steps` : null,
    s.scale !== undefined ? `CFG ${s.scale}` : null,
    s.sampler,
  ].filter(Boolean).join(" · ");
  const mainPreview = promptWithoutArtists(meta.rawPrompt, picked);
  const unencoded = meta.vibes.filter((v) => !v.encoded).length;

  return (
    <div className="space-y-1.5">
      {meta.artistTags.length > 0 && (
        <Row
          label={t("metadataImport.artistTags")} count={`${picked.size}/${meta.artistTags.length}`}
          checked={picked.size > 0} onChange={(v) => set("artistNames", v ? allArtists : [])}
          extra={picked.size > 0 && <ModeToggle value={sel.artistMode} onChange={(m) => set("artistMode", m)} />}
        >
          <span className="flex flex-wrap gap-1">
            {meta.artistTags.map((a) => {
              const on = picked.has(a.name);
              return (
                <button
                  key={a.name}
                  type="button"
                  onClick={() => toggleArtist(a.name)}
                  title={t(on ? "metadataImport.artistOn" : "metadataImport.artistOff")}
                  className={`flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] transition-colors ${
                    on ? "border-primary/60 bg-primary/15 text-foreground" : "border-border text-muted-foreground line-through decoration-muted-foreground/50"
                  }`}
                >
                  {on && <Check className="h-2.5 w-2.5 text-primary" />}
                  {formatArtistTag(a)}
                  {a.source !== "main" && (
                    <span className="rounded bg-muted px-1 font-sans no-underline">{t("metadataImport.fromCharacter", { n: a.source + 1 })}</span>
                  )}
                </button>
              );
            })}
          </span>
          <span className="mt-1 block">{t("metadataImport.artistHint")}</span>
        </Row>
      )}
      {meta.rawPrompt !== "" && (
        <Row label={t("metadataImport.prompt")} checked={sel.prompt} onChange={(v) => set("prompt", v)}>
          <ExpandableText text={mainPreview} empty={t("metadataImport.emptyAfterArtists")} />
          {meta.qualityPreset !== "none" && (
            <span className="ml-1 text-primary">
              {t("metadataImport.qualityTags", { name: qualityPresetLabel(meta.qualityPreset, customQualityTags, t) })}
            </span>
          )}
          {meta.transparentBackground && <span className="ml-1 text-primary">{t("metadataImport.transparentBackground")}</span>}
          {meta.furryMode && <span className="ml-1 text-primary">{t("metadataImport.furryMode")}</span>}
        </Row>
      )}
      {(meta.negative !== "" || meta.negativePreset !== "none") && (
        <Row label={t("metadataImport.negative")} checked={sel.negative} onChange={(v) => set("negative", v)}>
          {meta.negativePreset !== "none" && (
            <span className="mr-1 text-primary">
              {t("metadataImport.preset", { name: t(`generation.negativePreset${presetKey(meta.negativePreset)}`) })}
            </span>
          )}
          <ExpandableText text={meta.negative} />
        </Row>
      )}
      {meta.characters.length > 0 && (
        <Row
          label={t("metadataImport.characters")} count={meta.characters.length}
          checked={sel.characters} onChange={(v) => set("characters", v)}
          extra={sel.characters && <ModeToggle value={sel.characterMode} onChange={(m) => set("characterMode", m)} />}
        >
          {meta.characters.map((c, i) => (
            <span key={i} className="flex gap-1">
              <span className="shrink-0">{i + 1}.</span>
              <ExpandableText text={promptWithoutArtists(c.rawPrompt, picked)} limit={100} />
            </span>
          ))}
        </Row>
      )}
      {meta.vibes.length > 0 && (
        <Row
          label={t("metadataImport.vibes")} count={meta.vibes.length} disabled={!vibesUsable}
          checked={sel.vibes} onChange={(v) => set("vibes", v)}
        >
          {vibesUsable
            ? t("metadataImport.vibesHint", { strengths: meta.vibes.map((v) => v.strength.toFixed(2)).join(", ") })
            : t("metadataImport.vibesUnsupported")}
          {vibesUsable && unencoded > 0 && (
            <span className="mt-0.5 block text-amber-600 dark:text-amber-400">
              {t("metadataImport.vibesUnencoded", { count: unencoded, cost: unencoded * VIBE_ENCODE_PRICE })}
            </span>
          )}
        </Row>
      )}
      {meta.characterReference && (
        <Row label={t("metadataImport.characterReference")} checked={sel.characterReference} onChange={(v) => set("characterReference", v)}>
          {t(`charRef.modes.${meta.characterReference.mode === "character&style" ? "characterAndStyle" : meta.characterReference.mode}`)}
          {` · ${meta.characterReference.strength.toFixed(2)}`}
        </Row>
      )}
      {settingsText && (
        <Row label={t("metadataImport.settings")} checked={sel.settings} onChange={(v) => set("settings", v)}>
          {settingsText}
        </Row>
      )}
      {meta.seed !== null && (
        <Row label={t("metadataImport.seed")} checked={sel.seed} onChange={(v) => set("seed", v)}>
          <span className="select-all font-mono">{meta.seed}</span>
          <span className="ml-1">{t("metadataImport.seedHint")}</span>
        </Row>
      )}
    </div>
  );
}
