import { convertFileSrc } from "@tauri-apps/api/core";
import { useProjectStore } from "@/stores/project-store";

/** Asset URL of a project image (relative `images/<id>.png`). */
export function projectImageUrl(filePath: string): string | undefined {
  const dir = useProjectStore.getState().currentProject?.directoryPath;
  return dir ? convertFileSrc(`${dir}/${filePath}`) : undefined;
}
