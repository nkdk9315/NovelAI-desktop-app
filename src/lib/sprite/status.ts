/** Cell status helpers over the loaded cells (for the matrix and the cell panel). */
import type { SpriteCellDto } from "@/types/sprite";
import { isStale, planCell } from "./plan";
import type { SpriteSpec } from "./spec";

type Cells = Record<string, SpriteCellDto>;

const lookupOf = (cells: Cells) => (k: string) => {
  const c = cells[k];
  return c ? { adoptedImageId: c.adoptedImageId, excluded: c.excluded } : undefined;
};

export function cellIsStale(spec: SpriteSpec, key: string, cells: Cells): boolean {
  const cell = cells[key];
  if (!cell?.adoptedImageId) return false;
  const plan = planCell(spec, key, lookupOf(cells));
  const adopted = cell.candidates.find((c) => c.imageId === cell.adoptedImageId);
  return isStale(plan, adopted, plan.parentKey ? cells[plan.parentKey]?.adoptedImageId : null);
}

export function staleKeys(spec: SpriteSpec, cells: Cells): string[] {
  return Object.keys(cells).filter((k) => cellIsStale(spec, k, cells));
}
