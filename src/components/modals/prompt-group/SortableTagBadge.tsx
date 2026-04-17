import { X } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";

interface SortableTagBadgeProps {
  id: string;
  label: string;
  onOpenEdit: () => void;
  onRemove: (e: React.MouseEvent) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void;
}

export default function SortableTagBadge({
  id, label, onOpenEdit, onRemove, onKeyDown,
}: SortableTagBadgeProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    touchAction: "none",
  };
  return (
    <Badge
      ref={setNodeRef}
      style={style}
      variant="secondary"
      className="cursor-grab active:cursor-grabbing text-xs hover:bg-accent gap-1 pr-1 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
      onClick={onOpenEdit}
      {...attributes}
      {...listeners}
      onKeyDown={(e) => {
        listeners?.onKeyDown?.(e);
        if (!e.defaultPrevented) onKeyDown(e);
      }}
    >
      {label}
      <button
        type="button"
        tabIndex={-1}
        className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onRemove}
      >
        <X className="h-2.5 w-2.5 text-muted-foreground" />
      </button>
    </Badge>
  );
}
