import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

/** A collapsed block of advanced settings inside a guide step. */
export function Fold({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-border">
      <button type="button" className="flex w-full items-center gap-1 px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
        aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        {title}
      </button>
      {open && children}
    </div>
  );
}
