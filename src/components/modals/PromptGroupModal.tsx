interface PromptGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PromptGroupModal({ open, onOpenChange }: PromptGroupModalProps) {
  return (
    <div>
      {/* TODO: implement prompt group management with genre tabs, group list, editor */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-card p-6">
            <p>Prompt Groups</p>
            <button onClick={() => onOpenChange(false)} className="text-sm text-muted-foreground">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
