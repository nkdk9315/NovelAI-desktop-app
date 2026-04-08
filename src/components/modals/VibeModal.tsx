import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/toast-error";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { VibeDto } from "@/types";
import * as ipc from "@/lib/ipc";
import DeleteConfirmDialog from "./DeleteConfirmDialog";

interface VibeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVibesChanged: () => void;
}

export default function VibeModal({ open, onOpenChange, onVibesChanged }: VibeModalProps) {
  const { t } = useTranslation();
  const [vibes, setVibes] = useState<VibeDto[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<VibeDto | null>(null);

  const loadVibes = async () => {
    try {
      setVibes(await ipc.listVibes());
    } catch (e) {
      toastError(String(e));
    }
  };

  useEffect(() => {
    if (open) loadVibes();
  }, [open]);

  const handleImport = async () => {
    try {
      const { open: openDialog } = await import("@tauri-apps/plugin-dialog");
      const selected = await openDialog({
        multiple: false,
        filters: [{ name: "Vibe", extensions: ["naiv4vibe"] }],
      });
      if (!selected) return;

      const filePath = selected as string;
      const fileName = filePath.split("/").pop()?.replace(".naiv4vibe", "") ?? "Vibe";

      await ipc.addVibe({ filePath, name: fileName });
      toast.success(t("vibe.importSuccess"));
      await loadVibes();
      onVibesChanged();
    } catch (e) {
      toastError(String(e));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await ipc.deleteVibe(deleteTarget.id);
      setDeleteTarget(null);
      await loadVibes();
      onVibesChanged();
    } catch (e) {
      toastError(String(e));
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("vibe.manage")}</DialogTitle>
          </DialogHeader>

          <Button variant="outline" size="sm" className="w-full" onClick={handleImport}>
            <Plus className="mr-1 h-3 w-3" />
            {t("vibe.import")}
          </Button>

          <ScrollArea className="h-64">
            <div className="space-y-1 pr-2">
              {vibes.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  {t("vibe.empty")}
                </p>
              ) : (
                vibes.map((vibe) => (
                  <div
                    key={vibe.id}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{vibe.name}</p>
                      <p className="text-[10px] text-muted-foreground">{vibe.model}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 shrink-0"
                      onClick={() => setDeleteTarget(vibe)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t("vibe.deleteConfirm")}
        description={deleteTarget?.name}
      />
    </>
  );
}
