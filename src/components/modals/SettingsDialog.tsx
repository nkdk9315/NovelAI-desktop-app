interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  return (
    <div>
      {/* TODO: implement settings dialog with API key, defaults, theme, language */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-card p-6">
            <p>Settings</p>
            <button onClick={() => onOpenChange(false)} className="text-sm text-muted-foreground">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
