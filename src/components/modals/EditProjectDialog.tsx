import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ImagePlus, X } from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { toastError } from "@/lib/toast-error";
import type { ProjectDto } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProjectStore } from "@/stores/project-store";

interface EditProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectDto | null;
  onUpdated?: () => void;
}

export default function EditProjectDialog({
  open,
  onOpenChange,
  project,
  onUpdated,
}: EditProjectDialogProps) {
  const { t } = useTranslation();
  const updateProject = useProjectStore((s) => s.updateProject);
  const [name, setName] = useState("");
  const [thumbnailPath, setThumbnailPath] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && project) {
      setName(project.name);
      setThumbnailPath(project.thumbnailPath);
    }
  }, [open, project]);

  const handleSelectThumbnail = async () => {
    try {
      const { open: openDialog } = await import("@tauri-apps/plugin-dialog");
      const selected = await openDialog({
        filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }],
      });
      if (selected) setThumbnailPath(selected);
    } catch (e) {
      toastError(String(e));
    }
  };

  const handleSave = async () => {
    if (!project || !name.trim()) return;
    setIsSaving(true);
    try {
      const req: { id: string; name?: string; thumbnailPath?: string | null } = {
        id: project.id,
      };
      if (name.trim() !== project.name) {
        req.name = name.trim();
      }
      if (thumbnailPath !== project.thumbnailPath) {
        req.thumbnailPath = thumbnailPath;
      }
      await updateProject(req);
      onOpenChange(false);
      onUpdated?.();
    } catch (e) {
      toastError(String(e));
    } finally {
      setIsSaving(false);
    }
  };

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("project.editProject")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Thumbnail */}
          <div className="space-y-2">
            <Label>{t("project.thumbnail")}</Label>
            <div className="flex items-center gap-3">
              {thumbnailPath ? (
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                  <img
                    src={convertFileSrc(thumbnailPath)}
                    alt="thumbnail"
                    className="h-full w-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setThumbnailPath(null)}
                    className="absolute right-0.5 top-0.5 rounded-full bg-background/80 p-0.5 hover:bg-background"
                    aria-label={t("common.delete")}
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleSelectThumbnail}
                  className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary"
                  aria-label={t("project.thumbnailSelect")}
                >
                  <ImagePlus size={24} />
                </button>
              )}
              <p className="text-xs text-muted-foreground">
                {t("project.thumbnailHint")}
              </p>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label>{t("project.name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("project.namePlaceholder")}
            />
          </div>

          {/* Type (read-only) */}
          <div className="space-y-2">
            <Label>{t("project.type")}</Label>
            <div>
              <Badge variant="secondary">{project.projectType}</Badge>
            </div>
          </div>

          {/* Directory (read-only) */}
          <div className="space-y-2">
            <Label>{t("project.directory")}</Label>
            <p className="break-all text-xs text-muted-foreground">
              {project.directoryPath}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
