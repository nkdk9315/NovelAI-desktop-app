import { useTranslation } from "react-i18next";
import { Brush, ImagePlay, Layers, SquareDashed, UserSquare } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useImageSourceActions } from "@/hooks/use-image-source-actions";

interface ImageDropChoiceDialogProps {
  path: string;
  onClose: () => void;
  /** Continue with the Vibe encode dialog */
  onEncodeVibe: () => void;
}

/** Asked when an image file is dropped: what should it be used for? */
export default function ImageDropChoiceDialog({ path, onClose, onEncodeVibe }: ImageDropChoiceDialogProps) {
  const { t } = useTranslation();
  const { setAsBase, setAsCharacterReference } = useImageSourceActions();
  const name = path.split(/[\\/]/).pop();

  const choices = [
    { key: "img2img", icon: ImagePlay, run: () => setAsBase({ path }, "img2img") },
    { key: "paint", icon: Brush, run: () => setAsBase({ path }, "img2img", "paint") },
    { key: "inpaint", icon: SquareDashed, run: () => setAsBase({ path }, "inpaint", "mask") },
    { key: "charRef", icon: UserSquare, run: () => setAsCharacterReference({ path }) },
    { key: "vibe", icon: Layers, run: onEncodeVibe },
  ];

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("imageDrop.title")}</DialogTitle>
          <DialogDescription className="truncate">{name}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          {choices.map(({ key, icon: Icon, run }) => (
            <button
              key={key}
              type="button"
              onClick={() => { onClose(); run(); }}
              className="flex items-start gap-3 rounded-md border border-border p-2.5 text-left transition-colors hover:border-primary/50 hover:bg-accent"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                <span className="block text-sm font-medium">{t(`imageDrop.${key}`)}</span>
                <span className="block text-xs text-muted-foreground">{t(`imageDrop.${key}Hint`)}</span>
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
