import type { ComponentProps, ReactNode } from "react";
import { CircleHelp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Side = ComponentProps<typeof TooltipContent>["side"];

/**
 * Explanation shown on hover / focus. The native `title` attribute does not
 * show reliably in the app's WebView, so the sprite screens use this instead.
 * `children` must be a single element that can hold a ref (button, label, span…).
 */
export function Tip({ text, side = "bottom", children }: { text: ReactNode; side?: Side; children: ReactNode }) {
  if (!text) return <>{children}</>;
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} sideOffset={4} className="max-w-xs text-left text-[11px] leading-relaxed text-pretty">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

/** A small "?" that explains the control next to it. */
export function HelpDot({ text, side = "top" }: { text: ReactNode; side?: Side }) {
  return (
    <Tip text={text} side={side}>
      <button
        type="button"
        tabIndex={0}
        aria-label={typeof text === "string" ? text : undefined}
        className="inline-flex shrink-0 items-center text-muted-foreground/70 hover:text-foreground focus-visible:text-foreground"
        onClick={(e) => e.preventDefault()}
      >
        <CircleHelp className="h-3.5 w-3.5" />
      </button>
    </Tip>
  );
}
