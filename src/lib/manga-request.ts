import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import { useSidebarPresetGroupStore } from "@/stores/sidebar-preset-group-store";
import { usePresetStore } from "@/stores/preset-store";
import { useBubbleStyleStore } from "@/stores/bubble-style-store";
import { useMangaStore } from "@/stores/manga-store";
import { outfitTexts, targetText, type PromptText } from "@/lib/character-look";
import { panelTargetIds } from "@/lib/manga-page";
import { appendContributions, getPresetContributionsForCharacter } from "@/lib/preset-contributions";
import { composeMangaPage, type ComposedMangaPage, type MangaCharacterInput } from "@/lib/manga-compose";

/** Whether the open project's page is in manga mode. */
export function mangaModeOn(): boolean {
  return useMangaStore.getState().page.enabled;
}

/**
 * The manga page composed from the current state. The character cards give
 * each character's look; `roll` draws random groups for a real generation
 * (previews and token counts show the text as typed).
 */
export function composeCurrentMangaPage(userMain: string, roll: boolean): ComposedMangaPage {
  const { characters } = useGenerationParamsStore.getState();
  const { targets } = useSidebarPromptStore.getState();
  const page = useMangaStore.getState().page;
  const instances = useSidebarPresetGroupStore.getState().instances;
  const presets = usePresetStore.getState().presets;
  const inputs: MangaCharacterInput[] = characters.map((c) => {
    const own = targetText(targets[c.id], roll) ?? { positive: c.prompt, negative: c.negativePrompt };
    const contrib = getPresetContributionsForCharacter(c.id, instances, presets);
    return {
      id: c.id,
      genreId: c.genreId,
      prompt: appendContributions(own.positive, contrib.positive),
      negativePrompt: appendContributions(own.negative, contrib.negative),
      outfits: outfitTexts(c, targets, roll).map((o) => ({ id: o.id, prompt: o.positive, negativePrompt: o.negative })),
      outfitId: c.outfitId ?? null,
    };
  });
  // Scene and appearance texts (their own prompt targets, tag groups included)
  const texts: Record<string, PromptText> = {};
  for (const id of panelTargetIds(page.panels)) {
    const t = targetText(targets[id], roll);
    if (t) texts[id] = t;
  }
  return composeMangaPage(page, userMain, inputs, useBubbleStyleStore.getState().customBubbleStyles, texts);
}
