import type { ComponentProps, ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  label: ReactNode;
  side?: ComponentProps<typeof TooltipContent>["side"];
  /** A single focusable element (usually an icon-only button). */
  children: ReactNode;
}

/**
 * Hover label for icon-only buttons. The native `title` attribute does not
 * show reliably in the app's WebView, so icon buttons use this instead.
 */
export default function IconTooltip({ label, side = "bottom", children }: Props) {
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} sideOffset={4}>{label}</TooltipContent>
    </Tooltip>
  );
}
