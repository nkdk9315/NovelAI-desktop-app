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
import * as ipc from "@/lib/ipc";
import PromptGroupGrid from "./prompt-group/PromptGroupGrid";
import PromptGroupAddModal from "./prompt-group/PromptGroupAddModal";
import PromptGroupEditModal from "./prompt-group/PromptGroupEditModal";
import SidebarEntryEditModal from "@/components/left-panel/SidebarEntryEditModal";
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
  const [editingEntry, setEditingEntry] = useState<
    { groupId: string; tagId: string; name: string; tag: string } | null
  >(null);
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
    defaultStrength: number;
  }) => {
    try {
      const group = await createPromptGroup({
        name: data.name,
        genreId: data.genreId,
        tags: data.tags,
        defaultStrength: data.defaultStrength,
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
    defaultStrength: number;
  }) => {
    try {
      await updatePromptGroup({
        id: data.id,
        name: data.name,
        genreId: data.genreId,
        tags: data.tags,
        isDefault: data.isDefault,
        defaultStrength: data.defaultStrength,
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

  const handleEditEntry = async (groupId: string, tagId: string) => {
    try {
      const dto = await ipc.getPromptGroup(groupId);
      const tag = dto.tags.find((x) => x.id === tagId);
      if (!tag) return;
      setEditingEntry({ groupId, tagId, name: tag.name || "", tag: tag.tag });
    } catch (e) {
      toastError(String(e));
    }
  };

  const handleSaveEntry = async (name: string, tag: string) => {
    if (!editingEntry) return;
    try {
      const dto = await ipc.getPromptGroup(editingEntry.groupId);
      const tags: TagInput[] = dto.tags.map((t) =>
        t.id === editingEntry.tagId
          ? { name, tag, defaultStrength: t.defaultStrength, thumbnailPath: t.thumbnailPath ?? undefined }
          : { name: t.name || undefined, tag: t.tag, defaultStrength: t.defaultStrength, thumbnailPath: t.thumbnailPath ?? undefined },
      );
      await updatePromptGroup({ id: editingEntry.groupId, tags });
      loadPromptGroups(undefined, searchQuery || undefined);
    } catch (e) {
      toastError(String(e));
    }
  };

  const handleDeleteEntry = async (groupId: string, tagId: string) => {
    try {
      const dto = await ipc.getPromptGroup(groupId);
      const tags: TagInput[] = dto.tags
        .filter((t) => t.id !== tagId)
        .map((t) => ({
          name: t.name || undefined,
          tag: t.tag,
          defaultStrength: t.defaultStrength,
          thumbnailPath: t.thumbnailPath ?? undefined,
        }));
      await updatePromptGroup({ id: groupId, tags });
      loadPromptGroups(undefined, searchQuery || undefined);
    } catch (e) {
      toastError(String(e));
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg left-[8.5rem]! translate-x-0! max-h-[calc(100vh-4rem)] overflow-y-auto">
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
            onEditEntry={handleEditEntry}
            onDeleteEntry={handleDeleteEntry}
          />
        </DialogContent>
      </Dialog>

      <PromptGroupAddModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        genres={genres}
        onSave={handleAdd}
        contentClassName="max-w-md left-[8.5rem]! translate-x-0!"
      />

      <PromptGroupEditModal
        open={editingGroup !== null}
        onOpenChange={(isOpen) => { if (!isOpen) setEditingGroup(null); }}
        group={editingGroup}
        genres={genres}
        onSave={handleEdit}
        onDelete={handleDelete}
        contentClassName="max-w-md left-[8.5rem]! translate-x-0!"
      />

      <SidebarEntryEditModal
        open={editingEntry !== null}
        onOpenChange={(isOpen) => { if (!isOpen) setEditingEntry(null); }}
        initialName={editingEntry?.name ?? ""}
        initialTag={editingEntry?.tag ?? ""}
        onSave={handleSaveEntry}
      />

      <TagDatabaseModal open={showTagDb} onOpenChange={setShowTagDb} />
    </>
  );
}
