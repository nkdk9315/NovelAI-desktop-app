/**
 * How a sprite cell is made: the pose's base by text-to-image, every other
 * cell by inpainting its parent (one axis lower) inside that axis' regions,
 * or — for a `composite` axis combined with other axes — by pasting that
 * axis' regions from the single-axis cell onto the cell without it.
 */
import { activeAxes, cellKey, isOrphanKey, levelIndex, parseCellKey, withLevel, type CellCoord } from "./cells";
import type { SpriteAxis, SpriteSpec } from "./spec";

export type CellMethod = "txt2img" | "inpaint" | "composite";

export type PlanBlocker =
  | "orphan" | "excluded" | "parentNotAdopted" | "sourceNotAdopted" | "maskMissing" | "noRegion";

export interface CellState {
  adoptedImageId: string | null;
  excluded: boolean;
}

export interface CellPlan {
  key: string;
  coord: CellCoord;
  method: CellMethod;
  /** Cell whose adopted image is the inpaint source / composite background */
  parentKey: string | null;
  /** Axis whose change this cell makes */
  axis: SpriteAxis | null;
  /** Regions to regenerate / paste */
  regionIds: string[];
  /** Composite: regions of the other active axes, removed from the pasted area */
  subtractRegionIds: string[];
  /** Composite: the single-axis cell the pixels come from */
  sourceKey: string | null;
  blockers: PlanBlocker[];
}

export type CellLookup = (key: string) => CellState | undefined;

export interface PlanOptions {
  /** Inpaint even where compositing would work */
  preferInpaint?: boolean;
}

export function hasMask(spec: SpriteSpec, poseId: string, regionId: string): boolean {
  return !!spec.masks[poseId]?.[regionId];
}

export function planCell(spec: SpriteSpec, key: string, lookup: CellLookup, opts: PlanOptions = {}): CellPlan {
  const coord = parseCellKey(key);
  const blockers: PlanBlocker[] = [];
  const plan: CellPlan = {
    key, coord, method: "txt2img", parentKey: null, axis: null,
    regionIds: [], subtractRegionIds: [], sourceKey: null, blockers,
  };
  if (isOrphanKey(spec, key)) {
    blockers.push("orphan");
    return plan;
  }
  if (lookup(key)?.excluded) blockers.push("excluded");
  const active = activeAxes(spec, coord);
  if (active.length === 0) return plan;

  const axis = active[active.length - 1];
  const index = levelIndex(spec, coord, axis);
  const others = active.slice(0, -1);
  plan.axis = axis;
  plan.regionIds = axis.regionIds.filter((r) => spec.regions.some((x) => x.id === r));
  const adopted = (k: string) => !!lookup(k)?.adoptedImageId;

  const otherRegions = [...new Set(others.flatMap((a) => a.regionIds))];
  const sourceKey = cellKey(withLevel(spec, { poseId: coord.poseId, levels: {} }, axis, index));
  const canComposite = axis.composite && others.length > 0 && !opts.preferInpaint
    && !plan.regionIds.some((r) => otherRegions.includes(r));

  if (canComposite) {
    plan.method = "composite";
    plan.parentKey = cellKey(withLevel(spec, coord, axis, 0));
    plan.sourceKey = sourceKey;
    plan.subtractRegionIds = otherRegions;
    if (!adopted(sourceKey)) blockers.push("sourceNotAdopted");
  } else {
    plan.method = "inpaint";
    plan.parentKey = cellKey(withLevel(spec, coord, axis, axis.chain ? index - 1 : 0));
  }
  if (!adopted(plan.parentKey)) blockers.push("parentNotAdopted");
  if (plan.regionIds.length === 0) blockers.push("noRegion");
  else if (plan.regionIds.some((r) => !hasMask(spec, coord.poseId, r))) blockers.push("maskMissing");
  return plan;
}

/** The cells that must exist before `key` (parent / composite source chain), nearest last. */
export function ancestorKeys(spec: SpriteSpec, key: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>([key]);
  const visit = (k: string) => {
    const p = planCell(spec, k, () => undefined);
    for (const dep of [p.sourceKey, p.parentKey]) {
      if (!dep || seen.has(dep)) continue;
      seen.add(dep);
      visit(dep);
      out.push(dep);
    }
  };
  visit(key);
  return out;
}

/** Order keys so every cell comes after the cells it is made from (only those in `keys`). */
export function orderForGeneration(spec: SpriteSpec, keys: string[]): string[] {
  const wanted = new Set(keys);
  const out: string[] = [];
  const done = new Set<string>();
  for (const k of keys) {
    for (const dep of [...ancestorKeys(spec, k), k]) {
      if (wanted.has(dep) && !done.has(dep)) {
        done.add(dep);
        out.push(dep);
      }
    }
  }
  return out;
}


/** The keys plus every ancestor that has no adopted image yet, in generation order. */
export function withMissingAncestors(spec: SpriteSpec, keys: string[], lookup: CellLookup): string[] {
  const all = keys.flatMap((k) => [...ancestorKeys(spec, k).filter((a) => !lookup(a)?.adoptedImageId), k]);
  return orderForGeneration(spec, [...new Set(all)]);
}
