import { Eraser, ImageUp, MessageSquare, Palette, PenLine, Pencil, Scissors, Smile, type LucideIcon } from "lucide-react";
import type { AugmentTool } from "@/types";

export type DirectorTool = AugmentTool | "upscale";

export interface ToolDef {
  id: DirectorTool;
  icon: LucideIcon;
  /** colorize / emotion take a prompt and a defry level */
  hasOptions: boolean;
}

/** Order shown in the Director Tools dialog. */
export const TOOL_DEFS: ToolDef[] = [
  { id: "bg-removal", icon: Scissors, hasOptions: false },
  { id: "lineart", icon: PenLine, hasOptions: false },
  { id: "sketch", icon: Pencil, hasOptions: false },
  { id: "colorize", icon: Palette, hasOptions: true },
  { id: "emotion", icon: Smile, hasOptions: true },
  { id: "declutter", icon: Eraser, hasOptions: false },
  { id: "declutter-keep-bubbles", icon: MessageSquare, hasOptions: false },
  { id: "upscale", icon: ImageUp, hasOptions: false },
];

/** i18n key segment for a tool id (keys cannot contain "-"). */
export function toolKey(id: DirectorTool): string {
  return id.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}
