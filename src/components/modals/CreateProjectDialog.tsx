import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ImagePlus, X } from "lucide-react";
import { toastError } from "@/lib/toast-error";
import { getDefaultProjectDir } from "@/lib/ipc";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjectStore } from "@/stores/project-store";
import { convertFileSrc } from "@tauri-apps/api/core";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export default function CreateProjectDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateProjectDialogProps) {
  const { t } = useTranslation();
  const createProject = useProjectStore((s) => s.createProject);
  const [name, setName] = useState("");
  const [projectType, setProjectType] = useState("simple");
  const [directoryPath, setDirectoryPath] = useState("");
  const [defaultDir, setDefaultDir] = useState("");
  const [useCustomDir, setUseCustomDir] = useState(false);
  const [thumbnailPath, setThumbnailPath] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const updateDefaultDir = useCallback(
    async (pName: string, pType: string) => {
      const trimmed = pName.trim();
      if (!trimmed) {
        setDefaultDir("");
        return;
      }
      try {
        const dir = await getDefaultProjectDir(pType, trimmed);
        setDefaultDir(dir);
      } catch {
        setDefaultDir("");
      }
    },
    [],
  );

  useEffect(() => {
    if (!useCustomDir) {
      updateDefaultDir(name, projectType);
    }
  }, [name, projectType, useCustomDir, updateDefaultDir]);

  useEffect(() => {
    if (!open) {
      setName("");
      setProjectType("simple");
      setDirectoryPath("");
      setDefaultDir("");
      setUseCustomDir(false);
      setThumbnailPath(null);
    }
  }, [open]);

  const handleSelectDirectory = async () => {
    try {
      const { open: openDialog } = await import("@tauri-apps/plugin-dialog");
      const selected = await openDialog({ directory: true });
      if (selected) {
        setDirectoryPath(selected);
        setUseCustomDir(true);
      }
    } catch (e) {
      toastError(String(e));
    }
  };

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

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      const dir = useCustomDir ? directoryPath : undefined;
      await createProject({
        name: name.trim(),
        projectType,
        directoryPath: dir || undefined,
        thumbnailPath: thumbnailPath ?? undefined,
      });
      onOpenChange(false);
      onCreated?.();
    } catch (e) {
      toastError(String(e));
    } finally {
      setIsCreating(false);
    }
  };

  const effectiveDir = useCustomDir ? directoryPath : defaultDir;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("project.newProject")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Thumbnail */}
          <div className="space-y-2">
            <Label>{t("project.thumbnail")}</Label>
            <div className="flex items-center gap-3">
              {thumbnailPath ? (
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-border">
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

          {/* Type */}
          <div className="space-y-2">
            <Label>{t("project.type")}</Label>
            <Select value={projectType} onValueChange={setProjectType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="simple">Simple</SelectItem>
                <SelectItem value="manga">Manga</SelectItem>
                <SelectItem value="cg">CG</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Directory */}
          <div className="space-y-2">
            <Label>{t("project.directory")}</Label>
            <div className="flex gap-2">
              <Input
                value={effectiveDir}
                onChange={(e) => {
                  setDirectoryPath(e.target.value);
                  setUseCustomDir(true);
                }}
                placeholder={t("project.directoryPlaceholder")}
                className="flex-1 text-xs"
                readOnly={!useCustomDir}
              />
              <Button variant="outline" size="sm" onClick={handleSelectDirectory}>
                {t("project.browse")}
              </Button>
            </div>
            {!useCustomDir && (
              <p className="text-xs text-muted-foreground">
                {t("project.defaultDirectoryNote")}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !name.trim()}
          >
            {t("common.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
