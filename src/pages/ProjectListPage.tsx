import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FolderOpen, Settings, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/shared/EmptyState";
import CreateProjectDialog from "@/components/modals/CreateProjectDialog";
import DeleteConfirmDialog from "@/components/modals/DeleteConfirmDialog";
import SettingsDialog from "@/components/modals/SettingsDialog";
import ThemeToggle from "@/components/header/ThemeToggle";
import { useProjectStore } from "@/stores/project-store";
import { useSettingsStore } from "@/stores/settings-store";

export default function ProjectListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projects, isLoading, loadProjects, openProject, deleteProject } = useProjectStore();
  const { loadSettings } = useSettingsStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
    loadSettings();
  }, [loadProjects, loadSettings]);

  const handleOpen = async (id: string) => {
    try {
      await openProject(id);
      navigate(`/project/${id}`);
    } catch (e) {
      toast.error(String(e));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProject(deleteTarget);
    } catch (e) {
      toast.error(String(e));
    }
    setDeleteTarget(null);
  };

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-4">
        <span className="text-sm font-medium">{t("project.title")}</span>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            {t("project.newProject")}
          </Button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
            aria-label={t("common.settings")}
          >
            <Settings size={16} />
          </button>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-4xl">
          {isLoading ? (
            <p className="text-center text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : projects.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              message={t("project.emptyState")}
              actionLabel={t("project.emptyStateAction")}
              onAction={() => setCreateOpen(true)}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <Card
                  key={p.id}
                  className="cursor-pointer transition-colors hover:bg-accent/50"
                  onClick={() => handleOpen(p.id)}
                >
                  <CardHeader className="relative">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="truncate text-base">{p.name}</CardTitle>
                        <CardDescription className="mt-1 text-xs">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {p.projectType}
                        </Badge>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(p.id);
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label={t("common.delete")}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
