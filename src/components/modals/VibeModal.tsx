interface VibeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function VibeModal({ open, onOpenChange }: VibeModalProps) {
  return (
    <div>
      {/* TODO: implement vibe import, list, encode section */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-card p-6">
            <p>Vibes</p>
            <button onClick={() => onOpenChange(false)} className="text-sm text-muted-foreground">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
