import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Brush, Download, FileSearch, ImagePlay, Layers, Loader2, SquareDashed, UserSquare } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useImageSourceActions } from "@/hooks/use-image-source-actions";
import { parseMetadata, type ParsedMetadata } from "@/lib/nai-metadata";
import { applyMetadata, hasAnySelected, type ApplyResult, type MetadataSelection } from "@/lib/apply-metadata";
import {
  DEFAULT_PREFS, loadPrefs, prefsFromSelection, savePrefs, selectionFromPrefs, type MetadataImportPrefs,
} from "@/lib/metadata-import-prefs";
import { useSettingsStore } from "@/stores/settings-store";
import { useQualityTagStore } from "@/stores/quality-tag-store";
import { toDataUrl } from "@/lib/canvas-image";
import * as ipc from "@/lib/ipc";
import MetadataImportPanel from "./metadata-import/MetadataImportPanel";

interface ImageDropChoiceDialogProps {
  path: string;
  onClose: () => void;
  /** Continue with the Vibe encode dialog */
  onEncodeVibe: () => void;
}

async function loadCustomQualityTags() {
  const store = useQualityTagStore.getState();
  if (!store.loaded) await store.loadCustomQualityTags();
  return useQualityTagStore.getState().customQualityTags;
}

/**
 * Asked when an image file is dropped. Any image can be used as a base image,
 * character reference or vibe; for NovelAI images the user also chooses
 * whether (and which parts of) the metadata to import alongside.
 */
