import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Copy, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSpriteStore } from "@/stores/sprite-store";
import { SAMPLE_LOOK, SAMPLE_PROMPTS, SAMPLE_SECTIONS, sampleSpec, type SampleImage } from "@/lib/sprite/sample";
import { toastError } from "@/lib/toast-error";
import { Tip } from "./Hint";

const HOW_STYLE: Record<SampleImage["how"], string> = {
  base: "bg-muted text-muted-foreground",
  regions: "bg-muted text-muted-foreground",
  inpaint: "bg-primary/15 text-primary",
  chain: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  composite: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
};

/** 差分の見本: a finished sample set, section by section, with how each image was made. */
export default function SpriteSampleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState<SampleImage | null>(null);
  const [showPrompts, setShowPrompts] = useState(false);
  const canCreate = useSpriteStore((s) => s.projectId != null);

  const copyLook = () => {
    void navigator.clipboard.writeText(SAMPLE_LOOK).then(
      () => toast.success(t("sprite.sample.lookCopied")),
      () => toast.error(t("sprite.sample.copyFailed")),
    );
  };
  const create = () => {
    useSpriteStore.getState().createSet(t("sprite.sample.setName"), sampleSpec())
      .then(() => {
        useSpriteStore.getState().setTab("guide");
        onOpenChange(false);
        copyLook();
      })
      .catch((e) => toastError(String(e)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t("sprite.sample.title")}</DialogTitle>
          <DialogDescription>{t("sprite.sample.lead")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 text-[10px]">
          {(Object.keys(HOW_STYLE) as SampleImage["how"][]).filter((h) => h !== "regions").map((h) => (
            <span key={h} className={`rounded px-1.5 py-0.5 ${HOW_STYLE[h]}`}>{t(`sprite.sample.how.${h}`)}</span>
          ))}
        </div>

        {SAMPLE_SECTIONS.map((section) => (
          <section key={section.id} className="space-y-1.5">
            <h3 className="text-sm font-semibold">{t(`sprite.sample.sections.${section.id}.title`)}</h3>
            <p className="text-[11px] leading-relaxed text-muted-foreground">{t(`sprite.sample.sections.${section.id}.desc`)}</p>
            <div className="flex flex-wrap gap-2">
              {section.images.map((img, i) => (
                <Tip key={`${img.label}-${i}`} text={t(`sprite.sample.howLong.${img.how}`)}>
                  <button type="button" onClick={() => setZoom(img)}
                    className="flex w-[120px] flex-col gap-1 rounded-md border border-border p-1 text-left hover:border-primary/50">
                    <span className="editor-checker block overflow-hidden rounded" style={{ aspectRatio: img.thumb ? "1 / 1" : "416 / 608" }}>
                      <img src={img.thumb ?? img.src} alt={t(`sprite.sample.labels.${img.label}`)} className="h-full w-full object-contain" loading="lazy" draggable={false} />
                    </span>
                    <span className="truncate text-[11px] font-medium">{t(`sprite.sample.labels.${img.label}`)}</span>
                    <span className={`w-fit rounded px-1 text-[9px] ${HOW_STYLE[img.how]}`}>{t(`sprite.sample.how.${img.how}`)}</span>
                  </button>
                </Tip>
              ))}
            </div>
          </section>
        ))}

        <div className="space-y-2 rounded-md border border-border p-3 text-xs">
          <p className="text-muted-foreground">{t("sprite.sample.madeWith")}</p>
          <button type="button" className="flex items-center gap-1 font-medium" onClick={() => setShowPrompts((v) => !v)}>
            {showPrompts ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {t("sprite.sample.prompts")}
          </button>
          {showPrompts && (
            <dl className="space-y-1">
              {SAMPLE_PROMPTS.map((p) => (
                <div key={p.label}>
                  <dt className="text-[10px] text-muted-foreground">{t(`sprite.sample.promptLabels.${p.label}`)}</dt>
                  <dd className="break-words font-mono text-[11px]">{p.text}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Tip text={t("sprite.sample.createTip")}>
              <span className="inline-flex">
                <Button size="sm" className="h-7 gap-1 text-xs" disabled={!canCreate} onClick={create}>
                  <Plus className="h-3.5 w-3.5" />{t("sprite.sample.create")}
                </Button>
              </span>
            </Tip>
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={copyLook}>
              <Copy className="h-3.5 w-3.5" />{t("sprite.sample.copyLook")}
            </Button>
          </div>
        </div>

        <Dialog open={!!zoom} onOpenChange={(o) => { if (!o) setZoom(null); }}>
          <DialogContent className="max-h-[92vh] p-2 sm:max-w-xl">
            <DialogTitle className="sr-only">{zoom ? t(`sprite.sample.labels.${zoom.label}`) : ""}</DialogTitle>
            {zoom && (
              <div className="flex flex-col items-center gap-2">
                <div className="editor-checker flex w-full justify-center rounded-md">
                  <img src={zoom.src} alt="" className="max-h-[78vh] object-contain" />
                </div>
                <p className="text-xs">
                  <span className="font-medium">{t(`sprite.sample.labels.${zoom.label}`)}</span>
                  {" — "}{t(`sprite.sample.howLong.${zoom.how}`)}
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
