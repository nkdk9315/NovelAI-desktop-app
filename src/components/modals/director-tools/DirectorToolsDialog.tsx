import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowRight, Eye, Loader2, Play } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import CompareSlider from "@/components/shared/CompareSlider";
import { useDirectorToolsStore } from "@/stores/director-tools-store";
import { useGenerationStore } from "@/stores/generation-store";
import { useHistoryStore } from "@/stores/history-store";
import { useSettingsStore } from "@/stores/settings-store";
import { loadHistoryImage, loadImage, type LoadedImage } from "@/lib/canvas-image";
import { AUGMENT_MAX_PIXELS, calculateAugmentCost, calculateUpscaleCost } from "@/lib/cost";
import { DEFAULT_DEFRY } from "@/lib/constants";
import * as ipc from "@/lib/ipc";
import type { ImageToolResponse } from "@/types";
import ToolOptions, { type ToolOptionValues } from "./ToolOptions";
import { TOOL_DEFS, toolKey, type DirectorTool } from "./tool-defs";

interface Source extends LoadedImage {
  id: string;
}

/** Director Tools (augment) and Upscale on a history image, with a before / after view. */
export default function DirectorToolsDialog() {
  const imageId = useDirectorToolsStore((s) => s.imageId);
  const close = useDirectorToolsStore((s) => s.close);
  return (
    <Dialog open={imageId !== null} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="flex h-[85vh] flex-col gap-3 sm:max-w-5xl">
        {imageId && <ToolsBody key={imageId} imageId={imageId} />}
      </DialogContent>
    </Dialog>
  );
}

function ToolsBody({ imageId }: { imageId: string }) {
  const { t } = useTranslation();
  const { id: projectId } = useParams<{ id: string }>();
  const initialTool = useDirectorToolsStore((s) => s.initialTool);
  const anlas = useSettingsStore((s) => s.anlas);
  const refreshAnlas = useSettingsStore((s) => s.refreshAnlas);
  const loadImages = useHistoryStore((s) => s.loadImages);
  const [tool, setTool] = useState<DirectorTool>(initialTool);
  const [source, setSource] = useState<Source | null>(null);
  const [result, setResult] = useState<(ImageToolResponse & { src: string }) | null>(null);
  const [running, setRunning] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [options, setOptions] = useState<ToolOptionValues>({ prompt: "", emotion: "happy", defry: DEFAULT_DEFRY });

  useEffect(() => {
    loadHistoryImage(imageId)
      .then((img) => setSource({ ...img, id: imageId }))
      .catch((e) => setLoadError(t("imageEdit.loadFailed", { error: String(e) })));
  }, [imageId, t]);

  const tier = anlas?.tier ?? 0;
  const costOf = (id: DirectorTool): { label: string; ok: boolean } => {
    if (!source) return { label: "…", ok: false };
    const { width: w, height: h } = source;
    if (id === "upscale") {
      const c = calculateUpscaleCost(w, h);
      return c === null ? { label: t("tools.tooLarge"), ok: false } : { label: `${c} ${t("generation.anlas")}`, ok: true };
    }
    if (w * h > AUGMENT_MAX_PIXELS) return { label: t("tools.tooLarge"), ok: false };
    const c = calculateAugmentCost(id, w, h, tier);
    return { label: c.isOpusFree ? t("generation.free") : `${c.totalCost} ${t("generation.anlas")}`, ok: true };
  };
  const cost = costOf(tool);

  const run = async () => {
    if (!projectId || !source) return;
    setRunning(true);
    try {
      const src = { type: "history" as const, imageId: source.id };
      const res = tool === "upscale"
        ? await ipc.upscaleImage({ projectId, source: src })
        : await ipc.augmentImage({
            projectId,
            source: src,
            reqType: tool,
            // The client appends ";;" itself, so emotion sends the keyword only
            prompt: tool === "emotion"
              ? options.emotion
              : tool === "colorize" ? options.prompt.trim() || undefined : undefined,
            defry: tool === "colorize" || tool === "emotion" ? options.defry : undefined,
          });
      const loaded = await loadImage(`data:image/png;base64,${res.base64Image}`);
      setResult({ ...res, src: loaded.src });
      await Promise.all([loadImages(projectId), refreshAnlas()]);
    } catch (e) {
      toast.error(t("tools.failed", { error: String(e) }));
    } finally {
      setRunning(false);
    }
  };

  const showInPreview = () => {
    if (!result) return;
    useGenerationStore.setState({
      lastResult: { id: result.id, base64Image: result.base64Image, seed: 0, filePath: result.filePath },
    });
    useDirectorToolsStore.getState().close();
  };

  const continueFromResult = () => {
    if (!result) return;
    setSource({ id: result.id, src: result.src, width: result.width, height: result.height });
    setResult(null);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("tools.title")}</DialogTitle>
        <DialogDescription>{t("tools.description")}</DialogDescription>
      </DialogHeader>
      <div className="flex min-h-0 flex-1 gap-4">
        <div className="flex w-60 shrink-0 flex-col gap-1 overflow-y-auto">
          {TOOL_DEFS.map((d) => {
            const c = costOf(d.id);
            const Icon = d.icon;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => { setTool(d.id); setResult(null); }}
                className={`flex items-start gap-2 rounded-md border p-2 text-left transition-colors ${
                  tool === d.id ? "border-primary bg-primary/10" : "border-transparent hover:bg-accent"
                }`}
              >
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tool === d.id ? "text-primary" : "text-muted-foreground"}`} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2 text-sm font-medium">
                    {t(`tools.names.${toolKey(d.id)}`)}
                    <span className={`shrink-0 text-[10px] tabular ${c.ok ? "text-muted-foreground" : "text-destructive"}`}>{c.label}</span>
                  </span>
                  <span className="block text-[11px] leading-snug text-muted-foreground">{t(`tools.descriptions.${toolKey(d.id)}`)}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex min-h-0 flex-1 items-center justify-center">
            {loadError ? (
              <p className="text-sm text-destructive">{loadError}</p>
            ) : !source ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : result ? (
              <CompareSlider before={source.src} after={result.src} aspect={source.width / source.height} />
            ) : (
              <div className="editor-checker relative h-full max-w-full overflow-hidden rounded-md" style={{ aspectRatio: source.width / source.height }}>
                <img src={source.src} alt="" className="h-full w-full object-contain" />
                {running && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
              </div>
            )}
          </div>

          <ToolOptions tool={tool} values={options} onChange={(p) => setOptions((o) => ({ ...o, ...p }))} />

          <div className="flex items-center gap-2">
            {source && (
              <span className="text-xs tabular text-muted-foreground">
                {source.width}×{source.height}
                {result && ` → ${result.width}×${result.height}`}
              </span>
            )}
            <div className="ml-auto flex gap-2">
              {result && (
                <>
                  <Button variant="outline" size="sm" onClick={continueFromResult}>
                    <ArrowRight className="mr-1 h-4 w-4" />
                    {t("tools.continue")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={showInPreview}>
                    <Eye className="mr-1 h-4 w-4" />
                    {t("tools.showResult")}
                  </Button>
                </>
              )}
              <Button size="sm" onClick={run} disabled={running || !cost.ok}>
                {running ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Play className="mr-1 h-4 w-4" />}
                {t("tools.run", { tool: t(`tools.names.${toolKey(tool)}`) })} ({cost.label})
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
