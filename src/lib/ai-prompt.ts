import * as ipc from "@/lib/ipc";
import type { TagInput } from "@/types";
import type { AiPromptDetail, AiPromptItemDto, AiPromptOptions, AiPromptStyle } from "@/types/ai";

/** Pseudo provider: build the request text, let the user paste it into any AI */
export const COPY_PASTE_ID = "copy-paste";
export const MAX_AI_ITEMS = 40;

/** Form choices remembered between uses (the theme itself is not stored). */
export interface AiPromptPrefs extends Omit<AiPromptOptions, "theme" | "characters"> {
  providerId: string;
}

export const DEFAULT_PREFS: AiPromptPrefs = {
  providerId: COPY_PASTE_ID,
  count: 10,
  style: "tags",
  detail: "standard",
  adult: false,
  includeAppearance: false,
  includeOutfit: true,
};

const KEY = "ai_prompt_prefs";
const STYLES: AiPromptStyle[] = ["tags", "natural", "hybrid"];
const DETAILS: AiPromptDetail[] = ["short", "standard", "detailed"];

export function clampCount(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_PREFS.count;
  return Math.min(MAX_AI_ITEMS, Math.max(1, Math.round(n)));
}

/** Merge stored prefs over the defaults, ignoring anything malformed. */
export function parsePrefs(raw: string | undefined): AiPromptPrefs {
  if (!raw) return DEFAULT_PREFS;
  try {
    const s = JSON.parse(raw) as Record<string, unknown>;
    const out = { ...DEFAULT_PREFS };
    if (typeof s.providerId === "string" && s.providerId) out.providerId = s.providerId;
    if (typeof s.count === "number") out.count = clampCount(s.count);
    if (STYLES.includes(s.style as AiPromptStyle)) out.style = s.style as AiPromptStyle;
    if (DETAILS.includes(s.detail as AiPromptDetail)) out.detail = s.detail as AiPromptDetail;
    for (const k of ["adult", "includeAppearance", "includeOutfit"] as const) {
      if (typeof s[k] === "boolean") out[k] = s[k];
    }
    return out;
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function loadPrefs(): Promise<AiPromptPrefs> {
  try {
    return parsePrefs((await ipc.getSettings())[KEY]);
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: AiPromptPrefs): void {
  ipc.setSetting(KEY, JSON.stringify(prefs)).catch(() => {});
}

/** One prompt string for an item: tags first, then the prose. */
export function composePrompt(item: Pick<AiPromptItemDto, "tags" | "text">): string {
  return [item.tags.join(", "), item.text.trim()].filter(Boolean).join(", ");
}

/** A result row as edited in the preview. */
export interface AiPromptRow {
  key: string;
  name: string;
  prompt: string;
  checked: boolean;
  unknownTags: string[];
  removedTags: string[];
}

export function toRows(items: AiPromptItemDto[]): AiPromptRow[] {
  return items.map((item, i) => ({
    key: `${i}-${item.name}`,
    name: item.name,
    prompt: composePrompt(item),
    checked: true,
    unknownTags: item.unknownTags,
    removedTags: item.removedTags,
  }));
}

/** Checked, non-empty rows as prompt group entries. */
export function rowsToTagInputs(rows: AiPromptRow[]): TagInput[] {
  return rows
    .filter((r) => r.checked && r.prompt.trim())
    .map((r) => ({ name: r.name.trim() || undefined, tag: r.prompt.trim(), defaultStrength: 0 }));
}
