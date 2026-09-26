/** Kind of operation that produced a history image, read from its prompt snapshot. */
export type HistoryActionKind = "generate" | "img2img" | "infill" | "augment" | "upscale";

export interface HistoryAction {
  kind: HistoryActionKind;
  /** augment tool id (bg-removal, lineart, ...) */
  tool?: string;
}

export function historyActionOf(snapshot: Record<string, unknown> | null | undefined): HistoryAction {
  const action = snapshot?.action as { type?: unknown; tool?: unknown } | undefined;
  const type = typeof action?.type === "string" ? action.type : "generate";
  switch (type) {
    case "img2img":
    case "infill":
    case "upscale":
      return { kind: type };
    case "augment":
      return { kind: "augment", tool: typeof action?.tool === "string" ? action.tool : undefined };
    default:
      return { kind: "generate" };
  }
}

/** Tool outputs carry no prompt, so there is nothing to restore. */
export function isToolOutput(snapshot: Record<string, unknown> | null | undefined): boolean {
  const kind = historyActionOf(snapshot).kind;
  return kind === "augment" || kind === "upscale";
}
