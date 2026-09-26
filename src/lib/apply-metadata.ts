import * as ipc from "@/lib/ipc";
import { maxCharactersFor } from "@/lib/constants";
import { loadImage } from "@/lib/canvas-image";
import { promptWithoutArtists, vibeModelKey, type ParsedMetadata } from "@/lib/nai-metadata";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import { useSidebarArtistTagsStore } from "@/stores/sidebar-artist-tags-store";
import { usePromptStore } from "@/stores/prompt-store";
import { useCharRefStore } from "@/stores/char-ref-store";

export type MergeMode = "replace" | "append";

export interface MetadataSelection {
  prompt: boolean;
  negative: boolean;
  /** Artists to import as artist tags (they are taken out of the prompts) */
  artistNames: string[];
  artistMode: MergeMode;
  characters: boolean;
  characterMode: MergeMode;
  vibes: boolean;
  characterReference: boolean;
  settings: boolean;
  seed: boolean;
}

export interface ApplyResult {
  artistTags: number;
  characters: number;
  vibesAdded: number;
  vibesExisting: number;
  /** Unencoded vibe images that were encoded (2 Anlas each) */
  vibesEncoded: number;
}

const MAIN = "main";

export function hasAnySelected(sel: MetadataSelection): boolean {
  return sel.prompt || sel.negative || sel.artistNames.length > 0 || sel.characters
    || sel.vibes || sel.characterReference || sel.settings || sel.seed;
}

function ensureTarget(id: string) {
  const store = useSidebarPromptStore.getState();
  if (!store.targets[id]) store.initTarget(id);
}

async function applyCharacters(meta: ParsedMetadata, mode: MergeMode, artists: ReadonlySet<string>): Promise<number> {
  const params = useGenerationParamsStore.getState();
  const prompts = useSidebarPromptStore.getState();
  if (mode === "replace") {
    for (const c of params.characters) prompts.removeTarget(c.id);
    params.clearCharacters();
  }
  const promptStore = usePromptStore.getState();
  if (promptStore.genres.length === 0) await promptStore.loadGenres();
  const genres = usePromptStore.getState().genres;
  const genre = genres.find((g) => g.id === "genre-other") ?? genres[0];
  const genreInfo = genre
    ? { name: genre.name, id: genre.id, icon: genre.icon, color: genre.color }
    : { name: "Other", id: "genre-other", icon: "user", color: "" };

  let added = 0;
  for (const ch of meta.characters) {
    const state = useGenerationParamsStore.getState();
    if (state.characters.length >= maxCharactersFor(state.model)) break;
    state.addCharacter(genreInfo);
    const chars = useGenerationParamsStore.getState().characters;
    const index = chars.length - 1;
    const id = chars[index].id;
    useGenerationParamsStore.getState().updateCharacter(index, { centerX: ch.centerX, centerY: ch.centerY });
    ensureTarget(id);
    useSidebarPromptStore.getState().setPromptOverride(id, promptWithoutArtists(ch.rawPrompt, artists));
    useSidebarPromptStore.getState().setNegativeOverride(id, ch.negative);
    added++;
  }
  return added;
}

async function applyVibes(meta: ParsedMetadata, projectId: string, baseName: string) {
  const modelKey = vibeModelKey(meta.model);
  const counts = { added: 0, existing: 0, encoded: 0 };
  if (!modelKey || !meta.model) return counts;
  for (const [i, v] of meta.vibes.entries()) {
    const name = meta.vibes.length > 1 ? `${baseName} #${i + 1}` : baseName;
    let vibeId: string;
    if (v.encoded) {
      const res = await ipc.importVibeEncoding({
        name, modelKey, encoding: v.encoding, informationExtracted: v.informationExtracted, strength: v.strength,
      });
      vibeId = res.vibe.id;
      if (res.existed) counts.existing++;
      else counts.added++;
    } else {
      // A raw vibe image: encode it now (costs Anlas like any vibe encode)
      const vibe = await ipc.encodeVibeImage({
        imageBase64: v.encoding, model: meta.model, name, informationExtracted: v.informationExtracted,
      });
      vibeId = vibe.id;
      counts.encoded++;
    }
    await ipc.addVibeToProject(projectId, vibeId).catch(() => {});
    useGenerationParamsStore.getState().addVibe(vibeId);
    useGenerationParamsStore.getState().setSelectedVibes(
      useGenerationParamsStore.getState().selectedVibes.map((s) =>
        s.vibeId === vibeId ? { ...s, strength: v.strength, enabled: true } : s,
      ),
    );
  }
  window.dispatchEvent(new CustomEvent("vibes-changed"));
  return counts;
}