export default function ImageDropChoiceDialog({ path, onClose, onEncodeVibe }: ImageDropChoiceDialogProps) {
  const { t } = useTranslation();
  const name = path.split(/[\\/]/).pop() ?? "";
  const [meta, setMeta] = useState<ParsedMetadata | null>(null);
  const [prefs, setPrefs] = useState<MetadataImportPrefs>(DEFAULT_PREFS);
  const [thumb, setThumb] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      ipc.readImageMetadata(path).catch(() => null),
      ipc.readImageFile(path).then(toDataUrl).catch(() => null),
      loadPrefs(),
      loadCustomQualityTags(),
    ]).then(([m, src, p, customs]) => {
      if (cancelled) return;
      setMeta(m ? parseMetadata(m, customs) : null);
      setPrefs(p);
      setThumb(src);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [path]);

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className={meta ? "flex max-h-[85vh] flex-col sm:max-w-3xl" : "sm:max-w-md"}>
        <DialogHeader className="flex-row items-center gap-3 space-y-0">
          {thumb && <img src={thumb} alt="" className="h-12 w-12 shrink-0 rounded border border-border object-cover" />}
          <div className="min-w-0">
            <DialogTitle>{meta ? t("metadataImport.title") : t("imageDrop.title")}</DialogTitle>
            <DialogDescription className="truncate">{name}</DialogDescription>
          </div>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("metadataImport.reading")}
          </div>
        ) : (
          <DropBody path={path} name={name} meta={meta} prefs={prefs} onClose={onClose} onEncodeVibe={onEncodeVibe} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function DropBody({ path, name, meta, prefs, onClose, onEncodeVibe }: {
  path: string; name: string; meta: ParsedMetadata | null; prefs: MetadataImportPrefs;
  onClose: () => void; onEncodeVibe: () => void;
}) {
  const { t } = useTranslation();
  const { id: projectId } = useParams<{ id: string }>();
  const { setAsBase, setAsCharacterReference } = useImageSourceActions();
  const [sel, setSel] = useState<MetadataSelection | null>(meta ? selectionFromPrefs(meta, prefs) : null);
  const [withImage, setWithImage] = useState(prefs.withImage);
  const [busy, setBusy] = useState(false);
  const refreshAnlas = useSettingsStore((s) => s.refreshAnlas);
  const canImport = !!meta && !!sel && hasAnySelected(sel);
  const importWithImage = canImport && withImage;

  // Remember the choices for the next drop
  const update = (nextSel: MetadataSelection, nextWithImage: boolean) => {
    setSel(nextSel);
    setWithImage(nextWithImage);
    if (meta) savePrefs(prefsFromSelection(meta, nextSel, prefs, nextWithImage));
  };

  const summary = (r: ApplyResult) => [
    r.artistTags ? t("metadataImport.doneArtists", { count: r.artistTags }) : null,
    r.characters ? t("metadataImport.doneCharacters", { count: r.characters }) : null,
    r.vibesAdded + r.vibesExisting ? t("metadataImport.doneVibes", { added: r.vibesAdded, existing: r.vibesExisting }) : null,
    r.vibesEncoded ? t("metadataImport.doneVibesEncoded", { count: r.vibesEncoded }) : null,
  ].filter(Boolean).join(" / ") || undefined;

  /** Import the selected metadata (always without an action, per switch with one), then run the action. */
  const run = async (action?: () => void) => {
    const doImport = action ? importWithImage : canImport;
    if (doImport && meta && sel && projectId) {
      setBusy(true);
      try {
        const r = await applyMetadata(meta, sel, projectId, name.replace(/\.[^.]+$/, ""));
        toast.success(t("metadataImport.done"), { description: summary(r) });
        if (r.vibesEncoded) refreshAnlas().catch(() => {});
      } catch (e) {
        toast.error(t("metadataImport.failed", { error: String(e) }));
        setBusy(false);
        return;
      }
    }
    onClose();
    action?.();
  };

  const choices = [
    { key: "img2img", icon: ImagePlay, run: () => setAsBase({ path }, "img2img") },
    { key: "paint", icon: Brush, run: () => setAsBase({ path }, "img2img", "paint") },
    { key: "inpaint", icon: SquareDashed, run: () => setAsBase({ path }, "inpaint", "mask") },
    { key: "charRef", icon: UserSquare, run: () => setAsCharacterReference({ path }) },
    { key: "vibe", icon: Layers, run: onEncodeVibe },
  ];
  const choiceList = (
    <div className="grid content-start gap-1.5">
      {choices.map(({ key, icon: Icon, run: action }) => (
        <button
          key={key}
          type="button"
          disabled={busy}
          onClick={() => run(action)}
          className="flex items-start gap-3 rounded-md border border-border p-2.5 text-left transition-colors hover:border-primary/50 hover:bg-accent disabled:opacity-50"
        >
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>
            <span className="block text-sm font-medium">{t(`imageDrop.${key}`)}</span>
            <span className="block text-xs text-muted-foreground">{t(`imageDrop.${key}Hint`)}</span>
            {importWithImage && <span className="mt-0.5 block text-[10px] text-primary">{t("metadataImport.plusMetadata")}</span>}
          </span>
        </button>
      ))}
    </div>
  );

  if (!meta || !sel) {
    return (
      <>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <FileSearch className="h-3.5 w-3.5" />
          {t("metadataImport.none")}
        </p>
        {choiceList}
      </>
    );
  }

  return (
    <div className="grid min-h-0 flex-1 gap-4 sm:grid-cols-[1fr_15rem]">
      <div className="flex min-h-0 flex-col gap-2">
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <MetadataImportPanel meta={meta} sel={sel} onChange={(next) => update(next, withImage)} />
        </div>
        <Button onClick={() => run()} disabled={busy || !canImport}>
          {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
          {t("metadataImport.import")}
        </Button>
        <p className="text-center text-[10px] text-muted-foreground">{t("metadataImport.remembered")}</p>
      </div>
      <div className="min-h-0 space-y-2 overflow-y-auto">
        <p className="text-xs font-medium text-muted-foreground">{t("metadataImport.orUseImage")}</p>
        <label className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2.5 py-2 text-xs font-medium">
          <span>
            {t("metadataImport.importToggle")}
            <span className="block text-[10px] font-normal text-muted-foreground">{t("metadataImport.importToggleHint")}</span>
          </span>
          <Switch checked={withImage} onCheckedChange={(v) => update(sel, v)} />
        </label>
        {choiceList}
      </div>
    </div>
  );
}
