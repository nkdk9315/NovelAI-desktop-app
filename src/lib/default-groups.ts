import type { PromptGroupDto } from "@/types";
import * as ipc from "@/lib/ipc";

/**
 * Groups to pre-attach when a target of `genreId` is created.
 *
 * Genre defaults for every kind of group (user groups, system category groups
 * and tag-DB groups) live in one table, read via `listDefaultSystemGroupsForGenre`.
 * User groups additionally need their "default genres" switch (`isDefault`) on;
 * system groups only have the genre list.
 */
export async function loadDefaultGroupsForGenre(genreId: string): Promise<PromptGroupDto[]> {
  const [ids, userGroups] = await Promise.all([
    ipc.listDefaultSystemGroupsForGenre(genreId),
    ipc.listPromptGroups(),
  ]);
  const byId = new Map(userGroups.map((g) => [g.id, g]));
  const loaded = await Promise.all(
    ids.map(async (id) => {
      const known = byId.get(id);
      if (known && !known.isSystem) return known.isDefault ? known : null;
      try {
        return known && known.tags.length > 0 ? known : await ipc.hydratePromptGroupById(id);
      } catch {
        return null; // stale id (e.g. deleted tag-DB group)
      }
    }),
  );
  return loaded.filter((g): g is PromptGroupDto => g !== null);
}