/** Apply the selected parts of an image's metadata to the generation UI. */
export async function applyMetadata(
  meta: ParsedMetadata,
  sel: MetadataSelection,
  projectId: string,
  baseName: string,
): Promise<ApplyResult> {
  const result: ApplyResult = { artistTags: 0, characters: 0, vibesAdded: 0, vibesExisting: 0, vibesEncoded: 0 };
  const params = useGenerationParamsStore.getState();
  const artists = new Set(sel.artistNames);

  // Settings first: switching the model changes what the rest can use (vibes, character count)
  if (sel.settings) {
    if (meta.model) params.setParam("model", meta.model);
    const s = meta.settings;
    if (s.width) params.setParam("width", s.width);
    if (s.height) params.setParam("height", s.height);
    if (s.steps) params.setParam("steps", s.steps);
    if (s.scale !== undefined) params.setParam("scale", s.scale);
    if (s.cfgRescale !== undefined) params.setParam("cfgRescale", s.cfgRescale);
    if (s.sampler) params.setParam("sampler", s.sampler);
    if (s.noiseSchedule) params.setParam("noiseSchedule", s.noiseSchedule);
  }
  if (sel.seed && meta.seed !== null) params.setParam("seed", meta.seed);
  if (sel.prompt) {
    ensureTarget(MAIN);
    useSidebarPromptStore.getState().setPromptOverride(MAIN, promptWithoutArtists(meta.rawPrompt, artists));
    params.setParam("qualityPreset", meta.qualityPreset);
    params.setParam("furryMode", meta.furryMode);
    params.setParam("transparentBackground", meta.transparentBackground);
  }
  if (sel.negative) {
    ensureTarget(MAIN);
    useSidebarPromptStore.getState().setNegativeOverride(MAIN, meta.negative);
    params.setParam("negativePreset", meta.negativePreset);
  }
  if (artists.size > 0) {
    const store = useSidebarArtistTagsStore.getState();
    const picked = meta.artistTags
      .filter((a) => artists.has(a.name))
      .map(({ name, strength }) => ({ name, strength, enabled: true }));
    const pickedNames = new Set(picked.map((a) => a.name));
    // Append keeps the existing tags but switches them off, so only the imported ones are used
    const current = sel.artistMode === "append"
      ? store.sidebarArtistTags.filter((a) => !pickedNames.has(a.name)).map((a) => ({ ...a, enabled: false }))
      : [];
    store.setSidebarArtistTags([...current, ...picked]);
    result.artistTags = picked.length;
  }
  if (sel.characters && meta.characters.length > 0) {
    result.characters = await applyCharacters(meta, sel.characterMode, artists);
  }
  if (sel.characterReference && meta.characterReference) {
    const ref = meta.characterReference;
    const charRef = useCharRefStore.getState();
    charRef.setImage(await loadImage(`data:image/png;base64,${ref.imageBase64}`));
    charRef.setMode(ref.mode);
    charRef.setStrength(ref.strength);
    charRef.setFidelity(ref.fidelity);
  }
  if (sel.vibes && meta.vibes.length > 0) {
    const v = await applyVibes(meta, projectId, baseName);
    result.vibesAdded = v.added;
    result.vibesExisting = v.existing;
    result.vibesEncoded = v.encoded;
  }
  return result;
}
