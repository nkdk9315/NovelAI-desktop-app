import type { PromptPresetDto, PresetFolderDto } from "@/types";

export const UNCATEGORIZED = -1;

export interface FolderTreeNode {
  id: number;
  title: string;
  children: FolderTreeNode[];
  presets: PromptPresetDto[];
}

export function buildTree(
  folders: PresetFolderDto[],
  presets: PromptPresetDto[],
): FolderTreeNode[] {
  const map = new Map<number, FolderTreeNode>();
  for (const f of folders) map.set(f.id, { id: f.id, title: f.title, children: [], presets: [] });
  const roots: FolderTreeNode[] = [];
  for (const f of folders) {
    const node = map.get(f.id)!;
    if (f.parentId != null && map.has(f.parentId)) map.get(f.parentId)!.children.push(node);
    else roots.push(node);
  }
  const uncategorized: PromptPresetDto[] = [];
  for (const p of presets) {
    if (p.folderId != null && map.has(p.folderId)) map.get(p.folderId)!.presets.push(p);
    else uncategorized.push(p);
  }
  if (uncategorized.length > 0 || roots.length === 0) {
    roots.unshift({ id: UNCATEGORIZED, title: "", children: [], presets: uncategorized });
  }
  return roots;
}
