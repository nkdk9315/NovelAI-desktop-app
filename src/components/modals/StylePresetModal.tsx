interface StylePresetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function StylePresetModal({ open, onOpenChange }: StylePresetModalProps) {
  return (
    <div>
      {/* TODO: implement style preset list and editor */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-card p-6">
            <p>Style Presets</p>
            <button onClick={() => onOpenChange(false)} className="text-sm text-muted-foreground">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
