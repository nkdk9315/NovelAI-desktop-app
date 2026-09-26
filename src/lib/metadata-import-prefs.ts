import * as ipc from "@/lib/ipc";
import { vibeModelKey, type ParsedMetadata } from "@/lib/nai-metadata";
import type { MergeMode, MetadataSelection } from "@/lib/apply-metadata";

/** What the user ticked last time in the metadata import (remembered across drops). */
export interface MetadataImportPrefs {
  prompt: boolean;
  negative: boolean;
  artists: boolean;
  artistMode: MergeMode;
  characters: boolean;
  characterMode: MergeMode;
  vibes: boolean;
  characterReference: boolean;
  settings: boolean;
  seed: boolean;
  /** Also import when an "use as image" action is picked */
  withImage: boolean;
}

export const DEFAULT_PREFS: MetadataImportPrefs = {
  prompt: true,
  negative: true,
  artists: true,
  artistMode: "append",
  characters: true,
  characterMode: "replace",
  vibes: true,
  characterReference: true,
  settings: false,
  seed: false,
  withImage: false,
};

const KEY = "metadata_import_prefs";
const MODES: MergeMode[] = ["replace", "append"];

/** Merge stored prefs over the defaults, ignoring anything malformed. */
export function parsePrefs(raw: string | undefined): MetadataImportPrefs {
  if (!raw) return DEFAULT_PREFS;
  try {
    const stored = JSON.parse(raw) as Record<string, unknown>;
    const out = { ...DEFAULT_PREFS };
    for (const k of Object.keys(DEFAULT_PREFS) as Array<keyof MetadataImportPrefs>) {
      const v = stored[k];
      if (k === "artistMode" || k === "characterMode") {
        if (MODES.includes(v as MergeMode)) out[k] = v as MergeMode;
      } else if (typeof v === "boolean") {
        out[k] = v;
      }
    }
    return out;
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function loadPrefs(): Promise<MetadataImportPrefs> {
  try {
    return parsePrefs((await ipc.getSettings())[KEY]);
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: MetadataImportPrefs): void {
  ipc.setSetting(KEY, JSON.stringify(prefs)).catch(() => {});
}

/** The checklist for an image, from the remembered prefs (only what the image has). */
export function selectionFromPrefs(meta: ParsedMetadata, p: MetadataImportPrefs): MetadataSelection {
  return {
    prompt: p.prompt,
    negative: p.negative,
    artistNames: p.artists ? meta.artistTags.map((a) => a.name) : [],
    artistMode: p.artistMode,
    characters: p.characters,
    characterMode: p.characterMode,
    vibes: p.vibes && vibeModelKey(meta.model) !== null,
    characterReference: p.characterReference,
    settings: p.settings,
    seed: p.seed,
  };
}

/** Prefs to remember after the user changed the checklist. */
export function prefsFromSelection(
  meta: ParsedMetadata,
  sel: MetadataSelection,
  prev: MetadataImportPrefs,
  withImage: boolean,
): MetadataImportPrefs {
  // Rows the image does not have keep their previous value
  const keep = <K extends keyof MetadataImportPrefs>(k: K, present: boolean, v: MetadataImportPrefs[K]) => (present ? v : prev[k]);
  return {
    prompt: keep("prompt", meta.rawPrompt !== "", sel.prompt),
    negative: keep("negative", meta.negative !== "" || meta.negativePreset !== "none", sel.negative),
    artists: keep("artists", meta.artistTags.length > 0, sel.artistNames.length > 0),
    artistMode: sel.artistMode,
    characters: keep("characters", meta.characters.length > 0, sel.characters),
    characterMode: sel.characterMode,
    vibes: keep("vibes", meta.vibes.length > 0 && vibeModelKey(meta.model) !== null, sel.vibes),
    characterReference: keep("characterReference", meta.characterReference !== null, sel.characterReference),
    settings: sel.settings,
    seed: keep("seed", meta.seed !== null, sel.seed),
    withImage,
  };
}
