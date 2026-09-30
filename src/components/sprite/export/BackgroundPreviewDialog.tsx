import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSpriteStore } from "@/stores/sprite-store";
import * as spriteIpc from "@/lib/ipc-sprite";
import type { SpriteBackgroundPreviewDto } from "@/types/sprite";
import BackgroundOptionsFields from "./BackgroundOptionsFields";

/** An adopted image with its background removed exactly as the export will, over a checkerboard. */
export default function BackgroundPreviewDialog({ imageId, onClose }: { imageId: string | null; onClose: () => void }) {
  const { t } = useTranslation();
  const setId = useSpriteStore((s) => s.activeSetId);
  const fillHoles = useSpriteStore((s) => s.spec?.export.fillHoles ?? true);
  const removeIslands = useSpriteStore((s) => s.spec?.export.removeIslands ?? true);
  const [result, setResult] = useState<SpriteBackgroundPreviewDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!imageId || !setId) return;
    let live = true;
    setResult(null);
    setError(null);
    spriteIpc.previewSpriteBackground(setId, imageId, { fillHoles, removeIslands })
      .then((r) => { if (live) setResult(r); })
      .catch((e) => { if (live) setError(String(e)); });
    return () => { live = false; };
  }, [imageId, setId, fillHoles, removeIslands]);

  return (
    <Dialog open={!!imageId} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[92vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("sprite.bg.previewTitle")}</DialogTitle>
          <DialogDescription>{t("sprite.bg.previewDesc")}</DialogDescription>
        </DialogHeader>
        <div className="editor-checker flex h-[60vh] items-center justify-center overflow-hidden rounded-md">
          {result
            ? <img src={`data:image/png;base64,${result.imageBase64}`} alt="" className="max-h-full max-w-full object-contain" />
            : error
              ? <p className="p-4 text-xs text-destructive">{error}</p>
              : <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </div>
        {result && result.outcome !== "removed" && (
          <p className="rounded-md bg-amber-500/10 px-2 py-1 text-[11px] text-amber-700 dark:text-amber-300">
            {t(`sprite.bg.outcome.${result.outcome}`)}
          </p>
        )}
        <BackgroundOptionsFields />
      </DialogContent>
    </Dialog>
  );
}
