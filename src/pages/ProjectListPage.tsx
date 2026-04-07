import { FolderOpen } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";

export default function ProjectListPage() {
  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-4">
        <span className="text-sm font-medium">
          {/* TODO: app title + settings button */}
          Projects
        </span>
        <button className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground">
          {/* TODO: opens CreateProjectDialog */}
          New Project
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-4xl">
          {/* TODO: project card grid or empty state */}
          <EmptyState
            icon={FolderOpen}
            message="No projects"
            actionLabel="Create a new project"
            onAction={() => {
              /* TODO: open create dialog */
            }}
          />
        </div>
      </div>
    </div>
  );
}
