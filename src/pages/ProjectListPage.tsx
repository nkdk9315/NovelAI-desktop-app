import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FolderOpen, Image, Pencil, Search, Settings, Trash2 } from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { toastError } from "@/lib/toast-error";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import EmptyState from "@/components/shared/EmptyState";
import CreateProjectDialog from "@/components/modals/CreateProjectDialog";
import EditProjectDialog from "@/components/modals/EditProjectDialog";
import DeleteConfirmDialog from "@/components/modals/DeleteConfirmDialog";
import SettingsDialog from "@/components/modals/SettingsDialog";
import ThemeToggle from "@/components/header/ThemeToggle";
import type { ProjectDto } from "@/types";
import { useProjectStore } from "@/stores/project-store";
import { useSettingsStore } from "@/stores/settings-store";

const ALL_TYPES = "__all__";

export default function ProjectListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projects, isLoading, loadProjects, openProject, deleteProject } =
    useProjectStore();
  const { loadSettings } = useSettingsStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<ProjectDto | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [typeFilter, setTypeFilter] = useState(ALL_TYPES);
  const debouncedSearch = useDebounce(searchInput, 300);

  const reload = useCallback(() => {
    const search = debouncedSearch.trim() || undefined;
    const projectType =
      typeFilter === ALL_TYPES ? undefined : typeFilter;
    loadProjects(search, projectType);
  }, [debouncedSearch, typeFilter, loadProjects]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleOpen = async (id: string) => {
    try {
      await openProject(id);
      navigate(`/project/${id}`);
    } catch (e) {
      toastError(String(e));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProject(deleteTarget);
    } catch (e) {
      toastError(String(e));
    }
    setDeleteTarget(null);
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
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

      {/* Search & Filter bar */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 py-2">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("project.search")}
            className="h-8 pl-8 text-sm"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue placeholder={t("project.filterByType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_TYPES}>{t("project.allTypes")}</SelectItem>
            <SelectItem value="simple">Simple</SelectItem>
            <SelectItem value="manga">Manga</SelectItem>
            <SelectItem value="cg">CG</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Project grid */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-5xl">
          {isLoading ? (
            <p className="text-center text-sm text-muted-foreground">
              {t("common.loading")}
            </p>
          ) : projects.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              message={t("project.emptyState")}
              actionLabel={t("project.emptyStateAction")}
              onAction={() => setCreateOpen(true)}
            />
          ) : (
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {projects.map((p) => (
                <Card
                  key={p.id}
                  className="group cursor-pointer overflow-hidden transition-colors hover:bg-accent/50"
                  onClick={() => handleOpen(p.id)}
                >
                  {/* Thumbnail area */}
                  <div className="relative aspect-square w-full bg-muted">
                    {p.thumbnailPath ? (
                      <img
                        src={convertFileSrc(p.thumbnailPath)}
                        alt={p.name}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                        <Image size={32} />
                      </div>
                    )}
                    {/* Action buttons overlay */}
                    <div className="absolute right-1.5 top-1.5 hidden flex-col gap-1 group-hover:flex">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditTarget(p);
                        }}
                        className="inline-flex items-center justify-center rounded-md bg-background/80 p-1 text-muted-foreground backdrop-blur-sm hover:bg-accent hover:text-foreground"
                        aria-label={t("common.edit")}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(p.id);
                        }}
                        className="inline-flex items-center justify-center rounded-md bg-background/80 p-1 text-muted-foreground backdrop-blur-sm hover:bg-destructive/10 hover:text-destructive"
                        aria-label={t("common.delete")}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {/* Info */}
                  <div className="flex items-start justify-between gap-1.5 p-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {p.projectType}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={reload}
      />
      <EditProjectDialog
        open={editTarget !== null}
        onOpenChange={(open) => !open && setEditTarget(null)}
        project={editTarget}
        onUpdated={reload}
      />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
