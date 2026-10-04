import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ClipboardCopy, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/toast-error";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAiProviderStore } from "@/stores/ai-provider-store";
import * as ipc from "@/lib/ipc-ai";
import {
  COPY_PASTE_ID, DEFAULT_PREFS, loadPrefs, rowsToTagInputs, savePrefs, toRows,
  type AiPromptPrefs, type AiPromptRow,
} from "@/lib/ai-prompt";
import type { TagInput } from "@/types";
import type { AiPromptOptions, AiPromptResultDto } from "@/types/ai";
import AiPromptForm from "./AiPromptForm";
import AiPromptResult from "./AiPromptResult";
import AiProvidersDialog from "./AiProvidersDialog";

interface AiPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Save the picked entries as a new prompt group */
  onCreate: (name: string, tags: TagInput[]) => Promise<void>;
}

/** Ask an AI once for a batch of scene prompts and save them as a prompt group. */
export default function AiPromptDialog({ open, onOpenChange, onCreate }: AiPromptDialogProps) {
  const { t } = useTranslation();
  const providers = useAiProviderStore((s) => s.providers);
  const loadProviders = useAiProviderStore((s) => s.loadProviders);
  const [prefs, setPrefs] = useState<AiPromptPrefs>(DEFAULT_PREFS);
  const [theme, setTheme] = useState("");
  const [characters, setCharacters] = useState("");
  const [pasted, setPasted] = useState("");
  const [rows, setRows] = useState<AiPromptRow[] | null>(null);
  const [groupName, setGroupName] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [showProviders, setShowProviders] = useState(false);

  useEffect(() => {
    if (!open) { setRows(null); setPasted(""); return; }
    loadProviders().catch((e) => toastError(String(e)));
    loadPrefs().then(setPrefs);
  }, [open, loadProviders]);

  // A stored provider may have been deleted since: fall back to copy-paste
  const providerId = prefs.providerId === COPY_PASTE_ID || providers.some((p) => p.id === prefs.providerId)
    ? prefs.providerId : COPY_PASTE_ID;
  const isCopyPaste = providerId === COPY_PASTE_ID;
  const options: AiPromptOptions = {
    theme, characters, count: prefs.count, style: prefs.style, detail: prefs.detail,
    adult: prefs.adult, includeAppearance: prefs.includeAppearance, includeOutfit: prefs.includeOutfit,
  };

  const changePrefs = (partial: Partial<AiPromptPrefs>) => {
    const next = { ...prefs, ...partial };
    setPrefs(next);
    savePrefs(next);
  };

  const showResult = (result: AiPromptResultDto) => {
    setGroupName(result.name || theme.trim().slice(0, 30));
    setRows(toRows(result.items));
  };

  const run = async (task: () => Promise<void>) => {
    setIsBusy(true);
    try { await task(); } catch (e) { toastError(String(e)); } finally { setIsBusy(false); }
  };

  const handleGenerate = () => run(async () => showResult(await ipc.generateAiPrompts(providerId, options)));

  const handleCopyRequest = () => run(async () => {
    const req = await ipc.buildAiPromptRequest(options);
    await navigator.clipboard.writeText(`${req.system}\n\n${req.user}`);
    toast.success(t("ai.copyPaste.copied"));
  });

  const handleImport = () => run(async () => showResult(await ipc.parseAiPromptResponse(pasted, prefs.style)));

  const tags = rows ? rowsToTagInputs(rows) : [];

  const handleSave = () => run(async () => {
    await onCreate(groupName.trim(), tags);
    toast.success(t("ai.result.saved", { count: tags.length }));
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("ai.title")}</DialogTitle>
          <DialogDescription className="text-xs">{t("ai.description")}</DialogDescription>
        </DialogHeader>

        {rows ? (
          <>
            <AiPromptResult groupName={groupName} rows={rows} onGroupNameChange={setGroupName}
              onRowChange={(key, partial) => setRows((rs) => rs && rs.map((r) => (r.key === key ? { ...r, ...partial } : r)))} />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setRows(null)}>{t("common.back")}</Button>
              <Button onClick={handleSave} disabled={isBusy || !groupName.trim() || tags.length === 0}>{t("ai.result.save")}</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <AiPromptForm theme={theme} characters={characters} prefs={{ ...prefs, providerId }} providers={providers}
              onThemeChange={setTheme} onCharactersChange={setCharacters} onPrefsChange={changePrefs}
              onManageProviders={() => setShowProviders(true)} />
            {isCopyPaste ? (
              <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground">{t("ai.copyPaste.hint")}</p>
                <Button variant="outline" size="sm" onClick={handleCopyRequest} disabled={isBusy || !theme.trim()}>
                  <ClipboardCopy className="mr-1 h-3.5 w-3.5" />{t("ai.copyPaste.copy")}
                </Button>
                <div className="space-y-1">
                  <Label htmlFor="ai-pasted" className="text-xs">{t("ai.copyPaste.paste")}</Label>
                  <Textarea id="ai-pasted" value={pasted} onChange={(e) => setPasted(e.target.value)} rows={3} className="max-h-40 text-xs" />
                </div>
                <DialogFooter>
                  <Button onClick={handleImport} disabled={isBusy || !pasted.trim()}>{t("ai.copyPaste.import")}</Button>
                </DialogFooter>
              </div>
            ) : (
              <DialogFooter>
                <Button onClick={handleGenerate} disabled={isBusy || !theme.trim()}>
                  {isBusy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
                  {isBusy ? t("ai.generating") : t("ai.generate")}
                </Button>
              </DialogFooter>
            )}
          </>
        )}
        <AiProvidersDialog open={showProviders} onOpenChange={setShowProviders} />
      </DialogContent>
    </Dialog>
  );
}
