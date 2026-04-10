import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ImageIcon, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/toast-error";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MODELS } from "@/lib/constants";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { useSettingsStore } from "@/stores/settings-store";
import * as ipc from "@/lib/ipc";

interface VibeEncodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialImagePath?: string;
  onEncoded: () => void;
}

export default function VibeEncodeDialog({
  open,
  onOpenChange,
  initialImagePath,
  onEncoded,
}: VibeEncodeDialogProps) {
  const { t } = useTranslation();

  const currentModel = useGenerationParamsStore((s) => s.model);
  const [model, setModel] = useState(currentModel);
  const [imagePath, setImagePath] = useState<string | null>(initialImagePath ?? null);
  const [name, setName] = useState(() => {
    if (initialImagePath) {
      return initialImagePath.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "Vibe";
    }
    return "";
  });
  const [infoExtracted, setInfoExtracted] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleSelectImage = async () => {
    try {
      const { open: openDialog } = await import("@tauri-apps/plugin-dialog");
      const selected = await openDialog({
        multiple: false,
        filters: [{ name: "Image", extensions: ["png", "jpg", "jpeg", "webp"] }],
      });
      if (selected) {
        const path = selected as string;
        setImagePath(path);
        if (!name) {
          setName(path.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "Vibe");
        }
      }
    } catch (e) {
      toastError(String(e));
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (/\.(png|jpe?g|webp)$/i.test(file.name)) {
        // In Tauri, file.path gives the local path
        const path = (file as unknown as { path: string }).path;
        if (path) {
          setImagePath(path);
          if (!name) {
            setName(file.name.replace(/\.[^.]+$/, ""));
          }
        }
      }
    }
  }, [name]);

  const handleEncode = async () => {
    if (!imagePath) return;
    setLoading(true);
    try {
      await ipc.encodeVibe({
        imagePath,
        model,
        name: name.trim() || "Vibe",
        informationExtracted: infoExtracted,
      });
      toast.success(t("vibe.encodeSuccess"));
      useSettingsStore.getState().refreshAnlas().catch(() => {});
      onEncoded();
      onOpenChange(false);
    } catch (e) {
      toastError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("vibe.encode")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image drop zone */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t("vibe.encodeImageLabel")}</Label>
            <div
              className={`relative h-32 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                isDragOver
                  ? "border-primary bg-primary/10"
                  : imagePath
                    ? "border-border bg-muted"
                    : "border-border hover:border-primary/50"
              }`}
              onClick={handleSelectImage}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {imagePath ? (
                <img
                  src={`asset://localhost/${imagePath}`}
                  alt="preview"
                  className="h-full w-full object-contain rounded-lg"
                />
              ) : (
                <>
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground text-center px-4">
                    {t("vibe.encodeDragHint")}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Information Extracted slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{t("vibe.informationExtracted")}</Label>
              <span className="text-xs text-muted-foreground">{infoExtracted.toFixed(2)}</span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={[infoExtracted]}
              onValueChange={([v]) => setInfoExtracted(v)}
            />
          </div>

          {/* Model selector */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t("vibe.selectModel")}</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map((m) => (
                  <SelectItem key={m} value={m} className="text-xs">
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Name input */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t("vibe.nameLabel")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("vibe.namePlaceholder")}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleEncode}
            disabled={loading || !imagePath}
          >
            {loading ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <ImageIcon className="mr-1 h-3 w-3" />
            )}
            {t("vibe.encodeButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
