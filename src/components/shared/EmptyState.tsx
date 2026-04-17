import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon: Icon, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-muted-foreground">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50 ring-1 ring-border/60">
        <Icon size={24} />
      </div>
      <p className="text-sm">{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
