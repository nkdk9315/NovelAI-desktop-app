export default function ActionBar() {
  return (
    <div className="flex items-center justify-center gap-2 border-t border-border p-3">
      {/* TODO: implement Generate, Save, Save All, Delete buttons */}
      <button className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
        Generate
      </button>
    </div>
  );
}
