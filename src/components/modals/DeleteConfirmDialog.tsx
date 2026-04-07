interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
}

export default function DeleteConfirmDialog({ open, onOpenChange, onConfirm, title, description }: DeleteConfirmDialogProps) {
  return (
    <div>
      {/* TODO: implement with AlertDialog */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-card p-6">
            <p className="font-medium">{title ?? "Confirm Delete"}</p>
            <p className="text-sm text-muted-foreground">{description ?? "Are you sure?"}</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => onOpenChange(false)} className="text-sm">Cancel</button>
              <button onClick={onConfirm} className="text-sm text-destructive">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
