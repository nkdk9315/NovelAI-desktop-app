import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/toast-error";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAiProviderStore } from "@/stores/ai-provider-store";
import { AI_PROVIDER_PRESETS } from "@/lib/ai-provider-presets";
import type { AiProviderDto } from "@/types/ai";

interface AiProvidersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Draft {
  id?: string;
  name: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  jsonMode: boolean;
  hasApiKey: boolean;
}

const EMPTY_DRAFT: Draft = { name: "", baseUrl: "", model: "", apiKey: "", jsonMode: true, hasApiKey: false };

function draftOf(p: AiProviderDto): Draft {
  return { id: p.id, name: p.name, baseUrl: p.baseUrl, model: p.model, apiKey: "", jsonMode: p.jsonMode, hasApiKey: p.hasApiKey };
}

/** Register / edit / delete the LLM providers used to write prompts. */
export default function AiProvidersDialog({ open, onOpenChange }: AiProvidersDialogProps) {
  const { t } = useTranslation();
  const providers = useAiProviderStore((s) => s.providers);
  const loadProviders = useAiProviderStore((s) => s.loadProviders);
  const saveProvider = useAiProviderStore((s) => s.saveProvider);
  const deleteProvider = useAiProviderStore((s) => s.deleteProvider);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) { setDraft(null); return; }
    loadProviders().catch((e) => toastError(String(e)));
  }, [open, loadProviders]);

  const patch = (partial: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...partial } : d));

  const applyPreset = (presetId: string) => {
    const preset = AI_PROVIDER_PRESETS.find((p) => p.id === presetId);
    if (preset) patch({ name: preset.name, baseUrl: preset.baseUrl });
  };

  const handleSave = async () => {
    if (!draft) return;
    setIsSaving(true);
    try {
      await saveProvider({
        id: draft.id, name: draft.name, baseUrl: draft.baseUrl, model: draft.model, jsonMode: draft.jsonMode,
        // Blank while editing = keep the stored key
        apiKey: draft.apiKey.trim() || (draft.id ? undefined : ""),
      });
      toast.success(t("ai.providers.saved"));
      setDraft(null);
    } catch (e) {
      toastError(String(e));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try { await deleteProvider(id); } catch (e) { toastError(String(e)); }
  };

  const canSave = !!draft && !!draft.name.trim() && !!draft.baseUrl.trim() && !!draft.model.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("ai.providers.title")}</DialogTitle>
          <DialogDescription className="text-xs">{t("ai.providers.description")}</DialogDescription>
        </DialogHeader>

        {draft ? (
          <div className="space-y-3">
            {!draft.id && (
              <div className="space-y-1">
                <Label className="text-xs">{t("ai.providers.preset")}</Label>
                <Select onValueChange={applyPreset}>
                  <SelectTrigger><SelectValue placeholder={t("ai.providers.presetPlaceholder")} /></SelectTrigger>
                  <SelectContent>
                    {AI_PROVIDER_PRESETS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}{p.local ? ` (${t("ai.providers.local")})` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="ai-provider-name" className="text-xs">{t("ai.providers.name")}</Label>
              <Input id="ai-provider-name" value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ai-provider-url" className="text-xs">{t("ai.providers.baseUrl")}</Label>
              <Input id="ai-provider-url" value={draft.baseUrl} onChange={(e) => patch({ baseUrl: e.target.value })} placeholder="https://.../v1" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ai-provider-model" className="text-xs">{t("ai.providers.model")}</Label>
              <Input id="ai-provider-model" value={draft.model} onChange={(e) => patch({ model: e.target.value })} placeholder={t("ai.providers.modelPlaceholder")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ai-provider-key" className="text-xs">{t("ai.providers.apiKey")}</Label>
              <Input id="ai-provider-key" type="password" value={draft.apiKey} onChange={(e) => patch({ apiKey: e.target.value })}
                placeholder={draft.hasApiKey ? t("ai.providers.apiKeyKeep") : t("ai.providers.apiKeyOptional")} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <Label htmlFor="ai-provider-json" className="text-xs">{t("ai.providers.jsonMode")}</Label>
                <p className="text-[11px] text-muted-foreground">{t("ai.providers.jsonModeHint")}</p>
              </div>
              <Switch id="ai-provider-json" checked={draft.jsonMode} onCheckedChange={(on) => patch({ jsonMode: on })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDraft(null)}>{t("common.cancel")}</Button>
              <Button onClick={handleSave} disabled={!canSave || isSaving}>{t("common.save")}</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {providers.length === 0 && <p className="text-xs text-muted-foreground">{t("ai.providers.empty")}</p>}
            {providers.map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-md border border-border p-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{p.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{p.model}</p>
                </div>
                <Button variant="ghost" size="sm" className="h-7 w-7 shrink-0 p-0" onClick={() => setDraft(draftOf(p))} title={t("common.edit")}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 shrink-0 p-0" onClick={() => handleDelete(p.id)} title={t("common.delete")}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setDraft(EMPTY_DRAFT)}>
              <Plus className="mr-1 h-3.5 w-3.5" />{t("ai.providers.add")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
