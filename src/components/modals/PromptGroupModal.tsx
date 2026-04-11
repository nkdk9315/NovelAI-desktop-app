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
import type { PromptGroupDto, TagInput } from "@/types";
import PromptGroupGrid from "./prompt-group/PromptGroupGrid";
import PromptGroupAddModal from "./prompt-group/PromptGroupAddModal";
import PromptGroupEditModal from "./prompt-group/PromptGroupEditModal";

interface PromptGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PromptGroupModal({ open, onOpenChange }: PromptGroupModalProps) {
  const { t } = useTranslation();
  const genres = usePromptStore((s) => s.genres);
  const promptGroups = usePromptStore((s) => s.promptGroups);
  const loadGenres = usePromptStore((s) => s.loadGenres);
  const loadPromptGroups = usePromptStore((s) => s.loadPromptGroups);
  const createPromptGroup = usePromptStore((s) => s.createPromptGroup);
  const updatePromptGroup = usePromptStore((s) => s.updatePromptGroup);
  const deletePromptGroup = usePromptStore((s) => s.deletePromptGroup);

  const [selectedGenreId, setSelectedGenreId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSystem, setShowSystem] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PromptGroupDto | null>(null);

  useEffect(() => {
    if (open) {
      loadGenres();
      loadPromptGroups(selectedGenreId, searchQuery || undefined);
    }
  }, [open, selectedGenreId, searchQuery, loadGenres, loadPromptGroups]);

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
      loadPromptGroups(selectedGenreId, searchQuery || undefined);
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
      loadPromptGroups(selectedGenreId, searchQuery || undefined);
    } catch (e) {
      toastError(String(e));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePromptGroup(id);
      loadPromptGroups(selectedGenreId, searchQuery || undefined);
    } catch (e) {
      toastError(String(e));
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("promptGroup.title")}</DialogTitle>
          </DialogHeader>

          <PromptGroupGrid
            genres={genres}
            groups={promptGroups}
            selectedGenreId={selectedGenreId}
            searchQuery={searchQuery}
            showSystem={showSystem}
            onGenreChange={setSelectedGenreId}
            onSearchChange={setSearchQuery}
            onShowSystemChange={setShowSystem}
            onAdd={() => setShowAddModal(true)}
            onEdit={setEditingGroup}
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
    </>
  );
}
