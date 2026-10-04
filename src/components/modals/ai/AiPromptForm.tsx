import { useTranslation } from "react-i18next";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COPY_PASTE_ID, clampCount, type AiPromptPrefs } from "@/lib/ai-prompt";
import type { AiPromptDetail, AiPromptStyle, AiProviderDto } from "@/types/ai";

const STYLES: AiPromptStyle[] = ["tags", "natural", "hybrid"];
const DETAILS: AiPromptDetail[] = ["short", "standard", "detailed"];
const TOGGLES = ["includeOutfit", "includeAppearance", "adult"] as const;

interface AiPromptFormProps {
  theme: string;
  characters: string;
  prefs: AiPromptPrefs;
  providers: AiProviderDto[];
  onThemeChange: (v: string) => void;
  onCharactersChange: (v: string) => void;
  onPrefsChange: (partial: Partial<AiPromptPrefs>) => void;
  onManageProviders: () => void;
}

/** What to make and how to write it: everything that goes into the one request. */
export default function AiPromptForm({
  theme, characters, prefs, providers,
  onThemeChange, onCharactersChange, onPrefsChange, onManageProviders,
}: AiPromptFormProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="ai-theme" className="text-xs">{t("ai.theme")}</Label>
        <Textarea id="ai-theme" value={theme} onChange={(e) => onThemeChange(e.target.value)}
          placeholder={t("ai.themePlaceholder")} rows={3} className="text-xs" />
      </div>

      <div className="grid grid-cols-[1fr_5rem] gap-3">
        <div className="space-y-1">
          <Label htmlFor="ai-characters" className="text-xs">{t("ai.characters")}</Label>
          <Input id="ai-characters" value={characters} onChange={(e) => onCharactersChange(e.target.value)}
            placeholder={t("ai.charactersPlaceholder")} className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ai-count" className="text-xs">{t("ai.count")}</Label>
          <Input id="ai-count" type="number" min={1} max={40} value={prefs.count} className="h-8 text-xs"
            onChange={(e) => onPrefsChange({ count: clampCount(Number(e.target.value)) })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">{t("ai.style.label")}</Label>
          <Select value={prefs.style} onValueChange={(v) => onPrefsChange({ style: v as AiPromptStyle })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STYLES.map((s) => <SelectItem key={s} value={s}>{t(`ai.style.${s}`)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("ai.detail.label")}</Label>
          <Select value={prefs.detail} onValueChange={(v) => onPrefsChange({ detail: v as AiPromptDetail })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DETAILS.map((d) => <SelectItem key={d} value={d}>{t(`ai.detail.${d}`)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5 rounded-md border border-border p-2">
        {TOGGLES.map((key) => (
          <div key={key} className="flex items-center justify-between gap-3">
            <Label htmlFor={`ai-${key}`} className="text-xs font-normal">{t(`ai.toggle.${key}`)}</Label>
            <Switch id={`ai-${key}`} checked={prefs[key]} onCheckedChange={(on) => onPrefsChange({ [key]: on })} />
          </div>
        ))}
        <p className="text-[11px] text-muted-foreground">{t("ai.styleNote")}</p>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">{t("ai.provider")}</Label>
        <div className="flex gap-2">
          <Select value={prefs.providerId} onValueChange={(v) => onPrefsChange({ providerId: v })}>
            <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={COPY_PASTE_ID}>{t("ai.copyPaste.name")}</SelectItem>
              {providers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} · {p.model}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-9 shrink-0" onClick={onManageProviders} title={t("ai.providers.title")}>
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
