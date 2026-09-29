import { invoke } from "@tauri-apps/api/core";
import type {
  SpriteCandidateDto, SpriteCandidateMethod, SpriteCellDto, SpriteExportPlan, SpriteExportResultDto, SpriteSetDto,
} from "@/types/sprite";

export function listSpriteSets(projectId: string): Promise<SpriteSetDto[]> {
  return invoke("list_sprite_sets", { projectId });
}
export function createSpriteSet(projectId: string, name: string, spec: unknown): Promise<SpriteSetDto> {
  return invoke("create_sprite_set", { req: { projectId, name, spec } });
}
export function updateSpriteSet(id: string, patch: { name?: string; spec?: unknown }): Promise<SpriteSetDto> {
  return invoke("update_sprite_set", { req: { id, ...patch } });
}
export function deleteSpriteSet(id: string): Promise<void> {
  return invoke("delete_sprite_set", { id });
}
export function listSpriteCells(setId: string): Promise<SpriteCellDto[]> {
  return invoke("list_sprite_cells", { setId });
}
export function addSpriteCandidate(req: {
  setId: string; cellKey: string; imageId: string; parentImageId?: string | null; method: SpriteCandidateMethod;
}): Promise<SpriteCandidateDto> {
  return invoke("add_sprite_candidate", { req });
}
export function importSpriteCandidate(setId: string, cellKey: string, path: string): Promise<SpriteCandidateDto> {
  return invoke("import_sprite_candidate", { req: { setId, cellKey, path } });
}
export function saveSpriteImage(req: {
  setId: string; cellKey: string; imageBase64: string; parentImageId?: string | null;
  method: SpriteCandidateMethod; sourceImageIds?: string[];
}): Promise<SpriteCandidateDto> {
  return invoke("save_sprite_image", { req });
}
export function adoptSpriteCandidate(setId: string, cellKey: string, imageId: string | null): Promise<void> {
  return invoke("adopt_sprite_candidate", { setId, cellKey, imageId });
}
export function removeSpriteCandidate(id: string, deleteImage: boolean): Promise<void> {
  return invoke("remove_sprite_candidate", { id, deleteImage });
}
export function setSpriteCellState(setId: string, cellKey: string, state: { excluded?: boolean; note?: string }): Promise<void> {
  return invoke("set_sprite_cell_state", { req: { setId, cellKey, ...state } });
}
export function deleteSpriteCells(setId: string, cellKeys: string[]): Promise<void> {
  return invoke("delete_sprite_cells", { setId, cellKeys });
}
export function exportSpriteSet(plan: SpriteExportPlan): Promise<SpriteExportResultDto> {
  return invoke("export_sprite_set", { plan });
}
