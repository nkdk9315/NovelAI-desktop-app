import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toastError } from "@/lib/toast-error";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePromptStore } from "@/stores/prompt-store";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import type { PromptGroupDto, TagInput } from "@/types";
import PromptGroupGrid from "./prompt-group/PromptGroupGrid";
import PromptGroupAddModal from "./prompt-group/PromptGroupAddModal";
import PromptGroupEditModal from "./prompt-group/PromptGroupEditModal";
import TagDatabaseModal from "./tag-database/TagDatabaseModal";
import { Button } from "@/components/ui/button";
import { Database } from "lucide-react";

interface PromptGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetId: string;
}

export default function PromptGroupModal({ open, onOpenChange, targetId }: PromptGroupModalProps) {
  const { t } = useTranslation();
  const genres = usePromptStore((s) => s.genres);
  const promptGroups = usePromptStore((s) => s.promptGroups);
  const loadGenres = usePromptStore((s) => s.loadGenres);
  const loadPromptGroups = usePromptStore((s) => s.loadPromptGroups);
  const createPromptGroup = usePromptStore((s) => s.createPromptGroup);
  const updatePromptGroup = usePromptStore((s) => s.updatePromptGroup);
  const deletePromptGroup = usePromptStore((s) => s.deletePromptGroup);
  const addGroupToTarget = useSidebarPromptStore((s) => s.addGroupToTarget);
  const removeGroupFromTarget = useSidebarPromptStore((s) => s.removeGroupFromTarget);
  const target = useSidebarPromptStore((s) => s.targets[targetId]);
  const existingGroupIds = target?.groups.map((g) => g.groupId) ?? [];

  const [searchQuery, setSearchQuery] = useState("");
  const [showSystem, setShowSystem] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PromptGroupDto | null>(null);
  const [showTagDb, setShowTagDb] = useState(false);

  useEffect(() => {
    if (open) {
      loadGenres();
      loadPromptGroups(undefined, searchQuery || undefined);
    }
  }, [open, searchQuery, loadGenres, loadPromptGroups]);

  const handleToggleSidebar = (group: PromptGroupDto) => {
    if (existingGroupIds.includes(group.id)) {
      removeGroupFromTarget(targetId, group.id);
    } else {
      addGroupToTarget(targetId, group);
    }
  };

  const handleAdd = async (data: {
    name: string;
    genreId?: string;
    tags: TagInput[];
    isDefault: boolean;
  }) => {
    try {
      const group = await createPromptGroup({
        name: data.name,
        genreId: data.genreId,
        tags: data.tags,
      });
      if (data.isDefault) {
        await updatePromptGroup({ id: group.id, isDefault: true });
      }
      loadPromptGroups(undefined, searchQuery || undefined);
    } catch (e) {
      toastError(String(e));
    }
  };

  const handleEdit = async (data: {
    id: string;
    name: string;
    genreId?: string | null;
    tags: TagInput[];
    isDefault: boolean;
  }) => {
    try {
      await updatePromptGroup({
        id: data.id,
        name: data.name,
        genreId: data.genreId,
        tags: data.tags,
        isDefault: data.isDefault,
      });
      loadPromptGroups(undefined, searchQuery || undefined);
    } catch (e) {
      toastError(String(e));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePromptGroup(id);
      removeGroupFromTarget(targetId, id);
      loadPromptGroups(undefined, searchQuery || undefined);
    } catch (e) {
      toastError(String(e));
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2">
              <DialogTitle>{t("promptGroup.title")}</DialogTitle>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mr-6"
                onClick={() => setShowTagDb(true)}
              >
                <Database className="h-4 w-4 mr-1" />
                {t("tagDb.openBrowser")}
              </Button>
            </div>
          </DialogHeader>

          <PromptGroupGrid
            genres={genres}
            groups={promptGroups}
            searchQuery={searchQuery}
            showSystem={showSystem}
            existingGroupIds={existingGroupIds}
            targetId={targetId}
            onSearchChange={setSearchQuery}
            onShowSystemChange={setShowSystem}
            onAdd={() => setShowAddModal(true)}
            onToggleSidebar={handleToggleSidebar}
            onEdit={setEditingGroup}
            onDelete={handleDelete}
          />
        </DialogContent>
      </Dialog>

      <PromptGroupAddModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        genres={genres}
        onSave={handleAdd}
      />

      <PromptGroupEditModal
        open={editingGroup !== null}
        onOpenChange={(isOpen) => { if (!isOpen) setEditingGroup(null); }}
        group={editingGroup}
        genres={genres}
        onSave={handleEdit}
        onDelete={handleDelete}
      />

      <TagDatabaseModal open={showTagDb} onOpenChange={setShowTagDb} />
    </>
  );
}
