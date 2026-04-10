import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ImageIcon } from "lucide-react";
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
import * as ipc from "@/lib/ipc";

interface VibeImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filePath: string;
  onImported: () => void;
}

export default function VibeImportDialog({
  open,
  onOpenChange,
  filePath,
  onImported,
}: VibeImportDialogProps) {
  const { t } = useTranslation();
  const defaultName = filePath.split("/").pop()?.replace(".naiv4vibe", "") ?? "Vibe";
  const [name, setName] = useState(defaultName);
  const [thumbnailPath, setThumbnailPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSelectThumbnail = async () => {
    try {
      const { open: openDialog } = await import("@tauri-apps/plugin-dialog");
      const selected = await openDialog({
        multiple: false,
        filters: [{ name: "Image", extensions: ["png", "jpg", "jpeg", "webp"] }],
      });
      if (selected) {
        setThumbnailPath(selected as string);
      }
    } catch (e) {
      toastError(String(e));
    }
  };

  const handleImport = async () => {
    setLoading(true);
    try {
      await ipc.addVibe({
        filePath,
        name: name.trim() || defaultName,
        thumbnailPath: thumbnailPath ?? undefined,
      });
      toast.success(t("vibe.importSuccess"));
      onImported();
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
          <DialogTitle>{t("vibe.importDialog")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("vibe.nameLabel")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("vibe.namePlaceholder")}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t("vibe.thumbnailLabel")}</Label>
            <div className="flex items-center gap-2">
              {thumbnailPath ? (
                <div className="h-16 w-16 rounded border border-border overflow-hidden bg-muted">
                  <img
                    src={`asset://localhost/${thumbnailPath}`}
                    alt="thumbnail"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-16 w-16 rounded border border-dashed border-border flex items-center justify-center bg-muted">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <Button variant="outline" size="sm" onClick={handleSelectThumbnail}>
                {t("vibe.changeThumbnail")}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleImport} disabled={loading}>
            {t("vibe.import")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
