import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon: Icon, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-muted-foreground">
      <Icon size={48} />
      <p className="text-sm">{message}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="text-sm text-primary hover:underline">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
