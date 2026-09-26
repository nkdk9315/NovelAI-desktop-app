import { useSidebarArtistTagsStore } from "@/stores/sidebar-artist-tags-store";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import { assembleFullPrompt } from "@/lib/prompt-assembly";
import { isArtistTagOn } from "@/lib/artist-tag";
import { addTagToPrompt, naxTagKey, promptHasTag, removeTagFromPrompt } from "@/lib/nax";
import type { NaxCategory } from "@/types";

const MAIN_TARGET_ID = "main";

function mainPromptOf(state: ReturnType<typeof useSidebarPromptStore.getState>): string {
  const target = state.targets[MAIN_TARGET_ID];
  return target ? (target.promptOverride ?? assembleFullPrompt("", target.groups)) : "";
}

/**
 * One-click "use this tag" for nax.moe images. Artists go to the sidebar's
 * artist tags (so strength/balance work); everything else goes into the
 * main prompt text. Calling `toggle` again takes the tag back out.
 */
export function useNaxPromptActions() {
  const artistTags = useSidebarArtistTagsStore((s) => s.sidebarArtistTags);
  const mainPrompt = useSidebarPromptStore(mainPromptOf);

  const findArtist = (tag: string) => {
    const key = naxTagKey(tag);
    return artistTags.find((t) => naxTagKey(t.name) === key);
  };

  const isAdded = (tag: string, category: NaxCategory): boolean => {
    if (category === "artist") {
      const existing = findArtist(tag);
      return existing != null && isArtistTagOn(existing);
    }
    return promptHasTag(mainPrompt, tag);
  };

  const toggle = (tag: string, category: NaxCategory) => {
    if (category === "artist") {
      const artists = useSidebarArtistTagsStore.getState();
      const key = naxTagKey(tag);
      const existing = artists.sidebarArtistTags.find((t) => naxTagKey(t.name) === key);
      if (!existing) artists.addSidebarArtistTag(tag);
      else if (isArtistTagOn(existing)) artists.removeSidebarArtistTag(existing.name);
      else artists.toggleSidebarArtistTag(existing.name);
      return;
    }
    const prompts = useSidebarPromptStore.getState();
    if (!prompts.targets[MAIN_TARGET_ID]) prompts.initTarget(MAIN_TARGET_ID);
    // Read the live prompt: clicks faster than a re-render must not drop tags.
    const current = mainPromptOf(useSidebarPromptStore.getState());
    const next = promptHasTag(current, tag) ? removeTagFromPrompt(current, tag) : addTagToPrompt(current, tag);
    useSidebarPromptStore.getState().setPromptOverride(MAIN_TARGET_ID, next);
  };

  return { isAdded, toggle };
}
