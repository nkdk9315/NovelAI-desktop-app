import { Pencil, Trash2, Users } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { PromptPresetDto } from "@/types";

interface Props {
  preset: PromptPresetDto;
  disabled: boolean;
  onApply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  editLabel: string;
  deleteLabel: string;
}

export default function SortablePresetChip({
  preset, disabled, onApply, onEdit, onDelete, editLabel, deleteLabel,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: preset.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    touchAction: "none",
  };
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          type="button"
          ref={setNodeRef}
          style={style}
          className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[11px] hover:bg-accent/50 transition-colors max-w-[10rem] cursor-grab active:cursor-grabbing"
          onClick={() => { if (!disabled) onApply(); }}
          title={preset.name}
          {...attributes}
          {...listeners}
        >
          <Users className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
          <span className="truncate font-medium">{preset.name}</span>
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-[7rem] p-0.5 text-[11px]">
        <ContextMenuItem className="text-[11px] py-1 px-2" onClick={onEdit}>
          <Pencil className="h-3 w-3 mr-1.5" />{editLabel}
        </ContextMenuItem>
        <ContextMenuItem className="text-[11px] py-1 px-2 text-destructive" onClick={onDelete}>
          <Trash2 className="h-3 w-3 mr-1.5" />{deleteLabel}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
