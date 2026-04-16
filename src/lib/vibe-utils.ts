import type { AssetFolderDto } from "@/types";
import * as ipc from "@/lib/ipc";

/**
 * Walks the full vibe-folder tree and returns every folder (roots + all descendants).
 * Used to resolve descendant folders when the user scopes random generation to parent folders.
 */
export async function loadAllVibeFolders(): Promise<AssetFolderDto[]> {
  try {
    const roots = await ipc.listVibeFolderRoots();
    const collected: AssetFolderDto[] = [...roots];
    let queue = roots.filter((f) => f.childCount > 0);
    while (queue.length > 0) {
      const results = await Promise.all(queue.map((f) => ipc.listVibeFolderChildren(f.id)));
      const nextQueue: AssetFolderDto[] = [];
      for (const children of results) {
        collected.push(...children);
        for (const c of children) {
          if (c.childCount > 0) nextQueue.push(c);
        }
      }
      queue = nextQueue;
    }
    return collected;
  } catch {
    return [];
  }
}
