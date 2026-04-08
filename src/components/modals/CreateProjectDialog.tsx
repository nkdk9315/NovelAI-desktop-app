import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toastError } from "@/lib/toast-error";
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
  const [isCreating, setIsCreating] = useState(false);

  const handleSelectDirectory = async () => {
    try {
      const { open: openDialog } = await import("@tauri-apps/plugin-dialog");
      const selected = await openDialog({ directory: true });
      if (selected) setDirectoryPath(selected);
    } catch (e) {
      toastError(String(e));
    }
  };

  const handleCreate = async () => {
    if (!name.trim() || !directoryPath.trim()) return;
    setIsCreating(true);
    try {
      await createProject({ name: name.trim(), projectType, directoryPath });
      setName("");
      setProjectType("simple");
      setDirectoryPath("");
      onOpenChange(false);
      onCreated?.();
    } catch (e) {
      toastError(String(e));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("project.newProject")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("project.name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("project.namePlaceholder")}
            />
          </div>

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

          <div className="space-y-2">
            <Label>{t("project.directory")}</Label>
            <div className="flex gap-2">
              <Input
                value={directoryPath}
                onChange={(e) => setDirectoryPath(e.target.value)}
                placeholder={t("project.directoryPlaceholder")}
                className="flex-1"
              />
              <Button variant="outline" onClick={handleSelectDirectory}>
                {t("project.browse")}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !name.trim() || !directoryPath.trim()}
          >
            {t("common.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
